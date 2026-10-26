import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { Document, Page as PdfPage } from 'react-pdf';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { AlertCircle } from 'lucide-react';
import type { FitMode } from '@/types';

/** Espaço entre as duas páginas do modo de página dupla (px) */
const SPREAD_GAP = 16;

interface ReaderViewportProps {
  pdfData: ArrayBuffer | null;
  pages: number[];
  loading: boolean;
  error: string | null;
  fitMode: FitMode;
  zoom: number;
  onDocumentLoadSuccess: (numPages: number) => void;
  onDocumentReady?: (pdf: PDFDocumentProxy) => void;
  onBack: () => void;
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
  onDocumentLoadSuccess,
  onDocumentReady,
  onBack,
}: ReaderViewportProps) {
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

  // Também quando o contêiner muda sem resize de janela (barra de miniaturas abrindo/fechando)
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
      // Waiting for the measured aspect ratio before laying the pair out
      if (pageAspect === null || !pageWidth || !pageHeight) return null;
      const boxWidth = Math.max((pageWidth - SPREAD_GAP) / 2, 100);
      if (fitMode === 'width') return { width: Math.max(boxWidth * zoom, 100) };
      // Fit the pair to the available height without overflowing horizontally
      const height = Math.min(pageHeight * zoom, boxWidth / pageAspect);
      return { width: Math.max(height * pageAspect, 100) };
    }
    return {
      width: fitMode === 'width' && pageWidth ? Math.max(pageWidth * zoom, 100) : undefined,
      height: fitMode === 'height' && pageHeight ? Math.max(pageHeight * zoom, 100) : undefined,
      scale: fitMode === 'manual' ? zoom : undefined,
    };
  }, [isSpread, fitMode, zoom, pageWidth, pageHeight, pageAspect]);

  return (
    <div className="reader-viewport" ref={containerRef}>
      {loading && (
        <div className="reader-loading">
          <div className="spinner" />
          <p>Carregando documento...</p>
        </div>
      )}

      {error && (
        <div className="reader-error">
          <AlertCircle size={48} className="error-icon" />
          <h3>Não foi possível abrir o arquivo</h3>
          <p>{error}</p>
          <button className="btn btn-secondary" onClick={onBack}>
            Voltar para Biblioteca
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
                <PdfPage
                  key={`page-${pageNumber}`}
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
