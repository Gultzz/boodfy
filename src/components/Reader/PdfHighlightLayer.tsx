import { useEffect, useRef, useState } from 'react';
import { Trash2, NotebookPen } from 'lucide-react';
import { ANNOTATION_COLORS, ANNOTATION_COLOR_ORDER } from '@/lib/colors';
import { useTranslation } from '@/stores/useI18nStore';
import type { AnnotationColor, Highlight, HighlightRect } from '@/types';

interface PdfHighlightLayerProps {
  pageNumber: number;
  highlights: Highlight[];
  highlighterActive: boolean;
  activeColor: AnnotationColor;
  flashingHighlightId: string | null;
  onCreateHighlight: (rect: HighlightRect) => void;
  onChangeColor: (highlightId: string, color: AnnotationColor) => void;
  onAnnotateHighlight: (highlight: Highlight) => void;
  onDeleteHighlight: (highlightId: string) => void;
}

export function PdfHighlightLayer({
  pageNumber,
  highlights,
  highlighterActive,
  activeColor,
  flashingHighlightId,
  onCreateHighlight,
  onChangeColor,
  onAnnotateHighlight,
  onDeleteHighlight,
}: PdfHighlightLayerProps) {
  const { t } = useTranslation();
  const layerRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<HighlightRect | null>(null);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const flashRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const pageHighlights = highlights.filter(
    (h) => h.pageNumber === pageNumber && h.mode === 'pdf' && h.rect,
  );

  // Scroll flashing highlight into view smoothly
  useEffect(() => {
    if (!flashingHighlightId) return;
    const node = flashRefs.current.get(flashingHighlightId);
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }
  }, [flashingHighlightId]);

  // Close popover on click outside
  useEffect(() => {
    if (!selectedId) return;
    const handleOutside = () => setSelectedId(null);
    window.addEventListener('mousedown', handleOutside);
    return () => window.removeEventListener('mousedown', handleOutside);
  }, [selectedId]);

  const toNormalized = (clientX: number, clientY: number) => {
    const el = layerRef.current;
    if (!el) return { x: 0, y: 0 };
    const bounds = el.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (clientX - bounds.left) / Math.max(bounds.width, 1)));
    const y = Math.min(1, Math.max(0, (clientY - bounds.top) / Math.max(bounds.height, 1)));
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!highlighterActive || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(null);
    const pt = toNormalized(e.clientX, e.clientY);
    startPointRef.current = pt;
    setDraft({ x: pt.x, y: pt.y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!highlighterActive || !startPointRef.current) return;
    const curr = toNormalized(e.clientX, e.clientY);
    const start = startPointRef.current;
    const x = Math.min(start.x, curr.x);
    const y = Math.min(start.y, curr.y);
    const width = Math.abs(curr.x - start.x);
    const height = Math.abs(curr.y - start.y);
    setDraft({ x, y, width, height });
  };

  const finishDrag = () => {
    if (!startPointRef.current) return;
    startPointRef.current = null;
    if (draft && draft.width >= 0.012 && draft.height >= 0.008) {
      onCreateHighlight(draft);
    }
    setDraft(null);
  };

  const activeMeta = ANNOTATION_COLORS[activeColor];

  return (
    <div
      ref={layerRef}
      className={`pdf-highlight-layer ${highlighterActive ? 'is-drawing' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={finishDrag}
      onMouseLeave={finishDrag}
    >
      {pageHighlights.map((h) => {
        if (!h.rect) return null;
        const meta = ANNOTATION_COLORS[h.color] ?? ANNOTATION_COLORS.amber;
        const isFlashing = flashingHighlightId === h.id;
        const isSelected = selectedId === h.id;

        return (
          <div
            key={h.id}
            ref={(el) => {
              if (el) flashRefs.current.set(h.id, el);
              else flashRefs.current.delete(h.id);
            }}
            className={`pdf-highlight-box ${isFlashing ? 'is-flashing' : ''} ${isSelected ? 'is-selected' : ''}`}
            style={{
              left: `${h.rect.x * 100}%`,
              top: `${h.rect.y * 100}%`,
              width: `${h.rect.width * 100}%`,
              height: `${h.rect.height * 100}%`,
              backgroundColor: meta.fill,
              borderColor: isSelected || isFlashing ? meta.border : 'transparent',
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedId((prev) => (prev === h.id ? null : h.id));
            }}
            title={`#${h.number} · ${t(`annotation.${h.color}`)}`}
          >
            <span
              className="pdf-highlight-num"
              style={{ backgroundColor: meta.hex }}
            >
              #{h.number}
            </span>

            {isSelected && (
              <div
                className="highlight-quick-popover"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="highlight-quick-colors">
                  {ANNOTATION_COLOR_ORDER.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`highlight-color-dot ${h.color === c ? 'active' : ''}`}
                      style={{ backgroundColor: ANNOTATION_COLORS[c].hex }}
                      onClick={() => {
                        onChangeColor(h.id, c);
                        setSelectedId(null);
                      }}
                      title={t(`annotation.${c}`)}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  className="highlight-quick-btn"
                  onClick={() => {
                    onAnnotateHighlight(h);
                    setSelectedId(null);
                  }}
                  title={t('highlight.writeNote')}
                >
                  <NotebookPen size={13} />
                  <span>{t('highlight.writeNote')}</span>
                </button>
                <button
                  type="button"
                  className="highlight-quick-btn danger"
                  onClick={() => {
                    onDeleteHighlight(h.id);
                    setSelectedId(null);
                  }}
                  title={t('highlight.remove')}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )}
          </div>
        );
      })}

      {draft && draft.width > 0 && draft.height > 0 && (
        <div
          className="pdf-highlight-draft"
          style={{
            left: `${draft.x * 100}%`,
            top: `${draft.y * 100}%`,
            width: `${draft.width * 100}%`,
            height: `${draft.height * 100}%`,
            backgroundColor: activeMeta.fill,
            borderColor: activeMeta.border,
          }}
        />
      )}
    </div>
  );
}
