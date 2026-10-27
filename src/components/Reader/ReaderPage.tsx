import { useState, useRef, useEffect } from 'react';
import { useReader } from '@/hooks/useReader';
import { ReaderHeader } from './ReaderHeader';
import { ReaderViewport } from './ReaderViewport';
import { ReaderFooter } from './ReaderFooter';
import { PageThumbnails } from './PageThumbnails';
import { ReaderOutline } from './ReaderOutline';
import { StudentMode } from '@/components/Study/StudentMode';
import type { Book } from '@/types';
import './ReaderPage.css';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

interface ReaderPageProps {
  book: Book;
  onBack: () => void;
  startPage?: number | null;
  initialStudyChapterId?: string | null;
}

export function ReaderPage({
  book,
  onBack,
  startPage = null,
  initialStudyChapterId = null,
}: ReaderPageProps) {
  const [studentMode, setStudentMode] = useState(Boolean(initialStudyChapterId));

  useEffect(() => {
    if (initialStudyChapterId) {
      setStudentMode(true);
    }
  }, [initialStudyChapterId]);

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
  } = useReader({ book, onBack, startPage });

  const [sidebar, setSidebar] = useState<'thumbnails' | 'outline' | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const showControlsTimer = useRef<NodeJS.Timeout | null>(null);

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
        studentMode={studentMode}
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
        onToggleStudentMode={() => setStudentMode((prev) => !prev)}
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
          <ReaderOutline
            pdf={pdfDoc}
            totalPages={totalPages}
            currentPage={currentPage}
            onSelectPage={goToPage}
            onClose={() => setSidebar(null)}
          />
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

        {studentMode && (
          <StudentMode
            book={book}
            pdf={pdfDoc}
            totalPages={totalPages}
            currentPage={currentPage}
            initialChapterId={initialStudyChapterId}
            onClose={() => setStudentMode(false)}
            onGoToPage={goToPage}
          />
        )}
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
