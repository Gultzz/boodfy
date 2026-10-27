import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { Chapter } from '@/types';

const FALLBACK_BLOCK_SIZE = 10;
const MAX_CHAPTERS = 50000;
const MAX_HIERARCHY_LEVEL = 3;
const SIGNATURE_VERSION = 'v3';

interface RawOutlineNode {
  title?: string;
  dest?: string | unknown[] | null;
  items?: RawOutlineNode[] | null;
}

interface ResolvedOutlineNode {
  title: string;
  page: number;
  originalIndex: number;
  children: ResolvedOutlineNode[];
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

/**
 * Limpa o título do capítulo/subcapítulo removendo caracteres de controle,
 * linhas pontilhadas de sumário ("... 42") e espaços duplicados.
 */
function cleanTitle(title: string | undefined, page: number): string {
  const cleaned = (title ?? '')
    .replace(/\p{Cc}+/gu, ' ')
    .replace(/\s+/g, ' ')
    .replace(/(?:\s*[.·•…]{2,}\s*\d*\s*|\s+[.·•…]+\s*)$/u, '')
    .trim();
  return cleaned.length > 0 ? cleaned.slice(0, 140) : `Seção da página ${page}`;
}

/**
 * Formatação unificada de intervalo de páginas usada no Sumário e no Modo Estudante.
 */
export function formatChapterPageRange(
  chapter: Pick<Chapter, 'startPage' | 'endPage'>,
): string {
  return `pp. ${chapter.startPage}–${chapter.endPage}`;
}

/**
 * Retorna o capítulo ou subcapítulo mais específico que contém a página informada.
 */
export function chapterForPage(chapters: Chapter[], page: number): Chapter | undefined {
  return chapters
    .filter((chapter) => page >= chapter.startPage && page <= chapter.endPage)
    .sort((a, b) => b.level - a.level || b.startPage - a.startPage)[0];
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
    if (typeof ref === 'number') return ref + 1;
    if (!ref || typeof ref !== 'object') return null;
    const index = await pdf.getPageIndex(ref as { num: number; gen: number });
    return index + 1;
  } catch (err) {
    console.warn('Não foi possível resolver um item do sumário:', err);
    return null;
  }
}

/**
 * Desembrulha nós raiz únicos que apenas agrupam o livro inteiro
 * (ex.: um nó com o título do livro contendo todos os capítulos dentro de `items`).
 */
function unwrapSingleRootNodes(nodes: RawOutlineNode[]): RawOutlineNode[] {
  let current = nodes;
  while (
    current.length === 1 &&
    current[0]?.items &&
    Array.isArray(current[0].items) &&
    current[0].items.length > 1
  ) {
    current = current[0].items;
  }
  return current;
}

/**
 * Resolve recursivamente a árvore do sumário preservando a relação Pai -> Filhos
 * e garantindo ordenação crescente por página entre irmãos do mesmo nível.
 */
async function resolveOutlineTree(
  pdf: PDFDocumentProxy,
  nodes: RawOutlineNode[],
  totalPages: number,
): Promise<ResolvedOutlineNode[]> {
  const resolved = await Promise.all(
    nodes.map(async (node, originalIndex): Promise<ResolvedOutlineNode | null> => {
      const [rawPage, children] = await Promise.all([
        resolvePage(pdf, node.dest),
        node.items && node.items.length > 0
          ? resolveOutlineTree(pdf, node.items, totalPages)
          : Promise.resolve([] as ResolvedOutlineNode[]),
      ]);

      const validPage =
        rawPage !== null && rawPage >= 1 && rawPage <= totalPages ? rawPage : null;
      const effectivePage = validPage ?? (children.length > 0 ? children[0]!.page : null);

      if (effectivePage === null) {
        return null;
      }

      const normalizedChildren = children.map((child) => ({
        ...child,
        page: Math.max(effectivePage, child.page),
      }));

      return {
        title: cleanTitle(node.title, effectivePage),
        page: effectivePage,
        originalIndex,
        children: normalizedChildren,
      };
    }),
  );

  const validNodes = resolved.filter((node): node is ResolvedOutlineNode => node !== null);

  validNodes.sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page;
    return a.originalIndex - b.originalIndex;
  });

  return validNodes;
}

function flattenResolvedTree(
  nodes: ResolvedOutlineNode[],
  level: number,
  acc: FlatEntry[] = [],
): FlatEntry[] {
  for (const node of nodes) {
    acc.push({
      title: node.title,
      page: node.page,
      level,
    });
    if (node.children.length > 0) {
      flattenResolvedTree(node.children, level + 1, acc);
    }
  }
  return acc;
}

/**
 * Identifica prefixos numéricos hierárquicos no título (ex.: "1.2", "1.2.1", "2.1 - Introdução").
 * Retorna a lista de segmentos numéricos ou null quando não houver.
 */
function extractNumericPrefix(title: string): string[] | null {
  const match = title.match(
    /^\s*(?:(?:cap[íi]tulo|chapter|se[çc][ãa]o|section|parte|part|unidade|m[óo]dulo)\s+)?(\d{1,3}(?:\.\d{1,3})+)(?=\s|[.:\-–—)]|$)/i,
  );
  if (match?.[1]) {
    return match[1].split('.');
  }
  const singleMatch = title.match(/^\s*(\d{1,3})(?:\s*[.:\-–—)]\s+|\s+[A-ZÀ-Ú])/);
  if (singleMatch?.[1]) {
    return [singleMatch[1]];
  }
  return null;
}

const MAIN_HEADING_REGEX =
  /^\s*(?:cap[íi]tulo|chapter|parte|part|unidade|m[óo]dulo|livro|book)\s+(?:\d+|[ivxlcdm]+|[a-z])\b/i;

const TOP_LEVEL_MATTER_REGEX =
  /^\s*(?:capa|folha de rosto|sum[áa]rio|contents|table of contents|[íi]ndice|pref[áa]cio|foreword|apresenta[çc][ãa]o|introdu[çc][ãa]o|pr[óo]logo|ep[íi]logo|conclus[ãa]o|refer[êe]ncias|bibliografia|ap[êe]ndice|anexo|gloss[áa]rio|agradecimentos|dedicat[óo]ria|sobre o autor|posf[áa]cio)\b/i;

/**
 * Refina e normaliza os níveis de capítulos (level = 0) e subcapítulos (level >= 1),
 * inclusive quando o PDF possui um sumário originalmente plano (todos os itens em level 0)
 * mas com numeração de seções ("1.1", "1.2", "Capítulo 1", etc.).
 */
function normalizeHierarchyLevels(entries: FlatEntry[]): FlatEntry[] {
  if (entries.length === 0) return [];

  const result = entries.map((entry) => ({ ...entry }));
  const allFlat = result.every((entry) => entry.level === 0);

  if (allFlat && result.length > 1) {
    const hasDottedSubchapters = result.some((entry) => {
      const prefix = extractNumericPrefix(entry.title);
      return prefix !== null && prefix.length >= 2;
    });

    const hasExplicitMainHeadings = result.some((entry) =>
      MAIN_HEADING_REGEX.test(entry.title),
    );

    if (hasDottedSubchapters) {
      let seenMainChapter = false;
      for (const entry of result) {
        const prefix = extractNumericPrefix(entry.title);
        if (prefix && prefix.length >= 2) {
          entry.level = Math.min(prefix.length - 1, MAX_HIERARCHY_LEVEL);
          seenMainChapter = true;
        } else if (
          MAIN_HEADING_REGEX.test(entry.title) ||
          TOP_LEVEL_MATTER_REGEX.test(entry.title) ||
          (prefix && prefix.length === 1)
        ) {
          entry.level = 0;
          seenMainChapter = true;
        } else if (seenMainChapter) {
          entry.level = 1;
        }
      }
    } else if (hasExplicitMainHeadings) {
      let insideMainChapter = false;
      for (const entry of result) {
        if (MAIN_HEADING_REGEX.test(entry.title)) {
          entry.level = 0;
          insideMainChapter = true;
        } else if (TOP_LEVEL_MATTER_REGEX.test(entry.title)) {
          entry.level = 0;
          insideMainChapter = false;
        } else if (insideMainChapter) {
          entry.level = 1;
        }
      }
    }
  } else {
    // Mesmo em sumários já aninhados, refina irmãos de mesmo nível com numeração "1.1" -> "1.1.1"
    for (let i = 1; i < result.length; i++) {
      const current = result[i]!;
      const prev = result[i - 1]!;
      const currPrefix = extractNumericPrefix(current.title);
      const prevPrefix = extractNumericPrefix(prev.title);
      if (
        currPrefix &&
        prevPrefix &&
        currPrefix.length > prevPrefix.length &&
        currPrefix.slice(0, prevPrefix.length).join('.') === prevPrefix.join('.') &&
        current.level <= prev.level
      ) {
        current.level = Math.min(prev.level + 1, MAX_HIERARCHY_LEVEL);
      }
    }
  }

  // Normaliza para que o menor nível seja sempre 0 e sem saltos abruptos (> +1)
  const minLevel = Math.min(...result.map((entry) => entry.level));
  let prevLevel = 0;

  return result.map((entry, idx) => {
    const shifted = Math.max(0, entry.level - minLevel);
    const clamped =
      idx === 0 ? 0 : Math.min(shifted, prevLevel + 1, MAX_HIERARCHY_LEVEL);
    prevLevel = clamped;
    return {
      ...entry,
      level: clamped,
    };
  });
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
      hasChildren: false,
    });
  }
  return chapters;
}

export function makeChaptersSignature(totalPages: number, chapters: Chapter[]): string {
  const body = chapters
    .map((c) => `${c.startPage}-${c.endPage}-${c.level}-${c.title}`)
    .join('|');
  return `${SIGNATURE_VERSION}:${totalPages}#${hashString(body)}`;
}

/**
 * Monta os capítulos e subcapítulos a partir do sumário nativo do PDF,
 * preservando e normalizando a hierarquia, formatação e ordenação.
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
      const rootNodes = unwrapSingleRootNodes(outline);
      const resolvedTree = await resolveOutlineTree(pdf, rootNodes, totalPages);
      entries = flattenResolvedTree(resolvedTree, 0);
    }
  } catch (err) {
    console.warn('Não foi possível ler o sumário para montar os capítulos:', err);
    entries = [];
  }

  entries = entries
    .filter((entry) => entry.page >= 1 && entry.page <= totalPages)
    .slice(0, MAX_CHAPTERS);

  // Remove duplicatas exatas na mesma página mantendo a primeira ocorrência
  const dedupedEntries: FlatEntry[] = [];
  const seenPageTitles = new Set<string>();
  for (const entry of entries) {
    const key = `${entry.page}:${entry.title.toLowerCase()}`;
    if (seenPageTitles.has(key)) continue;
    seenPageTitles.add(key);
    dedupedEntries.push(entry);
  }

  const normalizedEntries = normalizeHierarchyLevels(dedupedEntries);

  if (normalizedEntries.length === 0) {
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
  const parentStack: { level: number; id: string }[] = [];

  normalizedEntries.forEach((entry, index) => {
    let endPage = totalPages;
    for (let next = index + 1; next < normalizedEntries.length; next++) {
      const candidate = normalizedEntries[next]!;
      if (candidate.level <= entry.level) {
        endPage = candidate.page - 1;
        break;
      }
    }
    if (endPage < entry.page) endPage = entry.page;

    const baseId = `${entry.page}-${hashString(entry.title.toLowerCase())}`;
    const id = seenIds.has(baseId) ? `${baseId}-${index}` : baseId;
    seenIds.add(id);

    const nextEntry = normalizedEntries[index + 1];
    const hasChildren = Boolean(nextEntry && nextEntry.level > entry.level);

    while (
      parentStack.length > 0 &&
      parentStack[parentStack.length - 1]!.level >= entry.level
    ) {
      parentStack.pop();
    }
    const parentId =
      entry.level > 0 && parentStack.length > 0
        ? parentStack[parentStack.length - 1]!.id
        : undefined;

    parentStack.push({ level: entry.level, id });

    chapters.push({
      id,
      title: entry.title,
      startPage: entry.page,
      endPage,
      level: entry.level,
      parentId,
      hasChildren,
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
