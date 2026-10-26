import { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Document, Page as PdfPage } from 'react-pdf';
import { X } from 'lucide-react';
import './PageThumbnails.css';

interface PageThumbnailsProps {
  pdfData: ArrayBuffer;
  totalPages: number;
  currentPage: number;
  onSelectPage: (page: number) => void;
  onClose: () => void;
}

const THUMB_WIDTH = 110;
// Largura de 110px em página tipo carta (≈142px de altura) + rótulo e espaçamentos
const ESTIMATED_THUMB_HEIGHT = 176;
const OVERSCAN = 5;

export function PageThumbnails({
  pdfData,
  totalPages,
  currentPage,
  onSelectPage,
  onClose,
}: PageThumbnailsProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const scrolledToCurrentRef = useRef(false);
  const [loaded, setLoaded] = useState(false);

  // Um único Uint8Array: o pdf.js transfere o buffer para o worker no primeiro
  // carregamento, então cada Document com um array compartilhado falhava
  const fileSource = useMemo(() => {
    if (!pdfData) return null;
    return { data: new Uint8Array(pdfData.slice(0)) };
  }, [pdfData]);

  const virtualizer = useVirtualizer({
    count: totalPages,
    getScrollElement: () => listRef.current,
    estimateSize: () => ESTIMATED_THUMB_HEIGHT,
    overscan: OVERSCAN,
  });

  const handleLoadSuccess = useCallback(() => setLoaded(true), []);

  // Ao abrir a lista (depois do documento carregar), deixa a página atual visível
  useEffect(() => {
    if (!loaded || scrolledToCurrentRef.current || totalPages <= 0) return;
    scrolledToCurrentRef.current = true;
    const index = Math.min(Math.max(currentPage - 1, 0), totalPages - 1);
    virtualizer.scrollToIndex(index, { align: 'start' });
  }, [loaded, totalPages, currentPage, virtualizer]);

  return (
    <aside className="thumbnails-sidebar">
      <div className="thumbnails-header">
        <h4>Páginas ({totalPages})</h4>
        <button className="btn btn-ghost btn-icon" onClick={onClose} title="Fechar miniaturas">
          <X size={16} />
        </button>
      </div>

      <div className="thumbnails-list" ref={listRef}>
        {fileSource && (
          <Document
            file={fileSource}
            onLoadSuccess={handleLoadSuccess}
            loading={
              <div className="thumbnails-loading">
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className="thumb-loading" />
                ))}
              </div>
            }
            error={<p className="thumbnails-error">Não foi possível carregar as miniaturas.</p>}
          >
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const pageNumber = virtualRow.index + 1;

                return (
                  <button
                    key={virtualRow.key}
                    data-index={virtualRow.index}
                    ref={virtualizer.measureElement}
                    className={`thumbnail-item ${pageNumber === currentPage ? 'active' : ''}`}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    onClick={() => onSelectPage(pageNumber)}
                  >
                    <div className="thumbnail-preview">
                      <PdfPage
                        pageNumber={pageNumber}
                        width={THUMB_WIDTH}
                        renderAnnotationLayer={false}
                        renderTextLayer={false}
                        loading={<div className="thumb-loading" />}
                        onLoadError={(err) =>
                          console.error(`Erro ao carregar miniatura da página ${pageNumber}:`, err)
                        }
                        onRenderError={(err) =>
                          console.error(
                            `Erro ao renderizar miniatura da página ${pageNumber}:`,
                            err,
                          )
                        }
                      />
                    </div>
                    <span className="thumbnail-num">{pageNumber}</span>
                  </button>
                );
              })}
            </div>
          </Document>
        )}
      </div>
    </aside>
  );
}
