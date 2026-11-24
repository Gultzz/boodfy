import { useState, useRef, useEffect, useCallback } from 'react';
import { pdfjs } from 'react-pdf';
import { NotebookPen, Undo2 } from 'lucide-react';
import { useReader } from '@/hooks/useReader';
import { useReaderSettingsStore } from '@/stores/useReaderSettingsStore';
import {
  EMPTY_BOOK_ANNOTATIONS,
  useAnnotationsStore,
} from '@/stores/useAnnotationsStore';
import { useTranslation } from '@/stores/useI18nStore';
import { ReaderHeader } from './ReaderHeader';
import { ReaderViewport } from './ReaderViewport';
import { FluidTextViewport } from './FluidTextViewport';
import { ReaderFooter } from './ReaderFooter';
import { PageThumbnails } from './PageThumbnails';
import { ReaderOutline } from './ReaderOutline';
import { ReaderNotebook } from './ReaderNotebook';
import { ReaderBookmarks } from './ReaderBookmarks';
import { StudentMode } from '@/components/Study/StudentMode';
import { ANNOTATION_COLORS } from '@/lib/colors';
import type { ReaderInitialPanel } from '@/stores/useAppStore';
import type { AnnotationColor, Book, Chapter, Highlight, HighlightRect, ReaderViewMode } from '@/types';
import './ReaderPage.css';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

interface ReaderPageProps {
  book: Book;
  onBack: () => void;
  startPage?: number | null;
  initialStudyChapterId?: string | null;
  initialPanel?: ReaderInitialPanel;
}

type LeftSidebar = 'thumbnails' | 'outline' | null;
type RightPanel = 'notebook' | 'bookmarks' | 'study' | null;

export function ReaderPage({
  book,
  onBack,
  startPage = null,
  initialStudyChapterId = null,
  initialPanel = null,
}: ReaderPageProps) {
  const { t } = useTranslation();
  const readerSettings = useReaderSettingsStore((s) => s.settings);
  const setDefaultViewMode = useReaderSettingsStore((s) => s.setDefaultViewMode);
  const loadAnnotations = useAnnotationsStore((s) => s.load);
  const bookAnnotations = useAnnotationsStore((s) => s.data.books[book.id]);
  const addHighlight = useAnnotationsStore((s) => s.addHighlight);
  const updateHighlightColor = useAnnotationsStore((s) => s.updateHighlightColor);
  const removeHighlight = useAnnotationsStore((s) => s.removeHighlight);

  const annotations = bookAnnotations ?? EMPTY_BOOK_ANNOTATIONS;

  const [viewMode, setViewMode] = useState<ReaderViewMode>(readerSettings.defaultViewMode);
  const [leftSidebar, setLeftSidebar] = useState<LeftSidebar>(
    initialPanel === 'outline' ? 'outline' : null,
  );
  const [rightPanel, setRightPanel] = useState<RightPanel>(() => {
    if (initialStudyChapterId || initialPanel === 'study') return 'study';
    if (initialPanel === 'notebook') return 'notebook';
    if (initialPanel === 'bookmarks') return 'bookmarks';
    return null;
  });
  const [studyChapterId, setStudyChapterId] = useState<string | null>(initialStudyChapterId);

  const [highlighterActive, setHighlighterActive] = useState(false);
  const [activeHighlightColor, setActiveHighlightColor] = useState<AnnotationColor>('amber');
  const [recentHighlightToast, setRecentHighlightToast] = useState<Highlight | null>(null);
  const [draftNoteHighlightId, setDraftNoteHighlightId] = useState<string | null>(null);
  const [flashingHighlightId, setFlashingHighlightId] = useState<string | null>(null);

  const [controlsVisible, setControlsVisible] = useState(true);
  const showControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void loadAnnotations();
  }, [loadAnnotations]);

  useEffect(() => {
    if (initialStudyChapterId) {
      setStudyChapterId(initialStudyChapterId);
      setRightPanel('study');
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

  // If user opens directly in Fluid Text mode before ReaderViewport initializes pdfDoc, load pdfDoc via pdfjs
  useEffect(() => {
    if (viewMode !== 'fluid' || pdfDoc || !pdfData) return;
    let cancelled = false;
    const task = pdfjs.getDocument({ data: new Uint8Array(pdfData.slice(0)) });
    task.promise
      .then((doc) => {
        if (cancelled) {
          void doc.destroy();
          return;
        }
        onDocumentLoadSuccess(doc.numPages);
        onDocumentReady(doc);
      })
      .catch((err) => console.error('Erro ao inicializar PDF no modo Texto Fluido:', err));

    return () => {
      cancelled = true;
    };
  }, [viewMode, pdfDoc, pdfData, onDocumentLoadSuccess, onDocumentReady]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (showControlsTimer.current) clearTimeout(showControlsTimer.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  const handleMouseMove = () => {
    if (!focusMode) return;
    setControlsVisible(true);
    if (showControlsTimer.current) clearTimeout(showControlsTimer.current);
    showControlsTimer.current = setTimeout(() => {
      setControlsVisible(false);
    }, 2500);
  };

  const handleEmptyAreaClick = useCallback(() => {
    if (focusMode) {
      setControlsVisible((prev) => !prev);
    }
  }, [focusMode]);

  const handleResetZoom = () => {
    setFitMode('height');
    setZoom(1);
  };

  const handleChangeViewMode = (mode: ReaderViewMode) => {
    setViewMode(mode);
    void setDefaultViewMode(mode);
  };

  const showHighlightSavedToast = useCallback((created: Highlight) => {
    setRecentHighlightToast(created);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setRecentHighlightToast(null);
    }, 5500);
  }, []);

  const handleCreatePdfHighlight = useCallback(
    async (pageNumber: number, rect: HighlightRect) => {
      const created = await addHighlight({
        bookId: book.id,
        pageNumber,
        color: activeHighlightColor,
        mode: 'pdf',
        rect,
      });
      showHighlightSavedToast(created);
    },
    [addHighlight, book.id, activeHighlightColor, showHighlightSavedToast],
  );

  const handleCreateFluidHighlight = useCallback(
    async (payload: {
      paragraphIndex: number;
      startOffset: number;
      endOffset: number;
      quote: string;
      color?: AnnotationColor;
    }) => {
      const chosenColor = payload.color ?? activeHighlightColor;
      if (payload.color) {
        setActiveHighlightColor(payload.color);
      }
      const created = await addHighlight({
        bookId: book.id,
        pageNumber: currentPage,
        color: chosenColor,
        mode: 'fluid',
        paragraphIndex: payload.paragraphIndex,
        startOffset: payload.startOffset,
        endOffset: payload.endOffset,
        quote: payload.quote,
      });
      showHighlightSavedToast(created);
    },
    [addHighlight, book.id, currentPage, activeHighlightColor, showHighlightSavedToast],
  );

  const handleAnnotateHighlight = useCallback((highlight: Highlight) => {
    setDraftNoteHighlightId(highlight.id);
    setRightPanel('notebook');
    setRecentHighlightToast(null);
  }, []);

  const triggerHighlightFlash = useCallback((highlightId: string) => {
    setFlashingHighlightId(null);
    requestAnimationFrame(() => {
      setFlashingHighlightId(highlightId);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      flashTimerRef.current = setTimeout(() => {
        setFlashingHighlightId(null);
      }, 3400);
    });
  }, []);

  const handleJumpToHighlight = useCallback(
    (highlight: Highlight) => {
      if (highlight.mode !== viewMode) {
        setViewMode(highlight.mode);
      }
      goToPage(highlight.pageNumber);
      // Small delay so the target page mounts before pulsing
      setTimeout(() => {
        triggerHighlightFlash(highlight.id);
      }, 160);
    },
    [viewMode, goToPage, triggerHighlightFlash],
  );

  const handleQuizChapter = useCallback(
    (chapter: Chapter) => {
      goToPage(chapter.startPage);
      setStudyChapterId(chapter.id);
      setRightPanel('study');
    },
    [goToPage],
  );

  const isCurrentPageBookmarked = annotations.bookmarks.some(
    (bm) => bm.pageNumber === currentPage,
  );
  const notebookCount = annotations.notes.length + annotations.highlights.length;

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
        viewMode={viewMode}
        fitMode={fitMode}
        zoom={zoom}
        showThumbnails={leftSidebar === 'thumbnails'}
        showOutline={leftSidebar === 'outline'}
        showNotebook={rightPanel === 'notebook'}
        showBookmarks={rightPanel === 'bookmarks'}
        studentMode={rightPanel === 'study'}
        focusMode={focusMode}
        isFullscreen={isFullscreen}
        doublePage={doublePage}
        highlighterActive={highlighterActive}
        activeHighlightColor={activeHighlightColor}
        isCurrentPageBookmarked={isCurrentPageBookmarked}
        notebookCount={notebookCount}
        onBack={handleBack}
        onGoToPage={goToPage}
        onChangeViewMode={handleChangeViewMode}
        onSetFitMode={setFitMode}
        onSetZoom={setZoom}
        onResetZoom={handleResetZoom}
        onToggleHighlighter={() => setHighlighterActive((prev) => !prev)}
        onSelectHighlightColor={setActiveHighlightColor}
        onToggleNotebook={() =>
          setRightPanel((prev) => (prev === 'notebook' ? null : 'notebook'))
        }
        onToggleBookmarks={() =>
          setRightPanel((prev) => (prev === 'bookmarks' ? null : 'bookmarks'))
        }
        onToggleThumbnails={() =>
          setLeftSidebar((prev) => (prev === 'thumbnails' ? null : 'thumbnails'))
        }
        onToggleOutline={() =>
          setLeftSidebar((prev) => (prev === 'outline' ? null : 'outline'))
        }
        onToggleStudentMode={() =>
          setRightPanel((prev) => (prev === 'study' ? null : 'study'))
        }
        onToggleFocusMode={toggleFocusMode}
        onToggleFullscreen={toggleFullscreen}
        onToggleDoublePage={toggleDoublePage}
      />

      <div className="reader-body">
        {leftSidebar === 'thumbnails' && pdfData && (
          <PageThumbnails
            pdfData={pdfData}
            totalPages={totalPages}
            currentPage={currentPage}
            onSelectPage={goToPage}
            onClose={() => setLeftSidebar(null)}
          />
        )}

        {leftSidebar === 'outline' && (
          <ReaderOutline
            pdf={pdfDoc}
            totalPages={totalPages}
            currentPage={currentPage}
            onSelectPage={goToPage}
            onQuizChapter={handleQuizChapter}
            onClose={() => setLeftSidebar(null)}
          />
        )}

        {viewMode === 'pdf' ? (
          <ReaderViewport
            pdfData={pdfData}
            pages={visiblePages}
            loading={loading}
            error={error}
            fitMode={fitMode}
            zoom={zoom}
            highlights={annotations.highlights}
            highlighterActive={highlighterActive}
            activeHighlightColor={activeHighlightColor}
            flashingHighlightId={flashingHighlightId}
            onCreateHighlight={(pageNum, rect) => void handleCreatePdfHighlight(pageNum, rect)}
            onChangeHighlightColor={(id, color) => void updateHighlightColor(book.id, id, color)}
            onAnnotateHighlight={handleAnnotateHighlight}
            onDeleteHighlight={(id) => void removeHighlight(book.id, id)}
            onDocumentLoadSuccess={onDocumentLoadSuccess}
            onDocumentReady={onDocumentReady}
            onBack={handleBack}
            onEmptyAreaClick={handleEmptyAreaClick}
          />
        ) : (
          <FluidTextViewport
            pdf={pdfDoc}
            pageNumber={currentPage}
            fontSize={readerSettings.fontSize}
            lineSpacing={readerSettings.lineSpacing}
            highlights={annotations.highlights}
            highlighterActive={highlighterActive}
            activeColor={activeHighlightColor}
            flashingHighlightId={flashingHighlightId}
            onCreateFluidHighlight={(payload) => void handleCreateFluidHighlight(payload)}
            onChangeColor={(id, color) => void updateHighlightColor(book.id, id, color)}
            onAnnotateHighlight={handleAnnotateHighlight}
            onDeleteHighlight={(id) => void removeHighlight(book.id, id)}
            onSwitchToPdf={() => handleChangeViewMode('pdf')}
            onEmptyAreaClick={handleEmptyAreaClick}
          />
        )}

        {rightPanel === 'notebook' && (
          <ReaderNotebook
            bookId={book.id}
            currentPage={currentPage}
            initialDraftHighlightId={draftNoteHighlightId}
            onClearDraftHighlight={() => setDraftNoteHighlightId(null)}
            onJumpToPage={goToPage}
            onJumpToHighlight={handleJumpToHighlight}
            onClose={() => setRightPanel(null)}
          />
        )}

        {rightPanel === 'bookmarks' && (
          <ReaderBookmarks
            bookId={book.id}
            currentPage={currentPage}
            onJumpToPage={goToPage}
            onClose={() => setRightPanel(null)}
          />
        )}

        {rightPanel === 'study' && (
          <StudentMode
            book={book}
            pdf={pdfDoc}
            totalPages={totalPages}
            currentPage={currentPage}
            initialChapterId={studyChapterId}
            onClose={() => setRightPanel(null)}
            onGoToPage={goToPage}
          />
        )}
      </div>

      {/* Aviso rápido após criar marcação */}
      {recentHighlightToast && (
        <div className="highlight-saved-toast" role="status" aria-live="polite">
          <span
            className="notebook-jump-dot"
            style={{ backgroundColor: ANNOTATION_COLORS[recentHighlightToast.color].hex }}
          />
          <span className="highlight-toast-label">
            {t('highlight.saved', { n: recentHighlightToast.number })} ·{' '}
            {t(`annotation.${recentHighlightToast.color}`)}
          </span>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => handleAnnotateHighlight(recentHighlightToast)}
          >
            <NotebookPen size={13} />
            {t('highlight.annotate')}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              void removeHighlight(book.id, recentHighlightToast.id);
              setRecentHighlightToast(null);
            }}
          >
            <Undo2 size={13} />
            {t('common.undo')}
          </button>
        </div>
      )}

      <ReaderFooter
        pages={viewMode === 'fluid' ? [currentPage] : visiblePages}
        totalPages={totalPages}
        onPrevPage={viewMode === 'fluid' ? () => goToPage(currentPage - 1) : prevPage}
        onNextPage={viewMode === 'fluid' ? () => goToPage(currentPage + 1) : nextPage}
        onGoToPage={goToPage}
      />
    </div>
  );
}
