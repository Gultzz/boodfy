import type { Chapter, QuizQuestion } from '@/types';
import type { PageText } from './pdf-text';
import { MIN_QUIZ_QUESTIONS, QUESTIONS_PER_QUIZ } from './quiz-generator';

const MAX_CORPUS_CHARS = 45000;

export interface AiQuizConfig {
  baseUrl: string;
  model: string;
}

export class AiQuizError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiQuizError';
  }
}

/**
 * Constrói o texto do capítulo cobrindo todas as páginas de forma equilibrada.
 */
function buildCorpus(pages: PageText[]): string {
  const validPages = pages.filter((p) => p.text.trim().length > 0);
  if (validPages.length === 0) return '';

  const totalLength = validPages.reduce((sum, p) => sum + p.text.length, 0);

  if (totalLength <= MAX_CORPUS_CHARS) {
    return validPages
      .map((p) => `\n[Página ${p.pageNumber}]\n${p.text.trim()}\n`)
      .join('\n');
  }

  const budgetPerPage = Math.max(300, Math.floor(MAX_CORPUS_CHARS / validPages.length));
  const chunks: string[] = [];

  for (const page of validPages) {
    const text = page.text.trim();
    const excerpt = text.length <= budgetPerPage ? text : `${text.slice(0, budgetPerPage)}...`;
    chunks.push(`\n[Página ${page.pageNumber}]\n${excerpt}\n`);
  }

  return chunks.join('\n').slice(0, MAX_CORPUS_CHARS);
}

function buildMessages(corpus: string, chapter: Chapter): { role: string; content: string }[] {
  const system =
    'Você é um professor universitário e pedagogo especialista em elaboração de exames de compreensão, ' +
    'análise crítica e retenção de leitura em português do Brasil. ' +
    'Sua missão é criar perguntas de múltipla escolha profundas, conceituais e contextuais que avaliem se o estudante ' +
    'realmente compreendeu o conteúdo, teses centrais, relações de causa/efeito e ideias explicadas no capítulo. ' +
    'Responda ESTRITAMENTE em formato JSON válido, sem texto fora do JSON.';

  const user = `Analise atentamente o texto do capítulo "${chapter.title}" e gere exatamente ${QUESTIONS_PER_QUIZ} perguntas de múltipla escolha de alto nível.

OBJETIVO DO QUIZ:
Avaliar a compreensão real do capítulo inteiro (não decoreba de palavras soltas ou números isolados).
As perguntas devem abranger diferentes seções do capítulo (início, meio e fim).

TIPOS DE PERGUNTAS QUE VOCÊ DEVE COMBINAR:
1. Compreensão Global e Ideia Central: O que o autor defende, qual o propósito principal ou a tese central apresentada.
2. Causa e Efeito: Por que determinado fato, conceito ou fenômeno ocorre e quais são seus desdobramentos segundo o texto.
3. Relação entre Conceitos: Como duas ideias, teorias ou definições apresentadas no capítulo se conectam ou se diferenciam.
4. Análise de Contexto: O que uma afirmação ou exemplo do texto demonstra no contexto geral do capítulo.

DIRETRIZES OBRIGATÓRIAS:
- NUNCA faça perguntas no estilo "complete a frase" com lacunas ("______").
- O enunciado ("question") deve ser uma pergunta completa, clara e contextualizada (mínimo de 12 a 30 palavras).
- Cada pergunta deve ter exatamente 4 alternativas ("options"), e cada alternativa deve ser uma frase explicativa completa e bem redigida.
- Apenas 1 alternativa deve ser a correta ("correctIndex": 0, 1, 2 ou 3).
- As 3 alternativas incorretas devem ser plausíveis para quem leu superficialmente, mas conceitualmente incorretas de acordo com a explicação do autor.
- "sourcePage": número inteiro da página (indicada nos marcadores [Página N]) onde o conteúdo da pergunta é tratado.
- "explanation": justificativa clara e didática de 2 a 4 linhas explicando por que a alternativa correta é a verdadeira, sintetizando o raciocínio do autor.

FORMATO JSON OBRIGATÓRIAMENTE VÁLIDO:
{
  "questions": [
    {
      "question": "Pergunta completa, conceitual e contextualizada sobre o conteúdo do capítulo?",
      "options": [
        "Primeira alternativa formulada como frase completa...",
        "Segunda alternativa formulada como frase completa...",
        "Terceira alternativa formulada como frase completa...",
        "Quarta alternativa formulada como frase completa..."
      ],
      "correctIndex": 0,
      "sourcePage": 12,
      "explanation": "Explicação didática fundamentada no texto justificando a resposta correta."
    }
  ]
}

TEXTO DO CAPÍTULO:
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
  if (corpus.length < 250) {
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
 * Testa a conexão com o provedor de IA enviando uma requisição real de verificação.
 */
export async function testAiConnection(
  config: AiQuizConfig,
): Promise<{ ok: boolean; message: string }> {
  try {
    const result = await window.electronAPI.aiComplete({
      baseUrl: config.baseUrl,
      model: config.model,
      messages: [
        {
          role: 'user',
          content: 'Responda apenas com a palavra CONECTADO para validar a chave de API.',
        },
      ],
    });
    if (result.ok && result.content) {
      return {
        ok: true,
        message: `Tudo certo! O modelo "${config.model}" respondeu com sucesso e está pronto para criar seus quizzes.`,
      };
    }
    return {
      ok: false,
      message: result.error || 'O provedor não respondeu corretamente. Verifique sua chave e modelo.',
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Falha ao se conectar com o provedor.',
    };
  }
}

