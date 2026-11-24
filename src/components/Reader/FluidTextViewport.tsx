import { useEffect, useMemo, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { FileText, Highlighter, NotebookPen, Trash2 } from 'lucide-react';
import { extractPageParagraphs } from '@/services/pdf-text';
import { ANNOTATION_COLORS, ANNOTATION_COLOR_ORDER } from '@/lib/colors';
import { useReaderSettingsStore } from '@/stores/useReaderSettingsStore';
import { useTranslation } from '@/stores/useI18nStore';
import type { AnnotationColor, Highlight, LineSpacing } from '@/types';
import './FluidTextViewport.css';

interface FluidTextViewportProps {
  pdf: PDFDocumentProxy | null;
  pageNumber: number;
  fontSize: number;
  lineSpacing: LineSpacing;
  highlights: Highlight[];
  highlighterActive: boolean;
  activeColor: AnnotationColor;
  flashingHighlightId: string | null;
  onCreateFluidHighlight: (payload: {
    paragraphIndex: number;
    startOffset: number;
    endOffset: number;
    quote: string;
    color?: AnnotationColor;
  }) => void;
  onChangeColor: (highlightId: string, color: AnnotationColor) => void;
  onAnnotateHighlight: (highlight: Highlight) => void;
  onDeleteHighlight: (highlightId: string) => void;
  onSwitchToPdf: () => void;
  onEmptyAreaClick?: () => void;
}

const LINE_HEIGHT_MAP: Record<LineSpacing, number> = {
  compact: 1.48,
  comfortable: 1.78,
  wide: 2.12,
};

interface TextSegment {
  text: string;
  highlight?: Highlight;
}

function buildSegments(text: string, paraHighlights: Highlight[]): TextSegment[] {
  if (paraHighlights.length === 0) return [{ text }];

  const sorted = [...paraHighlights]
    .filter(
      (h) =>
        typeof h.startOffset === 'number' &&
        typeof h.endOffset === 'number' &&
        h.endOffset > h.startOffset,
    )
    .sort((a, b) => (a.startOffset ?? 0) - (b.startOffset ?? 0));

  if (sorted.length === 0) return [{ text }];

  const segments: TextSegment[] = [];
  let cursor = 0;

  for (const h of sorted) {
    const start = Math.max(cursor, Math.min(text.length, h.startOffset ?? 0));
    const end = Math.max(start, Math.min(text.length, h.endOffset ?? text.length));
    if (start > cursor) {
      segments.push({ text: text.slice(cursor, start) });
    }
    if (end > start) {
      segments.push({ text: text.slice(start, end), highlight: h });
      cursor = end;
    }
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor) });
  }

  return segments;
}

function getSelectionOffsetsInElement(
  container: HTMLElement,
  range: Range,
): { start: number; end: number; text: string } | null {
  if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) {
    return null;
  }
  const preRange = document.createRange();
  preRange.selectNodeContents(container);
  preRange.setEnd(range.startContainer, range.startOffset);
  // Ignore badge text inside .fluid-hl-num
  const start = getTextLengthExcludingBadges(preRange.cloneContents());
  const selectedText = getTextExcludingBadges(range.cloneContents());
  const end = start + selectedText.length;
  if (selectedText.trim().length < 2) return null;
  return { start, end, text: selectedText.trim() };
}

function getTextExcludingBadges(fragment: DocumentFragment): string {
  const clone = fragment.cloneNode(true) as DocumentFragment;
  clone.querySelectorAll('.fluid-hl-num').forEach((el) => el.remove());
  return clone.textContent ?? '';
}

function getTextLengthExcludingBadges(fragment: DocumentFragment): number {
  return getTextExcludingBadges(fragment).length;
}

export function FluidTextViewport({
  pdf,
  pageNumber,
  fontSize,
  lineSpacing,
  highlights,
  highlighterActive,
  activeColor,
  flashingHighlightId,
  onCreateFluidHighlight,
  onChangeColor,
  onAnnotateHighlight,
  onDeleteHighlight,
  onSwitchToPdf,
  onEmptyAreaClick,
}: FluidTextViewportProps) {
  const { t } = useTranslation();
  const readingTheme = useReaderSettingsStore((s) => s.settings.readingTheme);
  const [paragraphs, setParagraphs] = useState<string[] | null>(null);
  const [selectedHighlightId, setSelectedHighlightId] = useState<string | null>(null);
  const [pendingSelection, setPendingSelection] = useState<{
    paragraphIndex: number;
    startOffset: number;
    endOffset: number;
    quote: string;
    x: number;
    y: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const markRefs = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    if (!pdf) {
      setParagraphs(null);
      return;
    }
    let cancelled = false;
    setParagraphs(null);
    setPendingSelection(null);
    setSelectedHighlightId(null);

    extractPageParagraphs(pdf, pageNumber).then((result) => {
      if (!cancelled) {
        setParagraphs(result);
        if (containerRef.current) {
          containerRef.current.scrollTop = 0;
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [pdf, pageNumber]);

  // Scroll flashing highlight into view
  useEffect(() => {
    if (!flashingHighlightId) return;
    const node = markRefs.current.get(flashingHighlightId);
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [flashingHighlightId, paragraphs]);

  // Close popovers on outside click
  useEffect(() => {
    if (!selectedHighlightId && !pendingSelection) return;
    const handleOutside = () => {
      setSelectedHighlightId(null);
    };
    window.addEventListener('mousedown', handleOutside);
    return () => window.removeEventListener('mousedown', handleOutside);
  }, [selectedHighlightId, pendingSelection]);

  const pageHighlightsByParagraph = useMemo(() => {
    const map = new Map<number, Highlight[]>();
    for (const h of highlights) {
      if (h.pageNumber === pageNumber && h.mode === 'fluid' && h.paragraphIndex !== undefined) {
        const list = map.get(h.paragraphIndex) ?? [];
        list.push(h);
        map.set(h.paragraphIndex, list);
      }
    }
    return map;
  }, [highlights, pageNumber]);

  const handleParagraphMouseUp = (
    e: React.MouseEvent<HTMLParagraphElement>,
    paragraphIndex: number,
    paragraphText: string,
  ) => {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const offsets = getSelectionOffsetsInElement(e.currentTarget, range);
      if (offsets) {
        if (highlighterActive) {
          onCreateFluidHighlight({
            paragraphIndex,
            startOffset: offsets.start,
            endOffset: offsets.end,
            quote: offsets.text,
          });
          selection.removeAllRanges();
          setPendingSelection(null);
          return;
        }
        const rect = range.getBoundingClientRect();
        setPendingSelection({
          paragraphIndex,
          startOffset: offsets.start,
          endOffset: offsets.end,
          quote: offsets.text,
          x: rect.left + rect.width / 2,
          y: Math.max(64, rect.top - 48),
        });
        return;
      }
    }

    setPendingSelection(null);

    // If highlighter pen is active and user simply clicked a paragraph (no drag selection), highlight that paragraph
    if (highlighterActive && paragraphText.trim().length > 0) {
      onCreateFluidHighlight({
        paragraphIndex,
        startOffset: 0,
        endOffset: paragraphText.length,
        quote: paragraphText.slice(0, 260),
      });
    }
  };

  const selectedHighlight = useMemo(
    () => highlights.find((h) => h.id === selectedHighlightId) ?? null,
    [highlights, selectedHighlightId],
  );

  return (
    <div
      ref={containerRef}
      className={`fluid-viewport ${highlighterActive ? 'is-highlighter-on' : ''}`}
      data-reading-theme={readingTheme}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setPendingSelection(null);
          onEmptyAreaClick?.();
        }
      }}
    >
      {paragraphs === null ? (
        <div className="reader-loading">
          <div className="spinner" />
          <p>{t('reader.loadingText')}</p>
        </div>
      ) : paragraphs.length === 0 ? (
        <div className="fluid-empty">
          <FileText size={40} />
          <p>{t('reader.noTextOnPage')}</p>
          <button type="button" className="btn btn-secondary" onClick={onSwitchToPdf}>
            {t('reader.modePdf')}
          </button>
        </div>
      ) : (
        <article
          className="fluid-article"
          style={{
            fontSize: `${fontSize}px`,
            lineHeight: LINE_HEIGHT_MAP[lineSpacing],
          }}
        >
          {highlighterActive && (
            <div className="fluid-highlighter-banner">
              <Highlighter size={14} style={{ color: ANNOTATION_COLORS[activeColor].hex }} />
              <span>{t('highlight.fluidHint')}</span>
            </div>
          )}

          {paragraphs.map((paragraph, pIdx) => {
            const pHighlights = pageHighlightsByParagraph.get(pIdx) ?? [];
            const segments = buildSegments(paragraph, pHighlights);

            return (
              <p
                key={`${pageNumber}-${pIdx}`}
                className={`fluid-paragraph ${highlighterActive ? 'can-tap-highlight' : ''}`}
                onMouseUp={(e) => handleParagraphMouseUp(e, pIdx, paragraph)}
              >
                {segments.map((seg, sIdx) => {
                  if (!seg.highlight) {
                    return <span key={sIdx}>{seg.text}</span>;
                  }
                  const h = seg.highlight;
                  const meta = ANNOTATION_COLORS[h.color] ?? ANNOTATION_COLORS.amber;
                  const isFlashing = flashingHighlightId === h.id;
                  return (
                    <mark
                      key={`${h.id}-${sIdx}`}
                      ref={(el) => {
                        if (el) markRefs.current.set(h.id, el);
                        else markRefs.current.delete(h.id);
                      }}
                      className={`fluid-mark ${isFlashing ? 'is-flashing' : ''}`}
                      style={{
                        backgroundColor: meta.fill,
                        borderBottomColor: meta.border,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPendingSelection(null);
                        setSelectedHighlightId((prev) => (prev === h.id ? null : h.id));
                      }}
                      title={`#${h.number} · ${t(`annotation.${h.color}`)}`}
                    >
                      <span
                        className="fluid-hl-num"
                        style={{ backgroundColor: meta.hex }}
                      >
                        #{h.number}
                      </span>
                      {seg.text}
                    </mark>
                  );
                })}
              </p>
            );
          })}
        </article>
      )}

      {/* Floating action bar when text is selected in Fluid Text mode */}
      {pendingSelection && (
        <div
          className="fluid-selection-toolbar"
          style={{
            left: `${Math.min(Math.max(pendingSelection.x, 120), window.innerWidth - 160)}px`,
            top: `${pendingSelection.y}px`,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {ANNOTATION_COLOR_ORDER.map((c) => (
            <button
              key={c}
              type="button"
              className="highlight-color-dot"
              style={{ backgroundColor: ANNOTATION_COLORS[c].hex }}
              title={`${t('reader.highlighter')}: ${t(`annotation.${c}`)}`}
              onClick={() => {
                onCreateFluidHighlight({
                  paragraphIndex: pendingSelection.paragraphIndex,
                  startOffset: pendingSelection.startOffset,
                  endOffset: pendingSelection.endOffset,
                  quote: pendingSelection.quote,
                  color: c,
                });
                window.getSelection()?.removeAllRanges();
                setPendingSelection(null);
              }}
            />
          ))}
        </div>
      )}

      {/* Floating edit popover for clicked Fluid highlight */}
      {selectedHighlight && (
        <div
          className="fluid-edit-floating"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <span
            className="fluid-edit-badge"
            style={{ backgroundColor: ANNOTATION_COLORS[selectedHighlight.color].hex }}
          >
            #{selectedHighlight.number} · {t(`annotation.${selectedHighlight.color}`)}
          </span>
          <div className="highlight-quick-colors">
            {ANNOTATION_COLOR_ORDER.map((c) => (
              <button
                key={c}
                type="button"
                className={`highlight-color-dot ${selectedHighlight.color === c ? 'active' : ''}`}
                style={{ backgroundColor: ANNOTATION_COLORS[c].hex }}
                onClick={() => {
                  onChangeColor(selectedHighlight.id, c);
                  setSelectedHighlightId(null);
                }}
                title={t(`annotation.${c}`)}
              />
            ))}
          </div>
          <button
            type="button"
            className="highlight-quick-btn"
            onClick={() => {
              onAnnotateHighlight(selectedHighlight);
              setSelectedHighlightId(null);
            }}
          >
            <NotebookPen size={13} />
            <span>{t('highlight.writeNote')}</span>
          </button>
          <button
            type="button"
            className="highlight-quick-btn danger"
            onClick={() => {
              onDeleteHighlight(selectedHighlight.id);
              setSelectedHighlightId(null);
            }}
            title={t('highlight.remove')}
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
