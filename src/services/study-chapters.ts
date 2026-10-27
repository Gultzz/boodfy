import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { Chapter } from '@/types';

const FALLBACK_BLOCK_SIZE = 10;
const MAX_CHAPTERS = 400;

interface RawOutlineNode {
  title?: string;
  dest?: string | unknown[] | null;
  items?: RawOutlineNode[] | null;
}

interface FlatEntry {
  title: string;
  page: number;
  level: number;
}

export interface ChapterBuildResult {
  chapters: Chapter[];
  signature: string;
  /** true quando o PDF não tem sumário e usamos blocos de páginas */
  fallback: boolean;
}

/** Cache em memória por documento PDF carregado */
const chaptersCache = new WeakMap<PDFDocumentProxy, ChapterBuildResult>();

/** Hash simples e estável, usado nos ids e na assinatura do sumário */
function hashString(value: string): string {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) + hash + value.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

function cleanTitle(title: string | undefined, page: number): string {
  const cleaned = (title ?? '')
    .replace(/\s+/g, ' ')
    .replace(/[\s.·]+$/, '')
    .trim();
  return cleaned.length > 0 ? cleaned.slice(0, 140) : `Seção da página ${page}`;
}

/**
 * Resolve o destino de um item do sumário em número de página.
 * O destino pode ser nomeado (string) ou explícito (array com a referência da página).
 */
async function resolvePage(
  pdf: PDFDocumentProxy,
  dest: string | unknown[] | null | undefined,
): Promise<number | null> {
  try {
    if (!dest) return null;
    let target: unknown[] | null = null;
    if (typeof dest === 'string') {
      target = await pdf.getDestination(dest);
    } else if (Array.isArray(dest)) {
      target = dest;
    }
    if (!target || target.length === 0) return null;
    const ref = target[0];
    if (!ref || typeof ref !== 'object') return null;
    const index = await pdf.getPageIndex(ref as { num: number; gen: number });
    return index + 1;
  } catch (err) {
    console.warn('Não foi possível resolver um item do sumário:', err);
    return null;
  }
}

async function flattenOutline(
  pdf: PDFDocumentProxy,
  nodes: RawOutlineNode[],
  level: number,
): Promise<FlatEntry[]> {
  const resolvedNodes = await Promise.all(
    nodes.map(async (node) => {
      const [page, children] = await Promise.all([
        resolvePage(pdf, node.dest),
        node.items && node.items.length > 0
          ? flattenOutline(pdf, node.items, level + 1)
          : Promise.resolve([] as FlatEntry[]),
      ]);
      const result: FlatEntry[] = [];
      if (page !== null) {
        result.push({ title: cleanTitle(node.title, page), page, level });
      }
      if (children.length > 0) {
        result.push(...children);
      }
      return result;
    }),
  );

  return resolvedNodes.flat();
}

/** Capítulos de reserva quando o PDF não traz sumário: blocos de 10 páginas */
function buildFallbackChapters(totalPages: number): Chapter[] {
  const chapters: Chapter[] = [];
  for (let start = 1; start <= totalPages; start += FALLBACK_BLOCK_SIZE) {
    const end = Math.min(start + FALLBACK_BLOCK_SIZE - 1, totalPages);
    chapters.push({
      id: `bloco-${start}-${end}`,
      title: `Páginas ${start}–${end}`,
      startPage: start,
      endPage: end,
      level: 0,
    });
  }
  return chapters;
}

export function makeChaptersSignature(totalPages: number, chapters: Chapter[]): string {
  const body = chapters
    .map((c) => `${c.startPage}-${c.endPage}-${c.level}-${c.title}`)
    .join('|');
  return `${totalPages}#${hashString(body)}`;
}

/**
 * Monta os capítulos a partir do sumário nativo do PDF, preservando todos os níveis.
 * Sem sumário, cai para blocos de 10 páginas.
 */
export async function buildChapters(
  pdf: PDFDocumentProxy,
  totalPages: number,
): Promise<ChapterBuildResult> {
  const cached = chaptersCache.get(pdf);
  if (cached) {
    return cached;
  }

  let entries: FlatEntry[] = [];

  try {
    const outline = (await pdf.getOutline()) as RawOutlineNode[] | null;
    if (outline && outline.length > 0) {
      entries = await flattenOutline(pdf, outline, 0);
    }
  } catch (err) {
    console.warn('Não foi possível ler o sumário para montar os capítulos:', err);
    entries = [];
  }

  entries = entries
    .filter((entry) => entry.page >= 1 && entry.page <= totalPages)
    .slice(0, MAX_CHAPTERS);

  if (entries.length === 0) {
    const chapters = totalPages > 0 ? buildFallbackChapters(totalPages) : [];
    const fallbackResult: ChapterBuildResult = {
      chapters,
      signature: makeChaptersSignature(totalPages, chapters),
      fallback: true,
    };
    chaptersCache.set(pdf, fallbackResult);
    return fallbackResult;
  }

  const chapters: Chapter[] = [];
  const seenIds = new Set<string>();

  entries.forEach((entry, index) => {
    let endPage = totalPages;
    for (let next = index + 1; next < entries.length; next++) {
      const candidate = entries[next] as FlatEntry;
      if (candidate.level <= entry.level) {
        endPage = candidate.page - 1;
        break;
      }
    }
    if (endPage < entry.page) endPage = entry.page;

    const id = `${entry.page}-${hashString(entry.title.toLowerCase())}`;
    if (seenIds.has(id)) return;
    seenIds.add(id);

    chapters.push({
      id,
      title: entry.title,
      startPage: entry.page,
      endPage,
      level: entry.level,
    });
  });

  if (chapters.length === 0) {
    const fallbackChapters = totalPages > 0 ? buildFallbackChapters(totalPages) : [];
    const fallbackResult: ChapterBuildResult = {
      chapters: fallbackChapters,
      signature: makeChaptersSignature(totalPages, fallbackChapters),
      fallback: true,
    };
    chaptersCache.set(pdf, fallbackResult);
    return fallbackResult;
  }

  const finalResult: ChapterBuildResult = {
    chapters,
    signature: makeChaptersSignature(totalPages, chapters),
    fallback: false,
  };
  chaptersCache.set(pdf, finalResult);
  return finalResult;
}
