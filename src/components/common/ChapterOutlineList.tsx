import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  CornerDownRight,
  Search,
  X,
} from 'lucide-react';
import type { Chapter } from '@/types';
import { formatChapterPageRange } from '@/services/study-chapters';
import './ChapterOutlineList.css';

export interface ChapterOutlineBadge {
  text: string;
  tone: 'good' | 'mid' | 'low';
}

interface ChapterOutlineListProps {
  chapters: Chapter[];
  activeChapterId?: string | null;
  usedFallback?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  onSelectChapter: (chapter: Chapter) => void;
  getBadge?: (chapter: Chapter) => ChapterOutlineBadge | null | undefined;
}

interface HierarchyNode {
  chapter: Chapter;
  level: number;
  hasChildren: boolean;
  parentIds: string[];
}

const ITEM_HEIGHT = 42;
const OVERSCAN = 8;

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function ChapterOutlineList({
  chapters,
  activeChapterId = null,
  usedFallback = false,
  searchPlaceholder = 'Pesquisar capítulo, subcapítulo ou página...',
  emptyMessage = 'Nenhum capítulo ou subcapítulo encontrado.',
  onSelectChapter,
  getBadge,
}: ChapterOutlineListProps) {
  const [query, setQuery] = useState('');
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set());
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(400);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const didInitialScrollRef = useRef(false);

  // Mapeia cada capítulo com sua lista de ancestrais (parentIds) para controle perfeito de colapso
  const nodes = useMemo<HierarchyNode[]>(() => {
    const result: HierarchyNode[] = [];
    const parentStack: { level: number; id: string }[] = [];

    chapters.forEach((chapter, index) => {
      while (
        parentStack.length > 0 &&
        parentStack[parentStack.length - 1]!.level >= chapter.level
      ) {
        parentStack.pop();
      }

      const parentIds = parentStack.map((p) => p.id);
      const nextChapter = chapters[index + 1];
      const hasChildren = Boolean(
        chapter.hasChildren ?? (nextChapter && nextChapter.level > chapter.level),
      );

      result.push({
        chapter,
        level: chapter.level,
        hasChildren,
        parentIds,
      });

      if (hasChildren) {
        parentStack.push({ level: chapter.level, id: chapter.id });
      }
    });

    return result;
  }, [chapters]);

  const normalizedQuery = useMemo(() => normalizeSearchText(query), [query]);
  const pageQuery = useMemo(() => {
    if (!/^\d+$/.test(normalizedQuery)) return null;
    const num = Number.parseInt(normalizedQuery, 10);
    return Number.isFinite(num) && num > 0 ? num : null;
  }, [normalizedQuery]);

  const isSearching = normalizedQuery.length > 0;

  // Filtra itens visíveis levando em consideração colapso manual e pesquisa
  const visibleNodes = useMemo(() => {
    if (!isSearching) {
      return nodes.filter((node) => {
        // Se qualquer ancestral estiver colapsado, o item fica oculto
        return !node.parentIds.some((parentId) => collapsedIds.has(parentId));
      });
    }

    // Na pesquisa, encontra correspondências diretas
    const directMatches = new Set<string>();
    for (const node of nodes) {
      const titleNorm = normalizeSearchText(node.chapter.title);
      const rangeNorm = normalizeSearchText(formatChapterPageRange(node.chapter));
      const pageMatch =
        pageQuery !== null &&
        pageQuery >= node.chapter.startPage &&
        pageQuery <= node.chapter.endPage;

      if (titleNorm.includes(normalizedQuery) || rangeNorm.includes(normalizedQuery) || pageMatch) {
        directMatches.add(node.chapter.id);
      }
    }

    // Garante que os ancestrais dos itens encontrados fiquem visíveis como contexto
    const visibleIds = new Set<string>(directMatches);
    for (const node of nodes) {
      if (directMatches.has(node.chapter.id)) {
        for (const parentId of node.parentIds) {
          visibleIds.add(parentId);
        }
      }
    }

    return nodes.filter((node) => visibleIds.has(node.chapter.id));
  }, [nodes, isSearching, normalizedQuery, pageQuery, collapsedIds]);

  // Mede a altura do container dinamicamente via ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateHeight = () => {
      if (el.clientHeight > 0) {
        setContainerHeight(el.clientHeight);
      }
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  // Rola até o capítulo ativo na primeira abertura
  useEffect(() => {
    if (didInitialScrollRef.current || !activeChapterId || visibleNodes.length === 0) return;
    const targetIndex = visibleNodes.findIndex((n) => n.chapter.id === activeChapterId);
    if (targetIndex >= 0 && containerRef.current) {
      const targetScroll = Math.max(
        0,
        targetIndex * ITEM_HEIGHT - containerHeight / 2 + ITEM_HEIGHT / 2,
      );
      containerRef.current.scrollTop = targetScroll;
      setScrollTop(targetScroll);
      didInitialScrollRef.current = true;
    }
  }, [activeChapterId, visibleNodes, containerHeight]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const toggleCollapse = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setCollapsedIds(new Set());
  }, []);

  const collapseAll = useCallback(() => {
    const parentIds = new Set<string>();
    for (const node of nodes) {
      if (node.hasChildren) {
        parentIds.add(node.chapter.id);
      }
    }
    setCollapsedIds(parentIds);
  }, [nodes]);

  // Cálculos de virtualização: apenas renderiza os itens visíveis no viewport + margem overscan
  const totalCount = visibleNodes.length;
  const totalHeight = totalCount * ITEM_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(
    totalCount,
    Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT) + OVERSCAN,
  );

  const virtualSlice = useMemo(() => {
    return visibleNodes.slice(startIndex, endIndex).map((node, localIndex) => ({
      ...node,
      virtualIndex: startIndex + localIndex,
      top: (startIndex + localIndex) * ITEM_HEIGHT,
    }));
  }, [visibleNodes, startIndex, endIndex]);

  const anyCollapsed = collapsedIds.size > 0;

  return (
    <div className="chapter-outline-root">
      {/* Barra de pesquisa unificada e controles rápidos */}
      <div className="chapter-outline-top-bar">
        <div className="chapter-outline-search">
          <Search size={14} className="chapter-outline-search-icon" />
          <input
            type="text"
            className="input chapter-outline-search-input"
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Pesquisar no sumário"
          />
          {query && (
            <button
              type="button"
              className="chapter-outline-search-clear"
              onClick={() => setQuery('')}
              title="Limpar pesquisa"
              aria-label="Limpar pesquisa"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="chapter-outline-quick-actions">
          <button
            type="button"
            className="chapter-outline-btn-toggle"
            onClick={anyCollapsed ? expandAll : collapseAll}
            title={anyCollapsed ? 'Expandir todos os subcapítulos' : 'Recolher todos os subcapítulos'}
            aria-label={anyCollapsed ? 'Expandir todos' : 'Recolher todos'}
          >
            {anyCollapsed ? <ChevronsUpDown size={14} /> : <ChevronsDownUp size={14} />}
            <span>{anyCollapsed ? 'Expandir tudo' : 'Recolher tudo'}</span>
          </button>

          <span className="chapter-outline-counter">
            {isSearching
              ? `${visibleNodes.length} ${visibleNodes.length === 1 ? 'resultado' : 'resultados'}`
              : `${chapters.length} ${chapters.length === 1 ? 'item' : 'itens'}`}
          </span>
        </div>
      </div>

      {usedFallback && (
        <p className="chapter-outline-fallback-note">
          Este PDF não possui sumário interno. Dividimos em blocos de 10 páginas.
        </p>
      )}

      {/* Lista com Virtualização completa e Scroll garantido */}
      <div
        className="chapter-outline-list"
        ref={containerRef}
        onScroll={handleScroll}
        tabIndex={0}
        role="tree"
        aria-label="Lista de capítulos"
      >
        {totalCount === 0 ? (
          <div className="chapter-outline-empty">{emptyMessage}</div>
        ) : (
          <div
            className="chapter-outline-virtual-spacer"
            style={{ height: `${totalHeight}px` }}
          >
            {virtualSlice.map((item) => {
              const { chapter, level, hasChildren, top } = item;
              const isMain = level === 0;
              const isCollapsed = collapsedIds.has(chapter.id);
              const isActive = chapter.id === activeChapterId;
              const badge = getBadge?.(chapter);

              // Indentação proporcional ao nível de profundidade
              const indentPadding = isMain ? 10 : 12 + Math.min(level, 3) * 16;

              return (
                <div
                  key={chapter.id}
                  className={`chapter-row-item ${isMain ? 'is-main' : 'is-sub'} ${
                    isActive ? 'is-active' : ''
                  }`}
                  style={{
                    transform: `translateY(${top}px)`,
                    height: `${ITEM_HEIGHT}px`,
                    paddingLeft: `${indentPadding}px`,
                  }}
                  role="treeitem"
                  aria-selected={isActive}
                  aria-expanded={hasChildren ? !isCollapsed : undefined}
                  onClick={() => onSelectChapter(chapter)}
                  title={`${chapter.title} (${formatChapterPageRange(chapter)})`}
                >
                  {/* Botão de colapso ou ícone de hierarquia */}
                  {hasChildren ? (
                    <button
                      type="button"
                      className="chapter-row-toggle-btn"
                      onClick={(e) => toggleCollapse(chapter.id, e)}
                      title={isCollapsed ? 'Expandir subcapítulos' : 'Recolher subcapítulos'}
                      aria-label={isCollapsed ? 'Expandir' : 'Recolher'}
                    >
                      {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                    </button>
                  ) : isMain ? (
                    <span className="chapter-row-icon" aria-hidden="true">
                      <BookOpen size={13} />
                    </span>
                  ) : (
                    <span className="chapter-row-sub-branch" aria-hidden="true">
                      <CornerDownRight size={12} />
                    </span>
                  )}

                  {/* Título do item */}
                  <span className="chapter-row-title">{chapter.title}</span>

                  {/* Informações à direita (Páginas e Badge de acerto) */}
                  <div className="chapter-row-meta">
                    <span className="chapter-row-pages">
                      {formatChapterPageRange(chapter)}
                    </span>
                    {badge && (
                      <span className={`chapter-row-badge ${badge.tone}`}>
                        {badge.text}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
