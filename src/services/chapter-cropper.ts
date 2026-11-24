import type { Chapter } from '@/types';
import type { PageText } from './pdf-text';

/**
 * Remove acentos e converte para minúsculas para busca tolerante.
 */
function normalizeForSearch(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extrai palavras significativas de um título de capítulo (ignorando pontuações e palavras vazias muito curtas).
 */
function extractTitleKeywords(title: string): string[] {
  const norm = normalizeForSearch(title);
  return norm.split(/\s+/).filter((w) => w.length >= 2);
}

/**
 * Tenta localizar a posição aproximada de um título dentro do texto de uma página.
 * Retorna o índice de caractere no `pageText` original onde o título começa, ou -1 se não encontrado.
 */
export function findTitlePositionInPage(pageText: string, title: string): number {
  if (!pageText || !title) return -1;

  const rawLower = pageText.toLowerCase();
  const cleanTitle = title.trim();
  const titleLower = cleanTitle.toLowerCase();

  // 1. Busca exata direta (case-insensitive)
  const directIdx = rawLower.indexOf(titleLower);
  if (directIdx !== -1) {
    return directIdx;
  }

  // 2. Busca com regex flexível que aceita quebras de linha ou múltiplos espaços entre as palavras do título
  const keywords = extractTitleKeywords(cleanTitle);
  if (keywords.length > 0) {
    try {
      // Monta regex escapada com separadores flexíveis de espaço/quebra de linha
      const escapedKeywords = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      const flexiblePattern = escapedKeywords.join('[\\s\\n\\r\\t\\-\\–\\—:]+');
      const flexibleRegex = new RegExp(`\\b${flexiblePattern}\\b`, 'iu');
      const normPage = pageText.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const match = flexibleRegex.exec(normPage);
      if (match && match.index !== undefined) {
        return Math.max(0, match.index);
      }
    } catch {
      // continua para a próxima estratégia
    }
  }

  // 3. Se o título tiver muitas palavras (ex: > 3), tenta encontrar as primeiras 3 palavras significativas consecutivas
  if (keywords.length >= 3) {
    try {
      const firstKeywords = keywords.slice(0, 3).map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      const subPattern = firstKeywords.join('[\\s\\n\\r\\t\\-\\–\\—:]+');
      const subRegex = new RegExp(`\\b${subPattern}\\b`, 'iu');
      const normPage = pageText.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const match = subRegex.exec(normPage);
      if (match && match.index !== undefined) {
        return Math.max(0, match.index);
      }
    } catch {
      // continua para a próxima estratégia
    }
  }

  // 4. Se o título contiver indicativo de capítulo como "Capítulo X", "Cap. X", "Parte X", "Seção X"
  const capNumberMatch = cleanTitle.match(
    /(?:cap[ií]tulo|cap\.?|se[çc][aã]o|parte|unidade|m[oó]dulo)?\s*(\d+|[ivxlcdm]+)\b/i,
  );
  if (capNumberMatch && capNumberMatch[1]) {
    const num = capNumberMatch[1];
    try {
      const numPattern = new RegExp(`(?:cap[ií]tulo|cap\\.?)\\s*${num}\\b`, 'iu');
      const normPage = pageText.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const match = numPattern.exec(normPage);
      if (match && match.index !== undefined) {
        return Math.max(0, match.index);
      }
    } catch {
      // ignora
    }
  }

  return -1;
}

/**
 * Encontra o próximo capítulo que delimita o fim do capítulo atual.
 * Procura na lista de capítulos o primeiro capítulo subsequente que não seja filho interno
 * e que comece a partir de `chapter.startPage`.
 */
function findNextBoundaryChapter(currentChapter: Chapter, allChapters: Chapter[]): Chapter | undefined {
  if (!allChapters || allChapters.length === 0) return undefined;

  const currentIndex = allChapters.findIndex((c) => c.id === currentChapter.id);
  if (currentIndex === -1) {
    // Se não encontrou por ID, tenta por posição e título
    return allChapters.find(
      (c) =>
        (c.startPage > currentChapter.startPage ||
          (c.startPage === currentChapter.startPage && c.title !== currentChapter.title)) &&
        c.level <= currentChapter.level,
    );
  }

  for (let i = currentIndex + 1; i < allChapters.length; i++) {
    const candidate = allChapters[i];
    if (!candidate) continue;

    // Próximo capítulo que marca o fim do escopo do capítulo atual
    if (candidate.level <= currentChapter.level) {
      return candidate;
    }
  }

  // Se for o último capítulo do nível, verifica se há algum capítulo posterior em qualquer nível
  for (let i = currentIndex + 1; i < allChapters.length; i++) {
    const candidate = allChapters[i];
    if (candidate && candidate.startPage >= currentChapter.startPage) {
      return candidate;
    }
  }

  return undefined;
}

/**
 * Recorta as páginas extraídas para que contenham ESTRITAMENTE o texto do capítulo selecionado:
 *
 * 1. Na página inicial (`chapter.startPage`), se houver texto antes do início do capítulo
 *    (ex: término do capítulo anterior na mesma página), esse texto é descartado.
 * 2. Na página final (`chapter.endPage` ou na página onde o próximo capítulo começa),
 *    o texto a partir do próximo capítulo em diante é descartado.
 * 3. Se múltiplos capítulos estiverem na mesma página, apenas o trecho pertencente
 *    ao capítulo selecionado é preservado.
 */
export function cropPagesToChapter(
  pages: PageText[],
  chapter: Chapter,
  allChapters: Chapter[],
): PageText[] {
  if (!pages || pages.length === 0) return [];

  const nextBoundary = findNextBoundaryChapter(chapter, allChapters);

  const croppedPages: PageText[] = [];

  for (const page of pages) {
    let text = page.text;
    const pageNum = page.pageNumber;

    // Ignora páginas que estejam totalmente fora dos limites calculados
    if (pageNum < chapter.startPage) {
      continue;
    }
    if (nextBoundary && pageNum > nextBoundary.startPage) {
      continue;
    }

    // Caso 1: Página inicial do capítulo atual (cortar o que vem antes do título)
    if (pageNum === chapter.startPage) {
      const startIdx = findTitlePositionInPage(text, chapter.title);
      if (startIdx > 0) {
        // Corta tudo antes do título do capítulo
        text = text.slice(startIdx).trim();
      }
    }

    // Caso 2: Página de transição para o próximo capítulo (cortar o que vem a partir do próximo título)
    if (nextBoundary && pageNum === nextBoundary.startPage) {
      const nextIdx = findTitlePositionInPage(text, nextBoundary.title);
      if (nextIdx !== -1) {
        // Se ambos estão na mesma página, garante que o corte respeita o trecho do capítulo atual
        text = text.slice(0, nextIdx).trim();
      }
    }

    // Se a página ainda contém conteúdo textual útil após o recorte
    if (text.trim().length > 0) {
      croppedPages.push({
        pageNumber: pageNum,
        text,
      });
    }
  }

  // Fallback de segurança: se o recorte por acaso deixou tudo vazio (ex: OCR difícil),
  // retorna as páginas originais para não travar o quiz
  if (croppedPages.length === 0 && pages.length > 0) {
    return pages;
  }

  return croppedPages;
}

