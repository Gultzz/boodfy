import { useState, useRef } from 'react';
import { useReader } from '@/hooks/useReader';
import { ReaderHeader } from './ReaderHeader';
import { ReaderViewport } from './ReaderViewport';
import { ReaderFooter } from './ReaderFooter';
import { PageThumbnails } from './PageThumbnails';
import { ReaderOutline } from './ReaderOutline';
import type { Book } from '@/types';
import './ReaderPage.css';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

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
    doublePage,
    toggleDoublePage,
    visiblePages,
    pdfDoc,
    onDocumentReady,
    goToPage,
    nextPage,
    prevPage,
    onDocumentLoadSuccess,
    toggleFullscreen,
    toggleFocusMode,
    handleBack,
  } = useReader({ book, onBack });

  const [sidebar, setSidebar] = useState<'thumbnails' | 'outline' | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const showControlsTimer = useRef<NodeJS.Timeout | null>(null);

  // Focus mode auto-hide controls on inactivity
  const handleMouseMove = () => {
    if (!focusMode) return;
    setControlsVisible(true);
    if (showControlsTimer.current) clearTimeout(showControlsTimer.current);
    showControlsTimer.current = setTimeout(() => {
      setControlsVisible(false);
    }, 2500);
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
      <ReaderHeader
        title={book.title}
        currentPage={currentPage}
        totalPages={totalPages}
        fitMode={fitMode}
        zoom={zoom}
        showThumbnails={sidebar === 'thumbnails'}
        showOutline={sidebar === 'outline'}
        focusMode={focusMode}
        isFullscreen={isFullscreen}
        doublePage={doublePage}
        onBack={handleBack}
        onGoToPage={goToPage}
        onSetFitMode={setFitMode}
        onSetZoom={setZoom}
        onResetZoom={handleResetZoom}
        onToggleThumbnails={() =>
          setSidebar((prev) => (prev === 'thumbnails' ? null : 'thumbnails'))
        }
        onToggleOutline={() => setSidebar((prev) => (prev === 'outline' ? null : 'outline'))}
        onToggleFocusMode={toggleFocusMode}
        onToggleFullscreen={toggleFullscreen}
        onToggleDoublePage={toggleDoublePage}
      />

      <div className="reader-body">
        {sidebar === 'thumbnails' && pdfData && (
          <PageThumbnails
            pdfData={pdfData}
            totalPages={totalPages}
            currentPage={currentPage}
            onSelectPage={goToPage}
            onClose={() => setSidebar(null)}
          />
        )}

        {sidebar === 'outline' && (
          <ReaderOutline pdf={pdfDoc} onSelectPage={goToPage} onClose={() => setSidebar(null)} />
        )}

        <ReaderViewport
          pdfData={pdfData}
          pages={visiblePages}
          loading={loading}
          error={error}
          fitMode={fitMode}
          zoom={zoom}
          onDocumentLoadSuccess={onDocumentLoadSuccess}
          onDocumentReady={onDocumentReady}
          onBack={handleBack}
        />
      </div>

      <ReaderFooter
        pages={visiblePages}
        totalPages={totalPages}
        onPrevPage={prevPage}
        onNextPage={nextPage}
      />
    </div>
  );
}
