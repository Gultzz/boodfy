import { useState, useEffect, useCallback, useRef } from 'react';
import { libraryService } from '@/services/library-service';
import type { Book, FitMode } from '@/types';

interface UseReaderProps {
  book: Book | null;
  onBack: () => void;
}

export function useReader({ book, onBack }: UseReaderProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fitMode, setFitMode] = useState<FitMode>('height');
  const [zoom, setZoom] = useState(1);
  const [focusMode, setFocusMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bookRef = useRef(book);
  const currentPageRef = useRef(currentPage);

  bookRef.current = book;
  currentPageRef.current = currentPage;

  // Load PDF
  useEffect(() => {
    if (!book) return;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const exists = await window.electronAPI.fileExists(book.filePath);
        if (!exists) {
          setError('Arquivo não encontrado. O PDF pode ter sido movido ou removido.');
          setLoading(false);
          return;
        }
        const data = await window.electronAPI.readPdf(book.filePath);
        setPdfData(data);
        setCurrentPage(book.currentPage || 1);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao abrir o PDF';
        setError(msg);
      } finally {
        setLoading(false);
      }
    })();

    // Add history entry
    libraryService.addHistoryEntry(book.id, book.title, book.currentPage || 1);

    return () => {
      // Save on unmount
      if (bookRef.current && currentPageRef.current > 0) {
        libraryService.updateLastHistoryEntry(currentPageRef.current);
      }
    };
  }, [book]);

  // Save progress with debounce
  const saveProgress = useCallback(
    (page: number) => {
      if (!book || totalPages === 0) return;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        libraryService.updateProgress(book.id, page, totalPages);
      }, 300);
    },
    [book, totalPages],
  );

  const goToPage = useCallback(
    (page: number) => {
      if (page < 1 || page > totalPages) return;
      setCurrentPage(page);
      currentPageRef.current = page;
      saveProgress(page);
    },
    [totalPages, saveProgress],
  );

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  const firstPage = useCallback(() => {
    goToPage(1);
  }, [goToPage]);

  const lastPage = useCallback(() => {
    goToPage(totalPages);
  }, [totalPages, goToPage]);

  const onDocumentLoadSuccess = useCallback(
    (numPages: number) => {
      setTotalPages(numPages);
      if (book) {
        libraryService.updateProgress(book.id, currentPage, numPages);
      }
    },
    [book, currentPage],
  );

  const toggleFullscreen = useCallback(async () => {
    const fs = await window.electronAPI.toggleFullscreen();
    setIsFullscreen(fs);
  }, []);

  const toggleFocusMode = useCallback(() => {
    setFocusMode((prev) => !prev);
  }, []);

  const handleBack = useCallback(() => {
    if (book && currentPage > 0 && totalPages > 0) {
      libraryService.updateProgress(book.id, currentPage, totalPages);
      libraryService.updateLastHistoryEntry(currentPage);
      // Check if completed
      if (currentPage >= totalPages) {
        libraryService.markCompleted(book.id);
      }
    }
    onBack();
  }, [book, currentPage, totalPages, onBack]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (isInput) return;

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          nextPage();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          prevPage();
          break;
        case 'Home':
          e.preventDefault();
          firstPage();
          break;
        case 'End':
          e.preventDefault();
          lastPage();
          break;
        case 'Escape':
          if (focusMode) {
            e.preventDefault();
            setFocusMode(false);
          }
          break;
        case 'F11':
          e.preventDefault();
          toggleFullscreen();
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [nextPage, prevPage, firstPage, lastPage, focusMode, toggleFullscreen]);

  return {
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
    firstPage,
    lastPage,
    onDocumentLoadSuccess,
    toggleFullscreen,
    toggleFocusMode,
    handleBack,
  };
}
