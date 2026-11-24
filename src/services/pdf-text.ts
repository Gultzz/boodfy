import type { PDFDocumentProxy } from 'pdfjs-dist';

export interface PageText {
  pageNumber: number;
  text: string;
}

interface TextItemLike {
  str?: string;
  hasEOL?: boolean;
  transform?: number[];
  height?: number;
}

/** Número máximo de páginas extraídas por capítulo (amostragem distribuída para capítulos longos) */
const MAX_CHAPTER_PAGES_TO_EXTRACT = 18;
/** Concorrência máxima ao extrair páginas em paralelo do worker PDF.js */
const EXTRACTION_BATCH_SIZE = 6;

/** Cache em memória do texto já extraído por página para evitar retrabalho */
const pdfPageTextCache = new WeakMap<PDFDocumentProxy, Map<number, string>>();
/** Cache em memória dos parágrafos estruturados para o modo Texto Fluido */
const pdfFluidParagraphsCache = new WeakMap<PDFDocumentProxy, Map<number, string[]>>();

function getDocCache(pdf: PDFDocumentProxy): Map<number, string> {
  let cache = pdfPageTextCache.get(pdf);
  if (!cache) {
    cache = new Map<number, string>();
    pdfPageTextCache.set(pdf, cache);
  }
  return cache;
}

function getParagraphsCache(pdf: PDFDocumentProxy): Map<number, string[]> {
  let cache = pdfFluidParagraphsCache.get(pdf);
  if (!cache) {
    cache = new Map<number, string[]>();
    pdfFluidParagraphsCache.set(pdf, cache);
  }
  return cache;
}

/**
 * Extrai parágrafos bem estruturados de uma página PDF para o modo Texto Fluido.
 * Reconstrói quebras de parágrafo usando a distância vertical (transform[5]) entre linhas
 * e remove hifenizações artificiais de quebra de linha.
 */
export async function extractPageParagraphs(
  pdf: PDFDocumentProxy,
  pageNumber: number,
): Promise<string[]> {
  const cache = getParagraphsCache(pdf);
  const cached = cache.get(pageNumber);
  if (cached !== undefined) return cached;

  try {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const items = content.items as TextItemLike[];

    interface LineBucket {
      y: number;
      height: number;
      text: string;
    }

    const lines: LineBucket[] = [];
    let currentLine: LineBucket | null = null;

    for (const item of items) {
      if (typeof item.str !== 'string') continue;
      const text = item.str;
      if (!text.trim() && !item.hasEOL) {
        if (currentLine) currentLine.text += ' ';
        continue;
      }

      const y = Array.isArray(item.transform) ? item.transform[5] ?? 0 : 0;
      const h =
        typeof item.height === 'number' && item.height > 0
          ? item.height
          : Array.isArray(item.transform)
            ? Math.abs(item.transform[0] ?? 12)
            : 12;

      const isSameLine =
        currentLine !== null && Math.abs(y - currentLine.y) <= Math.max(h, currentLine.height) * 0.45;

      if (!isSameLine) {
        if (currentLine && currentLine.text.trim()) {
          lines.push(currentLine);
        }
        currentLine = { y, height: h, text };
      } else if (currentLine) {
        const needsSpace =
          currentLine.text.length > 0 &&
          !currentLine.text.endsWith(' ') &&
          !text.startsWith(' ');
        currentLine.text += (needsSpace ? ' ' : '') + text;
        currentLine.height = Math.max(currentLine.height, h);
      }

      if (item.hasEOL && currentLine && currentLine.text.trim()) {
        lines.push(currentLine);
        currentLine = null;
      }
    }

    if (currentLine && currentLine.text.trim()) {
      lines.push(currentLine);
    }

    if (lines.length === 0) {
      cache.set(pageNumber, []);
      return [];
    }

    // Estima o espaçamento típico entre linhas consecutivas para detectar quebras reais de parágrafo
    const gaps: number[] = [];
    for (let i = 1; i < lines.length; i++) {
      const gap = Math.abs(lines[i - 1]!.y - lines[i]!.y);
      if (gap > 2 && gap < 60) gaps.push(gap);
    }
    gaps.sort((a, b) => a - b);
    const medianGap = gaps.length > 0 ? gaps[Math.floor(gaps.length / 2)]! : 14;
    const paragraphGapThreshold = medianGap * 1.48;

    const paragraphs: string[] = [];
    let buffer = lines[0]!.text.trim();

    for (let i = 1; i < lines.length; i++) {
      const prev = lines[i - 1]!;
      const curr = lines[i]!;
      const gap = Math.abs(prev.y - curr.y);
      const currText = curr.text.trim();
      if (!currText) continue;

      const prevEndsSentence = /[.!?:”"»)]$/.test(buffer);
      const isHeadingJump = Math.abs(curr.height - prev.height) > Math.min(curr.height, prev.height) * 0.25;
      const isNewParagraph =
        gap > paragraphGapThreshold ||
        isHeadingJump ||
        (gap > medianGap * 1.18 && prevEndsSentence && /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9“"«—–-]/.test(currText));

      if (isNewParagraph) {
        if (buffer.trim()) paragraphs.push(buffer.replace(/[ \t]+/g, ' ').trim());
        buffer = currText;
      } else if (/(\p{L})-$/u.test(buffer) && /^\p{Ll}/u.test(currText)) {
        // Rejoin hyphenated word across line break
        buffer = buffer.slice(0, -1) + currText;
      } else {
        buffer += ' ' + currText;
      }
    }

    if (buffer.trim()) {
      paragraphs.push(buffer.replace(/[ \t]+/g, ' ').trim());
    }

    cache.set(pageNumber, paragraphs);
    return paragraphs;
  } catch (err) {
    console.warn(`Erro ao extrair parágrafos da página ${pageNumber}:`, err);
    return [];
  }
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
