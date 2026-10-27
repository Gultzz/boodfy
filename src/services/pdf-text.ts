import type { PDFDocumentProxy } from 'pdfjs-dist';

export interface PageText {
  pageNumber: number;
  text: string;
}

interface TextItemLike {
  str?: string;
  hasEOL?: boolean;
}

/** Número máximo de páginas extraídas por capítulo (amostragem distribuída para capítulos longos) */
const MAX_CHAPTER_PAGES_TO_EXTRACT = 18;
/** Concorrência máxima ao extrair páginas em paralelo do worker PDF.js */
const EXTRACTION_BATCH_SIZE = 6;

/** Cache em memória do texto já extraído por página para evitar retrabalho */
const pdfPageTextCache = new WeakMap<PDFDocumentProxy, Map<number, string>>();

function getDocCache(pdf: PDFDocumentProxy): Map<number, string> {
  let cache = pdfPageTextCache.get(pdf);
  if (!cache) {
    cache = new Map<number, string>();
    pdfPageTextCache.set(pdf, cache);
  }
  return cache;
}

async function extractSinglePage(
  pdf: PDFDocumentProxy,
  pageNumber: number,
  cache: Map<number, string>,
): Promise<PageText> {
  const cached = cache.get(pageNumber);
  if (cached !== undefined) {
    return { pageNumber, text: cached };
  }

  try {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const rawParts: string[] = [];

    for (const item of content.items as TextItemLike[]) {
      if (typeof item.str !== 'string') continue;
      rawParts.push(item.str);
      rawParts.push(item.hasEOL ? '\n' : ' ');
    }

    const cleaned = rawParts
      .join('')
      .replace(/(\p{L})-\s*\n\s*(\p{L})/gu, '$1$2')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    cache.set(pageNumber, cleaned);
    return { pageNumber, text: cleaned };
  } catch (err) {
    console.warn(`Erro ao extrair texto da página ${pageNumber}:`, err);
    return { pageNumber, text: '' };
  }
}

/**
 * Seleciona até `maxPages` páginas distribuídas uniformemente pelo capítulo
 * (garantindo início, meio e fim) para leitura ultrarrápida mesmo em capítulos extensos.
 */
function selectPagesToExtract(from: number, to: number, maxPages: number): number[] {
  const total = to - from + 1;
  if (total <= maxPages) {
    const all: number[] = [];
    for (let p = from; p <= to; p++) all.push(p);
    return all;
  }

  const selected = new Set<number>();
  for (let i = 0; i < maxPages; i++) {
    const page = Math.round(from + (i * (total - 1)) / (maxPages - 1));
    selected.add(page);
  }
  return Array.from(selected).sort((a, b) => a - b);
}

/**
 * Extrai o texto de um intervalo de páginas do PDF usando cache em memória,
 * amostragem inteligente e execução em lotes paralelos.
 */
export async function extractPagesText(
  pdf: PDFDocumentProxy,
  startPage: number,
  endPage: number,
): Promise<PageText[]> {
  const from = Math.max(1, Math.min(startPage, pdf.numPages));
  const to = Math.max(from, Math.min(endPage, pdf.numPages));
  const targetPages = selectPagesToExtract(from, to, MAX_CHAPTER_PAGES_TO_EXTRACT);
  const cache = getDocCache(pdf);
  const results: PageText[] = [];

  for (let i = 0; i < targetPages.length; i += EXTRACTION_BATCH_SIZE) {
    const batch = targetPages.slice(i, i + EXTRACTION_BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map((pageNumber) => extractSinglePage(pdf, pageNumber, cache)),
    );
    results.push(...batchResults);
  }

  return results;
}
