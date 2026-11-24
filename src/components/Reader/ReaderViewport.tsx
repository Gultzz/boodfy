import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { Document, Page as PdfPage } from 'react-pdf';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { AlertCircle } from 'lucide-react';
import { PdfHighlightLayer } from './PdfHighlightLayer';
import { useReaderSettingsStore } from '@/stores/useReaderSettingsStore';
import { useTranslation } from '@/stores/useI18nStore';
import type { AnnotationColor, FitMode, Highlight, HighlightRect } from '@/types';

/** Espaço entre as duas páginas do modo de página dupla (px) */
const SPREAD_GAP = 16;

interface ReaderViewportProps {
  pdfData: ArrayBuffer | null;
  pages: number[];
  loading: boolean;
  error: string | null;
  fitMode: FitMode;
  zoom: number;
  highlights: Highlight[];
  highlighterActive: boolean;
  activeHighlightColor: AnnotationColor;
  flashingHighlightId: string | null;
  onCreateHighlight: (pageNumber: number, rect: HighlightRect) => void;
  onChangeHighlightColor: (highlightId: string, color: AnnotationColor) => void;
  onAnnotateHighlight: (highlight: Highlight) => void;
  onDeleteHighlight: (highlightId: string) => void;
  onDocumentLoadSuccess: (numPages: number) => void;
  onDocumentReady?: (pdf: PDFDocumentProxy) => void;
  onBack: () => void;
  onEmptyAreaClick?: () => void;
}

interface PageSizing {
  width?: number;
  height?: number;
  scale?: number;
}

export function ReaderViewport({
  pdfData,
  pages,
  loading,
  error,
  fitMode,
  zoom,
  highlights,
  highlighterActive,
  activeHighlightColor,
  flashingHighlightId,
  onCreateHighlight,
  onChangeHighlightColor,
  onAnnotateHighlight,
  onDeleteHighlight,
  onDocumentLoadSuccess,
  onDocumentReady,
  onBack,
  onEmptyAreaClick,
}: ReaderViewportProps) {
  const { t } = useTranslation();
  const readingTheme = useReaderSettingsStore((s) => s.settings.readingTheme);

  const containerRef = useRef<HTMLDivElement>(null);
  const [pageWidth, setPageWidth] = useState<number | null>(null);
  const [pageHeight, setPageHeight] = useState<number | null>(null);
  const [pageAspect, setPageAspect] = useState<number | null>(null);

  // Safely clone ArrayBuffer so worker transfer does not neuter original data across renders
  const fileSource = useMemo(() => {
    if (!pdfData) return null;
    return { data: new Uint8Array(pdfData.slice(0)) };
  }, [pdfData]);

  // A new document means a new aspect ratio to measure
  useEffect(() => {
    setPageAspect(null);
  }, [fileSource]);

  // Measure the document (page 1) so two pages can be fitted side by side
  const handleDocumentLoadSuccess = useCallback(
    (pdf: PDFDocumentProxy) => {
      onDocumentLoadSuccess(pdf.numPages);
      onDocumentReady?.(pdf);
      pdf
        .getPage(1)
        .then((page) => {
          const viewport = page.getViewport({ scale: 1 });
          setPageAspect(viewport.width / viewport.height);
        })
        .catch((err) => {
          console.error('Erro ao medir o tamanho das páginas do PDF:', err);
          setPageAspect(0.7071);
        });
    },
    [onDocumentLoadSuccess, onDocumentReady],
  );

  // Handle container resize to adjust page scale
  const updateDimensions = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    if (clientWidth > 48 && clientHeight > 48) {
      setPageWidth(clientWidth - 48);
      setPageHeight(clientHeight - 48);
    }
  }, []);

  useLayoutEffect(() => {
    updateDimensions();
  }, [updateDimensions]);

  useEffect(() => {
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [updateDimensions]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(updateDimensions);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateDimensions]);

  // Reset scroll whenever the visible spread changes
  const pagesKey = pages.join(',');
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [pagesKey]);

  const isSpread = pages.length > 1;

  const sizing = useMemo<PageSizing | null>(() => {
    if (isSpread) {
      if (fitMode === 'manual') return { scale: zoom };
      if (pageAspect === null || !pageWidth || !pageHeight) return null;
      const boxWidth = Math.max((pageWidth - SPREAD_GAP) / 2, 100);
      if (fitMode === 'width') return { width: Math.max(boxWidth * zoom, 100) };
      const height = Math.min(pageHeight * zoom, boxWidth / pageAspect);
      return { width: Math.max(height * pageAspect, 100) };
    }
    return {
      width: fitMode === 'width' && pageWidth ? Math.max(pageWidth * zoom, 100) : undefined,
      height: fitMode === 'height' && pageHeight ? Math.max(pageHeight * zoom, 100) : undefined,
      scale: fitMode === 'manual' ? zoom : undefined,
    };
  }, [isSpread, fitMode, zoom, pageWidth, pageHeight, pageAspect]);

  const themeFilterClass =
    readingTheme === 'dark'
      ? 'pdf-adapt-dark'
      : readingTheme === 'sepia'
        ? 'pdf-adapt-sepia'
        : '';

  return (
    <div
      className="reader-viewport"
      ref={containerRef}
      onClick={(e) => {
        if (e.target === e.currentTarget && !highlighterActive) {
          onEmptyAreaClick?.();
        }
      }}
    >
      {loading && (
        <div className="reader-loading">
          <div className="spinner" />
          <p>{t('reader.loadingDoc')}</p>
        </div>
      )}

      {error && (
        <div className="reader-error">
          <AlertCircle size={48} className="error-icon" />
          <h3>Não foi possível abrir o arquivo</h3>
          <p>{error}</p>
          <button className="btn btn-secondary" onClick={onBack}>
            {t('reader.backToLibrary')}
          </button>
        </div>
      )}

      {!loading && !error && fileSource && (
        <div className={`pdf-page-wrapper${isSpread ? ' pdf-spread' : ''}`}>
          <Document
            file={fileSource}
            onLoadSuccess={handleDocumentLoadSuccess}
            onLoadError={(err) => console.error('Erro ao carregar documento PDF:', err)}
            loading={
              <div className="spinner-container">
                <div className="spinner" />
              </div>
            }
          >
            {sizing ? (
              pages.map((pageNumber) => (
                <div
                  key={`page-${pageNumber}`}
                  className="pdf-page-stage"
                  data-reading-theme={readingTheme}
                >
                  <div className={`pdf-page-canvas-wrap ${themeFilterClass}`}>
                    <PdfPage
                      pageNumber={pageNumber}
                      width={sizing.width}
                      height={sizing.height}
                      scale={sizing.scale}
                      renderAnnotationLayer={false}
                      renderTextLayer={false}
                      className="pdf-page-canvas"
                      loading={
                        <div className="spinner-container">
                          <div className="spinner" />
                        </div>
                      }
                      onLoadError={(err) => console.error('Erro ao carregar página do PDF:', err)}
                      onRenderError={(err) =>
                        console.error('Erro ao renderizar canvas da página PDF:', err)
                      }
                    />
                  </div>
                  <PdfHighlightLayer
                    pageNumber={pageNumber}
                    highlights={highlights}
                    highlighterActive={highlighterActive}
                    activeColor={activeHighlightColor}
                    flashingHighlightId={flashingHighlightId}
                    onCreateHighlight={(rect) => onCreateHighlight(pageNumber, rect)}
                    onChangeColor={onChangeHighlightColor}
                    onAnnotateHighlight={onAnnotateHighlight}
                    onDeleteHighlight={onDeleteHighlight}
                  />
                </div>
              ))
            ) : (
              <div className="spinner-container">
                <div className="spinner" />
              </div>
            )}
          </Document>
        </div>
      )}
    </div>
  );
}
