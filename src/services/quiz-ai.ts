import type { Chapter, QuizQuestion } from '@/types';
import type { PageText } from './pdf-text';
import { MIN_QUIZ_QUESTIONS, QUESTIONS_PER_QUIZ } from './quiz-generator';

/**
 * Limite otimizado de caracteres (~3.000 tokens) para garantir:
 * - Resposta da IA 3x a 5x mais rápida (menor tempo de prefill e geração)
 * - Compatibilidade com limites gratuitos de tokens por minuto (Groq, Gemini Free, OpenRouter)
 */
const MAX_CORPUS_CHARS = 12000;

export interface AiQuizConfig {
  baseUrl: string;
  model: string;
  apiKey?: string;
}

export class AiQuizError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiQuizError';
  }
}

/**
 * Constrói o texto do capítulo cobrindo todas as páginas extraídas de forma equilibrada.
 */
function buildCorpus(pages: PageText[]): string {
  const validPages = pages.filter((p) => p.text.trim().length > 0);
  if (validPages.length === 0) return '';

  const totalLength = validPages.reduce((sum, p) => sum + p.text.length, 0);

  if (totalLength <= MAX_CORPUS_CHARS) {
    return validPages
      .map((p) => `[Página ${p.pageNumber}]\n${p.text.trim()}`)
      .join('\n\n');
  }

  const budgetPerPage = Math.max(250, Math.floor(MAX_CORPUS_CHARS / validPages.length));
  const chunks: string[] = [];

  for (const page of validPages) {
    const text = page.text.trim();
    const excerpt = text.length <= budgetPerPage ? text : `${text.slice(0, budgetPerPage)}...`;
    chunks.push(`[Página ${page.pageNumber}]\n${excerpt}`);
  }

  return chunks.join('\n\n').slice(0, MAX_CORPUS_CHARS);
}

function buildMessages(corpus: string, chapter: Chapter): { role: string; content: string }[] {
  const system =
    'Você é um professor especialista em criar questões de compreensão e retenção de leitura em português do Brasil. ' +
    'Responda ESTRITAMENTE em JSON válido, sem markdown e sem texto fora do JSON.';

  const user = `Com base no capítulo "${chapter.title}", gere exatamente ${QUESTIONS_PER_QUIZ} perguntas de múltipla escolha que avaliem a compreensão real das ideias centrais, causas/efeitos e conceitos do texto (abrangendo início, meio e fim).

REGRAS:
- Não use perguntas de preencher lacuna ("____").
- "question": pergunta clara e contextualizada.
- "options": exatamente 4 alternativas objetivas (1 frase cada).
- "correctIndex": índice da correta (0, 1, 2 ou 3).
- "sourcePage": número inteiro da página [Página N] de onde veio o conceito.
- "explanation": explicação direta (1 a 2 frases) justificando a resposta correta.

FORMATO JSON OBRIGATÓRIO:
{"questions":[{"question":"...","options":["A","B","C","D"],"correctIndex":0,"sourcePage":${chapter.startPage},"explanation":"..."}]}

TEXTO:
${corpus}`;

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

function parseJsonResponse(raw: string): unknown {
  let text = raw.trim();
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  if (fenced && fenced[1]) text = fenced[1].trim();

  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    const arrayStart = text.indexOf('[');
    const arrayEnd = text.lastIndexOf(']');
    if (arrayStart >= 0 && arrayEnd > arrayStart) {
      try {
        return JSON.parse(text.slice(arrayStart, arrayEnd + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

interface RawAiQuestion {
  question?: unknown;
  options?: unknown;
  correctIndex?: unknown;
  sourcePage?: unknown;
  explanation?: unknown;
}

function validateQuestions(payload: unknown, chapter: Chapter): QuizQuestion[] {
  const list = Array.isArray(payload)
    ? payload
    : payload &&
        typeof payload === 'object' &&
        Array.isArray((payload as { questions?: unknown }).questions)
      ? (payload as { questions: unknown[] }).questions
      : null;

  if (!list) throw new AiQuizError('A IA respondeu em um formato inesperado. Tente novamente.');

  const questions: QuizQuestion[] = [];

  for (const item of list.slice(0, 15)) {
    if (!item || typeof item !== 'object') continue;
    const raw = item as RawAiQuestion;

    const question = typeof raw.question === 'string' ? raw.question.trim() : '';
    if (question.length < 10 || question.length > 600) continue;

    if (!Array.isArray(raw.options)) continue;
    const options = raw.options
      .filter((option): option is string => typeof option === 'string')
      .map((option) => option.trim())
      .filter((option) => option.length > 0 && option.length <= 400);
    if (options.length !== 4) continue;
    if (new Set(options.map((option) => option.toLowerCase())).size !== 4) continue;

    const correctIndex = raw.correctIndex;
    if (typeof correctIndex !== 'number' || !Number.isInteger(correctIndex)) continue;
    if (correctIndex < 0 || correctIndex > 3) continue;

    const rawPage = typeof raw.sourcePage === 'number' ? Math.round(raw.sourcePage) : NaN;
    const sourcePage = Number.isFinite(rawPage)
      ? Math.min(Math.max(rawPage, chapter.startPage), chapter.endPage)
      : chapter.startPage;

    const explanation =
      typeof raw.explanation === 'string' && raw.explanation.trim().length > 0
        ? raw.explanation.trim().slice(0, 600)
        : (options[correctIndex] ?? '');

    questions.push({
      id: `q${questions.length + 1}`,
      kind: 'ai',
      prompt: question,
      options,
      correctIndex,
      sourcePage,
      explanation,
    });
  }

  if (questions.length < MIN_QUIZ_QUESTIONS) {
    throw new AiQuizError('A IA não devolveu perguntas válidas suficientes.');
  }

  return questions.map((question, index) => ({ ...question, id: `q${index + 1}` }));
}

export async function generateAiQuiz(
  pages: PageText[],
  chapter: Chapter,
  config: AiQuizConfig,
): Promise<QuizQuestion[]> {
  const corpus = buildCorpus(pages);
  if (corpus.length < 200) {
    throw new AiQuizError('Não há texto legível suficiente neste capítulo para a IA analisar.');
  }

  const messages = buildMessages(corpus, chapter);

  let result: { ok: boolean; content?: string; error?: string };
  try {
    result = await window.electronAPI.aiComplete({
      baseUrl: config.baseUrl,
      model: config.model,
      messages,
    });
  } catch (err) {
    throw new AiQuizError(
      err instanceof Error
        ? `Falha ao chamar o provedor de IA: ${err.message}`
        : 'Falha ao chamar o provedor de IA.',
    );
  }

  if (!result.ok || !result.content) {
    throw new AiQuizError(result.error || 'O provedor de IA não devolveu uma resposta.');
  }

  return validateQuestions(parseJsonResponse(result.content), chapter);
}

/**
 * Testa a conexão com o provedor de IA de forma ultrarrápida.
 */
export async function testAiConnection(
  config: AiQuizConfig,
): Promise<{ ok: boolean; message: string }> {
  try {
    const result = await window.electronAPI.aiTest({
      baseUrl: config.baseUrl,
      model: config.model,
      apiKey: config.apiKey,
    });
    if (result.ok) {
      return {
        ok: true,
        message: `Tudo certo! O modelo "${config.model}" respondeu rapidamente e está pronto para criar seus quizzes.`,
      };
    }
    return {
      ok: false,
      message:
        result.error || 'O provedor não respondeu corretamente. Verifique sua chave e o modelo selecionado.',
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Falha ao se conectar com o provedor.',
    };
  }
}
