import type { AppLanguage, Chapter, QuizQuestion } from '@/types';
import type { PageText } from './pdf-text';
import { MIN_QUIZ_QUESTIONS, QUESTIONS_PER_QUIZ } from './quiz-generator';
import { getLanguageMeta } from '@/i18n/translations';

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
  language?: AppLanguage;
}

export class AiQuizError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiQuizError';
  }
}

function buildCorpus(pages: PageText[]): string {
  const validPages = pages.filter((p) => p.text.trim().length > 0);
  if (validPages.length === 0) return '';

  const totalLength = validPages.reduce((sum, p) => sum + p.text.length, 0);

  if (totalLength <= MAX_CORPUS_CHARS) {
    return validPages.map((p) => `[Página ${p.pageNumber}]\n${p.text.trim()}`).join('\n\n');
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

function buildMessages(
  corpus: string,
  chapter: Chapter,
  language: AppLanguage = 'pt',
): { role: string; content: string }[] {
  const langName = getLanguageMeta(language).aiLanguageName;

  const system =
    `You are an expert teacher creating reading comprehension and retention quiz questions strictly in ${langName}. ` +
    'Remember that every question must focus primarily on core concepts, deep understanding, and the wisdom the text conveys. ' +
    'Respond STRICTLY in valid JSON, with no markdown fences and no text outside the JSON.';

  const user = `Based strictly on chapter "${chapter.title}", generate exactly ${QUESTIONS_PER_QUIZ} multiple-choice questions in ${langName} evaluating real comprehension of central ideas, cause/effect, and concepts from the text (covering beginning, middle, and end).

RULES:
- Do NOT use fill-in-the-blank ("____") questions.
- Every field ("question", "options", "explanation") MUST be written in ${langName}.
- "question": clear, contextualized question about concepts, understanding, and wisdom conveyed by the text.
- "options": exactly 4 objective options (1 concise sentence each).
- "correctIndex": integer index of the right answer (0, 1, 2, or 3).
- "sourcePage": integer page number from [Página N] where the concept appears.
- "explanation": direct explanation (1-2 sentences) justifying the correct answer.

REQUIRED JSON FORMAT:
{"questions":[{"question":"...","options":["A","B","C","D"],"correctIndex":0,"sourcePage":${chapter.startPage},"explanation":"..."}]}

TEXT:
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
    if (question.length < 8 || question.length > 600) continue;

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

  const messages = buildMessages(corpus, chapter, config.language ?? 'pt');

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
        result.error ||
        'O provedor não respondeu corretamente. Verifique sua chave e o modelo selecionado.',
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Falha ao se conectar com o provedor.',
    };
  }
}
