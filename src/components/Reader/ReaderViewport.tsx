import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { Document, Page as PdfPage } from 'react-pdf';
import { AlertCircle } from 'lucide-react';
import type { FitMode } from '@/types';

interface ReaderViewportProps {
  pdfData: ArrayBuffer | null;
  currentPage: number;
  loading: boolean;
  error: string | null;
  fitMode: FitMode;
  zoom: number;
  onDocumentLoadSuccess: (numPages: number) => void;
  onBack: () => void;
}

export function ReaderViewport({
  pdfData,
  currentPage,
  loading,
  error,
  fitMode,
  zoom,
  onDocumentLoadSuccess,
  onBack,
}: ReaderViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageWidth, setPageWidth] = useState<number | null>(null);
  const [pageHeight, setPageHeight] = useState<number | null>(null);

  // Safely clone ArrayBuffer so worker transfer does not neuter original data across renders
  const fileSource = useMemo(() => {
    if (!pdfData) return null;
    return { data: new Uint8Array(pdfData.slice(0)) };
  }, [pdfData]);

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
        <div className="pdf-page-wrapper">
          <Document
            file={fileSource}
            onLoadSuccess={({ numPages }) => onDocumentLoadSuccess(numPages)}
            onLoadError={(err) => console.error('Erro ao carregar documento PDF:', err)}
            loading={
              <div className="spinner-container">
                <div className="spinner" />
              </div>
            }
          >
            <PdfPage
              key={`page-${currentPage}`}
              pageNumber={currentPage}
              height={fitMode === 'height' && pageHeight ? Math.max(pageHeight * zoom, 100) : undefined}
              width={fitMode === 'width' && pageWidth ? Math.max(pageWidth * zoom, 100) : undefined}
              scale={fitMode === 'manual' ? zoom : undefined}
              renderAnnotationLayer={false}
              renderTextLayer={false}
              className="pdf-page-canvas"
              loading={
                <div className="spinner-container">
                  <div className="spinner" />
                </div>
              }
              onLoadError={(err) => console.error('Erro ao carregar página do PDF:', err)}
              onRenderError={(err) => console.error('Erro ao renderizar canvas da página PDF:', err)}
            />
          </Document>
        </div>
      )}
    </div>
  );
}
