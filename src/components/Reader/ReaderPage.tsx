import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Document, Page as PdfPage, pdfjs } from 'react-pdf';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Eye,
  Sidebar,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { useReader } from '@/hooks/useReader';
import { PageThumbnails } from './PageThumbnails';
import type { Book } from '@/types';
import './ReaderPage.css';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Configure pdfjs worker safely for dev (http) and prod (file://)
if (typeof window !== 'undefined') {
  if (window.location.origin && window.location.origin !== 'null') {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      '/pdf.worker.min.mjs',
      window.location.origin,
    ).toString();
  } else {
    try {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdf.worker.min.mjs',
        window.location.href,
      ).toString();
    } catch {
      pdfjs.GlobalWorkerOptions.workerSrc = './pdf.worker.min.mjs';
    }
  }
}

interface ReaderPageProps {
  book: Book;
  onBack: () => void;
}

export function ReaderPage({ book, onBack }: ReaderPageProps) {
  const {
    currentPage,
    totalPages,
    pdfData,
    loading,
    error,
    fitMode,
    setFitMode,
    zoom,
    setZoom,
    focusMode,
    isFullscreen,
    goToPage,
    nextPage,
    prevPage,
    onDocumentLoadSuccess,
    toggleFullscreen,
    toggleFocusMode,
    handleBack,
  } = useReader({ book, onBack });

  const [inputPage, setInputPage] = useState(String(currentPage));
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [pageWidth, setPageWidth] = useState<number | null>(null);
  const [pageHeight, setPageHeight] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showControlsTimer, setShowControlsTimer] = useState<NodeJS.Timeout | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);

  // Memoize document source to avoid reloading on every render and preventing detached ArrayBuffer crashes
  const fileSource = useMemo(() => {
    if (!pdfData) return null;
    return { data: new Uint8Array(pdfData.slice(0)) };
  }, [pdfData]);

  // Sync input with currentPage
  useEffect(() => {
    setInputPage(String(currentPage));
  }, [currentPage]);

  // Handle container resize to adjust page scale
  const updateDimensions = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    // Keep reasonable margins
    setPageWidth(clientWidth - 48);
    setPageHeight(clientHeight - 48);
  }, []);

  useEffect(() => {
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [updateDimensions]);

  // Handle focus mode auto-hide controls
  const handleMouseMove = () => {
    if (!focusMode) return;
    setControlsVisible(true);
    if (showControlsTimer) clearTimeout(showControlsTimer);
    const timer = setTimeout(() => {
      setControlsVisible(false);
    }, 2500);
    setShowControlsTimer(timer);
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(inputPage, 10);
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      goToPage(p);
    } else {
      setInputPage(String(currentPage));
    }
  };

  const handleZoomIn = () => {
    setFitMode('manual');
    setZoom((z) => Math.min(z + 0.15, 3.0));
  };

  const handleZoomOut = () => {
    setFitMode('manual');
    setZoom((z) => Math.max(z - 0.15, 0.5));
  };

  const handleResetZoom = () => {
    setFitMode('height');
    setZoom(1);
  };

  return (
    <div
      className={`reader-page ${focusMode ? 'focus-mode' : ''} ${
        !controlsVisible && focusMode ? 'controls-hidden' : ''
      }`}
      onMouseMove={handleMouseMove}
    >
      {/* Top Header Controls */}
      <header className="reader-header">
        <div className="reader-header-left">
          <button
            className="btn btn-ghost btn-icon"
            onClick={handleBack}
            title="Voltar para Biblioteca"
          >
            <ArrowLeft size={18} />
          </button>
          <span className="reader-book-title truncate" title={book.title}>
            {book.title}
          </span>
        </div>

        <div className="reader-header-center">
          {/* Page Navigation input */}
          <form onSubmit={handlePageInputSubmit} className="page-nav-form">
            <input
              type="text"
              className="input page-input"
              value={inputPage}
              onChange={(e) => setInputPage(e.target.value)}
              onBlur={handlePageInputSubmit}
              title="Digite a página e pressione Enter"
            />
            <span className="page-total">de {totalPages || '—'}</span>
          </form>
        </div>

        <div className="reader-header-right">
          {/* Fit & Zoom Controls */}
          <div className="zoom-controls">
            <button
              className={`btn btn-ghost btn-sm ${fitMode === 'height' ? 'active' : ''}`}
              onClick={() => {
                setFitMode('height');
                setZoom(1);
              }}
              title="Ajustar à Altura"
            >
              Ajustar Altura
            </button>
            <button
              className={`btn btn-ghost btn-sm ${fitMode === 'width' ? 'active' : ''}`}
              onClick={() => {
                setFitMode('width');
                setZoom(1);
              }}
              title="Ajustar à Largura"
            >
              Ajustar Largura
            </button>
            <button
              className="btn btn-ghost btn-icon"
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
              title="Diminuir Zoom"
            >
              <ZoomOut size={16} />
            </button>
            <span className="zoom-text">{Math.round(zoom * 100)}%</span>
            <button
              className="btn btn-ghost btn-icon"
              onClick={handleZoomIn}
              disabled={zoom >= 3.0}
              title="Aumentar Zoom"
            >
              <ZoomIn size={16} />
            </button>
            {zoom !== 1 && (
              <button
                className="btn btn-ghost btn-icon"
                onClick={handleResetZoom}
                title="Redefinir Zoom"
              >
                <RotateCw size={14} />
              </button>
            )}
          </div>

          <div className="divider-v" />

          {/* Thumbnails Sidebar Toggle */}
          <button
            className={`btn btn-ghost btn-icon ${showThumbnails ? 'active' : ''}`}
            onClick={() => setShowThumbnails((prev) => !prev)}
            title="Miniaturas das Páginas"
          >
            <Sidebar size={18} />
          </button>

          {/* Focus Mode Toggle */}
          <button
            className={`btn btn-ghost btn-icon ${focusMode ? 'active' : ''}`}
            onClick={toggleFocusMode}
            title={focusMode ? 'Sair do Modo Foco (Esc)' : 'Modo Foco'}
          >
            <Eye size={18} />
          </button>

          {/* Fullscreen Toggle */}
          <button
            className="btn btn-ghost btn-icon"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Sair da Tela Cheia' : 'Tela Cheia'}
          >
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="reader-body">
        {/* Thumbnails Drawer */}
        {showThumbnails && pdfData && (
          <PageThumbnails
            pdfData={pdfData}
            totalPages={totalPages}
            currentPage={currentPage}
            onSelectPage={(p) => {
              goToPage(p);
            }}
            onClose={() => setShowThumbnails(false)}
          />
        )}

        {/* Viewport Area */}
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
              <button className="btn btn-secondary" onClick={handleBack}>
                Voltar para Biblioteca
              </button>
            </div>
          )}

          {!loading && !error && fileSource && (
            <div className="pdf-page-wrapper">
              <Document
                file={fileSource}
                onLoadSuccess={({ numPages }) => onDocumentLoadSuccess(numPages)}
                onLoadError={(err) => console.error('Error loading PDF Document:', err)}
                loading={
                  <div className="spinner-container">
                    <div className="spinner" />
                  </div>
                }
              >
                <PdfPage
                  pageNumber={currentPage}
                  height={fitMode === 'height' && pageHeight ? Math.max(pageHeight * zoom, 100) : undefined}
                  width={fitMode === 'width' && pageWidth ? Math.max(pageWidth * zoom, 100) : undefined}
                  scale={fitMode === 'manual' ? zoom : undefined}
                  renderAnnotationLayer={false}
                  renderTextLayer={true}
                  className="pdf-page-canvas"
                  onRenderError={(err) => console.error('Error rendering PDF page canvas:', err)}
                />
              </Document>
            </div>
          )}
        </div>
      </div>

      {/* Floating / Bottom Pagination Bar */}
      <footer className="reader-footer">
        <div className="reader-nav-buttons">
          <button
            className="btn btn-secondary btn-icon"
            onClick={prevPage}
            disabled={currentPage <= 1}
            title="Página Anterior (Seta Esquerda)"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="footer-page-indicator">
            {currentPage} / {totalPages || '—'}
          </span>
          <button
            className="btn btn-secondary btn-icon"
            onClick={nextPage}
            disabled={currentPage >= totalPages}
            title="Próxima Página (Seta Direita)"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {currentPage >= totalPages && totalPages > 0 && (
          <div className="completed-badge">
            <CheckCircle size={14} /> Leitura concluída!
          </div>
        )}
      </footer>
    </div>
  );
}
