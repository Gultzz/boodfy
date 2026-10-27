import type { Chapter, QuizQuestion } from '@/types';
import type { PageText } from './pdf-text';

/** Muda quando o algoritmo muda: quizzes antigos são regerados */
export const QUIZ_GENERATOR_VERSION = 3;
export const QUESTIONS_PER_QUIZ = 6;
export const MIN_QUIZ_QUESTIONS = 3;

export class QuizGenerationError extends Error {
  constructor(
    message: string,
    readonly reason: 'no-text' | 'too-few' = 'too-few',
  ) {
    super(message);
    this.name = 'QuizGenerationError';
  }
}

const STOPWORDS = new Set(
  `a à às ao aos aquela aquelas aquele aqueles aquilo as até com como da das de dela delas
  dele deles depois do dos e é ela elas ele eles em entre era eram essa essas esse esses esta
  estas este estes eu foi for foram há isso isto já lhe lhes mais mas me mesmo meu meus minha
  minhas muito muita muitas muitos na não nas nem nenhum nenhuma no nos nós nossa nossas nosso
  nossos num numa o os ou para pela pelas pelo pelos por qual quando que quem se sem seu seus
  só sua suas também te tem têm tenho ter teu teus tu tua tuas um uma umas uns você vocês vos
  ainda apenas aqui assim bem cada coisa coisas conforme contra durante então estava estavam
  forma formas fato fatos caso casos modo modos parte partes exemplo exemplos tipo tipos algo
  alguém ninguém tudo nada sempre nunca jamais quase talvez hoje ontem amanhã agora ali lá vez
  vezes sobre sob após antes desde perante segundo toda todas todo todos outro outra outros
  outras tanto tanta tantos tantas algum alguma alguns algumas vários várias poucos poucas
  livro livros autor autores texto textos página páginas capítulo capítulos obra obras leitor
  leitores título títulos conteúdo seção seções assim sendo visto pode podem poder deve devem
  fazer faz fez ser sendo sido estar estado está estão estava estavam havia haver tem tinha
  tinham teria podem poderá poderão dentro fora grande grandes pequeno pequena pequenos pequenas
  primeiro primeira segundo segunda terceiro terceira novo nova novos novas
  the and of to in a is that it for on with as was at by an be this which or from but not are
  have has had they you we he she his her their our its can will would should could there these
  those than then so if when where what who how all any some more most other such into about
  between over under also only up out no do does did been being may might must very each both
  few many much own same just because while during before after above below again further once
  here why having through against off down than too s t don now`
    .split(/\s+/)
    .filter(Boolean),
);

const ABBREVIATIONS = new Set([
  'dr',
  'dra',
  'sr',
  'sra',
  'prof',
  'profa',
  'etc',
  'ex',
  'p',
  'pp',
  'fig',
  'figs',
  'vol',
  'cap',
  'ed',
  'nº',
  'no',
  'art',
  'cf',
  'apud',
  'vs',
  'st',
  'sta',
  'ltda',
  'cel',
  'gen',
  'col',
  'av',
]);

const DEFINITION_RE =
  /^(.{4,65}?)\s+(é|são|significa|consiste em|corresponde a|refere-se a|trata-se de|pode ser definido como|designa|caracteriza-se por|funciona como|atua como|representa)\s+(.{20,190})$/i;

const CAUSE_EFFECT_RE =
  /\b(porque|devido a|por causa de|já que|visto que|uma vez que|resultando em|com o objetivo de|para que|portanto|por essa razão)\b/i;

const WORD_RE = /[\p{L}][\p{L}'’-]*/gu;
const VERB_ENDING_RE = /(?:am|em|ou|aram|eram|iram|ando|endo|indo)$/i;
const VERB_FORMS = new Set(
  `consome consomem converte convertem possui possuem ocorre ocorrem aumenta aumentam diminui
  diminuem libera liberam transporta transportam produz produzem captura capturam depende dependem
  recebe recebem inicia iniciam recicla reciclam controla controlam fornece fornecem serve servem
  atinge atingem influencia influenciam movimenta movimentam conecta conectam reduz reduzem estuda
  estudam alimenta alimentam utiliza utilizam armazena armazenam devolve devolvem troca trocam
  precisa precisam acontece acontecem representa representam inclui incluem permite permitem
  explica explicam indica indicam mostra mostram define definem constitui constituem`
    .split(/\s+/)
    .filter(Boolean),
);
const CAPITALIZED_PHRASE_RE =
  /\b[A-ZÀ-ÖØ-Þ][\p{Ll}'’-]+(?:\s+(?:de|da|do|das|dos|e)\s+[A-ZÀ-ÖØ-Þ][\p{Ll}'’-]+|\s+[A-ZÀ-ÖØ-Þ][\p{Ll}'’-]+){1,2}\b/gu;

interface Term {
  text: string;
  key: string;
  count: number;
  score: number;
}

interface SentenceCandidate {
  sentence: string;
  page: number;
  key: string;
}

interface DefinitionCandidate {
  subject: string;
  object: string;
  sentence: string;
  page: number;
}

export function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const a = result[i] as T;
    const b = result[j] as T;
    result[i] = b;
    result[j] = a;
  }
  return result;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsTerm(text: string, term: string): boolean {
  try {
    return new RegExp(`(?<![\\p{L}])${escapeRegExp(term)}(?![\\p{L}])`, 'iu').test(text);
  } catch {
    return text.toLowerCase().includes(term.toLowerCase());
  }
}

function isStopword(word: string): boolean {
  const key = word.toLowerCase();
  if (STOPWORDS.has(key)) return true;
  return key.endsWith('mente') && key.length > 10;
}

function normalizeKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function hasDiacritics(value: string): boolean {
  return value.normalize('NFD') !== value;
}

function isLikelyVerb(word: string): boolean {
  const key = normalizeKey(word);
  if (key.length < 5) return false;
  return VERB_FORMS.has(key) || VERB_ENDING_RE.test(key);
}

function collectTerms(pages: PageText[]): Map<string, Term> {
  const terms = new Map<string, Term>();
  const fullText = pages.map((p) => p.text).join(' ');

  for (const match of fullText.matchAll(WORD_RE)) {
    const text = match[0];
    if (text.length < 5 || isStopword(text)) continue;
    const key = normalizeKey(text);
    const existing = terms.get(key);
    if (existing) {
      existing.count += 1;
      if (!hasDiacritics(existing.text) && hasDiacritics(text)) existing.text = text;
    } else {
      terms.set(key, { text, key, count: 1, score: 0 });
    }
  }

  for (const match of fullText.matchAll(CAPITALIZED_PHRASE_RE)) {
    const phrase = match[0].replace(/\s+/g, ' ').trim();
    if (phrase.length < 8 || phrase.split(/\s+/).length < 2) continue;
    const key = normalizeKey(phrase);
    if (isStopword(phrase)) continue;
    const existing = terms.get(key);
    if (existing) {
      existing.count += 1;
      existing.text = phrase;
    } else {
      terms.set(key, { text: phrase, key, count: 1, score: 0 });
    }
  }

  for (const term of terms.values()) {
    const lengthBonus = Math.min(term.text.length, 16) * 0.35;
    const frequencyBonus = Math.min(term.count, 8) * 1.8;
    const phraseBonus = term.text.includes(' ') ? 1.5 : 0;
    term.score = frequencyBonus + lengthBonus + phraseBonus;
  }

  return new Map(
    Array.from(terms.entries()).filter(([, term]) => term.count >= 2 || term.text.includes(' ')),
  );
}

function splitSentences(text: string): string[] {
  const parts = text.split(/(?<=[.!?…])\s+(?=[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ0-9"“(])/u);
  const merged: string[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const previous = merged[merged.length - 1];
    if (previous) {
      const lastWord = (previous.replace(/[.!?…]+$/, '').split(/\s+/).pop() ?? '').toLowerCase();
      const startsLowercase = /^[a-zà-öø-ÿ]/.test(trimmed);
      if (ABBREVIATIONS.has(lastWord) || startsLowercase) {
        merged[merged.length - 1] = `${previous} ${trimmed}`;
        continue;
      }
    }
    merged.push(trimmed);
  }

  return merged;
}

function isUsableSentence(sentence: string): boolean {
  const length = sentence.length;
  if (length < 60 || length > 320) return false;

  const words = sentence.split(/\s+/).filter(Boolean);
  if (words.length < 9 || words.length > 48) return false;
  if (/[?]$/.test(sentence)) return false;
  if (/^(figura|tabela|quadro|gráfico|imagem|fonte:)/i.test(sentence)) return false;
  if (/https?:|www\.|@/.test(sentence)) return false;

  const digits = (sentence.match(/\d/g) ?? []).length;
  if (digits > 6) return false;

  const letters = (sentence.match(/\p{L}/gu) ?? []).length;
  if (letters / length < 0.7) return false;

  return true;
}

function collectSentences(pages: PageText[]): SentenceCandidate[] {
  const seen = new Set<string>();
  const sentences: SentenceCandidate[] = [];

  for (const page of pages) {
    for (const raw of splitSentences(page.text)) {
      const sentence = raw.replace(/\s+/g, ' ').trim();
      if (!isUsableSentence(sentence)) continue;
      const key = sentence.toLowerCase().replace(/[^\p{L}\d]+/gu, ' ').trim();
      if (key.length < 40 || seen.has(key)) continue;
      seen.add(key);
      sentences.push({ sentence, page: page.pageNumber, key });
    }
  }

  return sentences;
}

interface AnswerCandidate {
  term: Term;
  matchedText: string;
}

function chooseAnswerTerm(sentence: string, terms: Term[]): AnswerCandidate | null {
  const candidates: AnswerCandidate[] = [];

  for (const term of terms) {
    if (term.text.length < 4) continue;
    if (isLikelyVerb(term.text)) continue;
    const pattern = new RegExp(
      `(?<![\\p{L}])(${escapeRegExp(term.text)})(?![\\p{L}])`,
      'iu',
    );
    const match = pattern.exec(sentence);
    if (!match || match.index === undefined) continue;
    if (match.index === 0) continue;
    candidates.push({ term, matchedText: match[1] ?? term.text });
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    if (b.term.score !== a.term.score) return b.term.score - a.term.score;
    return b.matchedText.length - a.matchedText.length;
  });
  return candidates[0] ?? null;
}

function buildDistractors(
  answer: AnswerCandidate,
  sentence: string,
  terms: Term[],
  random: () => number,
): string[] | null {
  const answerKey = answer.term.key;
  const answerLength = answer.matchedText.length;

  const pool = terms.filter((term) => {
    if (term.key === answerKey) return false;
    if (containsTerm(sentence, term.text)) return false;
    if (term.text.toLowerCase() === answer.matchedText.toLowerCase()) return false;
    if (
      term.text.toLowerCase().includes(answerKey) ||
      answerKey.includes(term.text.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const nounOnly = pool.filter((term) => !isLikelyVerb(term.text));
  const base = nounOnly.length >= 3 ? nounOnly : pool;

  const close = base.filter((term) => {
    const ratio = term.text.length / answerLength;
    return ratio >= 0.55 && ratio <= 1.9;
  });

  const source = close.length >= 3 ? close : base;
  if (source.length < 3) return null;

  const answerEnding = normalizeKey(answer.matchedText).slice(-2);
  const scoreOf = (term: Term): number => {
    const key = normalizeKey(term.text);
    const sameEnding = key.slice(-2) === answerEnding ? 5 : 0;
    const sameShape = term.text.includes(' ') === answer.matchedText.includes(' ') ? 1 : 0;
    return sameEnding + sameShape - Math.abs(term.text.length - answerLength) * 0.35;
  };

  const ordered = shuffle(source, random).sort((a, b) => scoreOf(b) - scoreOf(a));

  const picked: string[] = [];
  const pickedKeys = new Set<string>();
  for (const term of ordered) {
    const key = normalizeKey(term.text);
    if (pickedKeys.has(key) || key === normalizeKey(answer.matchedText)) continue;
    pickedKeys.add(key);
    picked.push(term.text);
    if (picked.length === 3) break;
  }

  return picked.length === 3 ? picked : null;
}

function withOptions(
  base: Omit<QuizQuestion, 'id' | 'options' | 'correctIndex'>,
  answer: string,
  distractors: string[],
  random: () => number,
): Omit<QuizQuestion, 'id'> {
  const options = shuffle([answer, ...distractors], random);
  return {
    ...base,
    options,
    correctIndex: options.indexOf(answer),
  };
}

function buildClozeQuestions(
  sentences: SentenceCandidate[],
  terms: Term[],
  random: () => number,
  limit: number,
): Omit<QuizQuestion, 'id'>[] {
  const questions: Omit<QuizQuestion, 'id'>[] = [];
  const usedTerms = new Set<string>();
  const perPage = new Map<number, number>();

  const ordered = shuffle(sentences, random);

  const attempt = (respectPageSpread: boolean) => {
    for (const candidate of ordered) {
      if (questions.length >= limit) return;
      if (respectPageSpread && (perPage.get(candidate.page) ?? 0) >= 2) continue;

      const answer = chooseAnswerTerm(candidate.sentence, terms);
      if (!answer) continue;
      if (usedTerms.has(answer.term.key)) continue;

      const distractors = buildDistractors(answer, candidate.sentence, terms, random);
      if (!distractors) continue;

      const prompt = candidate.sentence.replace(
        new RegExp(
          `(?<![\\p{L}])${escapeRegExp(answer.matchedText)}(?![\\p{L}])`,
          'giu',
        ),
        '________',
      );
      if (!prompt.includes('________')) continue;

      questions.push(
        withOptions(
          {
            kind: 'cloze',
            prompt,
            sourcePage: candidate.page,
            explanation: candidate.sentence,
          },
          answer.matchedText,
          distractors,
          random,
        ),
      );
      usedTerms.add(answer.term.key);
      perPage.set(candidate.page, (perPage.get(candidate.page) ?? 0) + 1);
    }
  };

  attempt(true);
  if (questions.length < limit) attempt(false);

  return questions;
}

function collectDefinitions(sentences: SentenceCandidate[]): DefinitionCandidate[] {
  const definitions: DefinitionCandidate[] = [];
  const seen = new Set<string>();

  for (const candidate of sentences) {
    const match = DEFINITION_RE.exec(candidate.sentence);
    if (!match) continue;
    const subject = (match[1] ?? '')
      .replace(/^["“'\-–—\s]+|["”'.,;:\s]+$/g, '')
      .replace(/^(a|o|as|os|um|uma|uns|umas)\s+/i, '');
    const object = (match[3] ?? '').replace(/^["“'\-–—\s]+|["”'.,;:]+$/g, '').trim();
    if (!subject || !object) continue;
    if (subject.split(/\s+/).length > 8) continue;
    if (object.length < 20 || object.length > 180) continue;
    if (/^(que|e|mas|porém|então|assim)\b/i.test(object)) continue;

    const key = normalizeKey(subject);
    if (seen.has(key)) continue;
    seen.add(key);

    definitions.push({
      subject,
      object: `${object.replace(/\.$/, '')}.`,
      sentence: candidate.sentence,
      page: candidate.page,
    });
  }

  return definitions;
}

function buildDefinitionQuestions(
  sentences: SentenceCandidate[],
  random: () => number,
  limit: number,
): Omit<QuizQuestion, 'id'>[] {
  const definitions = collectDefinitions(sentences);
  if (definitions.length < 3) return [];

  const questions: Omit<QuizQuestion, 'id'>[] = [];
  const shuffled = shuffle(definitions, random);
  const used = new Set<string>();

  for (const definition of shuffled) {
    if (questions.length >= limit) break;
    const key = normalizeKey(definition.subject);
    if (used.has(key)) continue;

    const others = definitions.filter(
      (other) =>
        normalizeKey(other.subject) !== key &&
        normalizeKey(other.object) !== normalizeKey(definition.object),
    );
    const distractors: string[] = [];
    for (const other of shuffle(others, random)) {
      if (distractors.length === 3) break;
      const optionKey = normalizeKey(other.object);
      if (optionKey === normalizeKey(definition.object)) continue;
      if (distractors.some((item) => normalizeKey(item) === optionKey)) continue;
      distractors.push(other.object);
    }
    if (distractors.length < 3) continue;

    const sentenceKey = definition.sentence.slice(0, 60);
    if (used.has(sentenceKey)) continue;

    questions.push(
      withOptions(
        {
          kind: 'definition',
          prompt: `De acordo com o texto do capítulo, o que define ou caracteriza “${definition.subject}”?`,
          sourcePage: definition.page,
          explanation: definition.sentence,
        },
        definition.object,
        distractors,
        random,
      ),
    );
    used.add(key);
    used.add(sentenceKey);
  }

  return questions;
}

function buildCauseEffectQuestions(
  sentences: SentenceCandidate[],
  random: () => number,
  limit: number,
): Omit<QuizQuestion, 'id'>[] {
  const candidates: { premise: string; consequence: string; sentence: string; page: number }[] = [];

  for (const item of sentences) {
    const match = CAUSE_EFFECT_RE.exec(item.sentence);
    if (!match || match.index === undefined) continue;

    const connector = match[1] ?? '';
    const before = item.sentence.slice(0, match.index).trim();
    const after = item.sentence.slice(match.index + connector.length).trim();

    if (before.length < 25 || after.length < 25) continue;
    if (before.length > 150 || after.length > 150) continue;

    candidates.push({
      premise: before.replace(/[,;:]+$/, ''),
      consequence: `${connector.toLowerCase()} ${after.replace(/\.$/, '')}.`,
      sentence: item.sentence,
      page: item.page,
    });
  }

  if (candidates.length < 3) return [];

  const questions: Omit<QuizQuestion, 'id'>[] = [];
  const shuffled = shuffle(candidates, random);
  const used = new Set<string>();

  for (const candidate of shuffled) {
    if (questions.length >= limit) break;
    const key = normalizeKey(candidate.premise);
    if (used.has(key)) continue;

    const others = candidates.filter((c) => normalizeKey(c.premise) !== key);
    const distractors: string[] = [];
    for (const other of shuffle(others, random)) {
      if (distractors.length === 3) break;
      if (distractors.includes(other.consequence)) continue;
      distractors.push(other.consequence);
    }
    if (distractors.length < 3) continue;

    questions.push(
      withOptions(
        {
          kind: 'cause-effect',
          prompt: `Segundo o texto, qual é a justificativa ou consequência apontada para: “${candidate.premise}”?`,
          sourcePage: candidate.page,
          explanation: candidate.sentence,
        },
        candidate.consequence,
        distractors,
        random,
      ),
    );
    used.add(key);
  }

  return questions;
}

function buildContextQuestions(
  sentences: SentenceCandidate[],
  terms: Term[],
  random: () => number,
  limit: number,
): Omit<QuizQuestion, 'id'>[] {
  const topTerms = terms.slice(0, 15).filter((t) => t.text.length >= 4 && !isLikelyVerb(t.text));
  const questions: Omit<QuizQuestion, 'id'>[] = [];
  const used = new Set<string>();

  for (const term of shuffle(topTerms, random)) {
    if (questions.length >= limit) break;

    const matchingSentences = sentences.filter((s) => containsTerm(s.sentence, term.text));
    if (matchingSentences.length === 0) continue;

    const target = matchingSentences[0];
    if (!target) continue;
    const key = normalizeKey(term.text);
    if (used.has(key)) continue;

    const otherSentences = sentences.filter(
      (s) =>
        !containsTerm(s.sentence, term.text) &&
        s.sentence.length >= 50 &&
        s.sentence.length <= 180,
    );
    const distractors: string[] = [];
    for (const other of shuffle(otherSentences, random)) {
      if (distractors.length === 3) break;
      const clean = `${other.sentence.replace(/\.$/, '')}.`;
      if (!distractors.includes(clean) && clean !== target.sentence) {
        distractors.push(clean);
      }
    }
    if (distractors.length < 3) continue;

    const answer = `${target.sentence.replace(/\.$/, '')}.`;

    questions.push(
      withOptions(
        {
          kind: 'context',
          prompt: `Ao abordar o conceito de “${term.text}” (pág. ${target.page}), qual afirmação expressa o que o capítulo destaca?`,
          sourcePage: target.page,
          explanation: target.sentence,
        },
        answer,
        distractors,
        random,
      ),
    );
    used.add(key);
  }

  return questions;
}

function buildComprehensionQuestions(
  sentences: SentenceCandidate[],
  chapter: Chapter,
  random: () => number,
  limit: number,
): Omit<QuizQuestion, 'id'>[] {
  const usable = sentences.filter(
    (s) => s.sentence.length >= 60 && s.sentence.length <= 190 && !s.sentence.includes('?'),
  );
  if (usable.length < 8) return [];

  const questions: Omit<QuizQuestion, 'id'>[] = [];
  const shuffled = shuffle(usable, random);
  const used = new Set<string>();

  for (let i = 0; i < shuffled.length && questions.length < limit; i += 4) {
    const chunk = shuffled.slice(i, i + 4);
    if (chunk.length < 4) break;

    const correct = chunk[0];
    if (!correct || used.has(correct.key)) continue;

    const answer = `${correct.sentence.replace(/\.$/, '')}.`;
    const distractors = chunk.slice(1, 4).map((c) => {
      let s = c.sentence.replace(/\.$/, '');
      if (/\b(é|são)\b/i.test(s) && !/\bnão\b/i.test(s)) {
        s = s.replace(/\b(é|são)\b/i, (m) => `não ${m}`);
      } else if (/\b(aumenta|aumentam)\b/i.test(s)) {
        s = s.replace(/\b(aumenta|aumentam)\b/i, 'diminui');
      } else if (/\b(sempre)\b/i.test(s)) {
        s = s.replace(/\b(sempre)\b/i, 'nunca');
      }
      return `${s}.`;
    });

    if (new Set([answer, ...distractors]).size !== 4) continue;

    questions.push(
      withOptions(
        {
          kind: 'comprehension',
          prompt: `Com base nas explicações do capítulo “${chapter.title}”, qual das seguintes afirmações está correta segundo o texto?`,
          sourcePage: correct.page,
          explanation: correct.sentence,
        },
        answer,
        distractors,
        random,
      ),
    );
    used.add(correct.key);
  }

  return questions;
}

export function generateLocalQuiz(pages: PageText[], chapter: Chapter, seedSuffix = ''): QuizQuestion[] {
  const usablePages = pages.filter((page) => page.text.trim().length > 0);
  const totalChars = usablePages.reduce((sum, page) => sum + page.text.length, 0);

  if (usablePages.length === 0 || totalChars < 300) {
    throw new QuizGenerationError(
      'Não encontrei texto selecionável neste capítulo. Se o PDF for digitalizado (imagem), ele precisa de OCR antes de gerar perguntas.',
      'no-text',
    );
  }

  const random = mulberry32(hashSeed(`${chapter.id}:${QUIZ_GENERATOR_VERSION}:${seedSuffix}`));
  const terms = Array.from(collectTerms(usablePages).values()).sort((a, b) => b.score - a.score);
  const sentences = collectSentences(usablePages);

  if (terms.length < 4 || sentences.length < 4) {
    throw new QuizGenerationError(
      'Este capítulo tem pouco texto legível para montar perguntas.',
      'too-few',
    );
  }

  const comprehensionQuestions = buildComprehensionQuestions(sentences, chapter, random, 2);
  const causeEffectQuestions = buildCauseEffectQuestions(sentences, random, 2);
  const definitionQuestions = buildDefinitionQuestions(sentences, random, 2);
  const contextQuestions = buildContextQuestions(sentences, terms, random, 2);

  const richPool = [
    ...comprehensionQuestions,
    ...causeEffectQuestions,
    ...definitionQuestions,
    ...contextQuestions,
  ];

  const needed = QUESTIONS_PER_QUIZ - richPool.length;
  const fallbackCloze = needed > 0 ? buildClozeQuestions(sentences, terms, random, needed) : [];

  const combined = shuffle(
    [...richPool, ...fallbackCloze],
    mulberry32(hashSeed(`order:${chapter.id}:${QUIZ_GENERATOR_VERSION}:${seedSuffix}`)),
  ).slice(0, QUESTIONS_PER_QUIZ);

  if (combined.length < MIN_QUIZ_QUESTIONS) {
    throw new QuizGenerationError(
      'Este capítulo tem pouco texto legível para montar um quiz completo.',
      'too-few',
    );
  }

  return combined.map((question, index) => ({
    ...question,
    id: `q${index + 1}`,
  }));
}

