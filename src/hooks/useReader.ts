import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { libraryService } from '@/services/library-service';
import type { Book, FitMode } from '@/types';

interface UseReaderProps {
  book: Book | null;
  onBack: () => void;
  startPage?: number | null;
}

export function getSpreadRange(page: number, totalPages: number): { first: number; last: number } {
  if (page <= 1) return { first: 1, last: 1 };
  const first = page % 2 === 0 ? page : page - 1;
  const last = totalPages > 0 ? Math.min(first + 1, totalPages) : first + 1;
  return { first, last };
}

export function useReader({ book, onBack, startPage = null }: UseReaderProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fitMode, setFitMode] = useState<FitMode>('height');
  const [zoom, setZoom] = useState(1);
  const [focusMode, setFocusMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [doublePage, setDoublePage] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bookRef = useRef(book);
  const currentPageRef = useRef(currentPage);
  const startPageRef = useRef(startPage);

  bookRef.current = book;
  currentPageRef.current = currentPage;
  startPageRef.current = startPage;

  useEffect(() => {
    if (!book) return;
    setLoading(true);
    setError(null);
    setPdfData(null);
    setPdfDoc(null);

    const initialPage = startPageRef.current ?? book.currentPage ?? 1;

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
        setCurrentPage(initialPage);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao abrir o PDF';
        setError(msg);
      } finally {
        setLoading(false);
      }
    })();

    libraryService.addHistoryEntry(book.id, book.title, initialPage);

    return () => {
      if (bookRef.current && currentPageRef.current > 0) {
        libraryService.updateLastHistoryEntry(currentPageRef.current);
      }
    };
  }, [book]);

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
    if (!doublePage) {
      goToPage(currentPage + 1);
      return;
    }
    const { first } = getSpreadRange(currentPage, totalPages);
    const next = first === 1 ? 2 : first + 2;
    if (next > totalPages || next === currentPage) return;
    goToPage(next);
  }, [currentPage, totalPages, doublePage, goToPage]);

  const prevPage = useCallback(() => {
    if (!doublePage) {
      goToPage(currentPage - 1);
      return;
    }
    const { first } = getSpreadRange(currentPage, totalPages);
    const prev = first <= 2 ? 1 : first - 2;
    if (prev === currentPage) return;
    goToPage(prev);
  }, [currentPage, totalPages, doublePage, goToPage]);

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
        setCurrentPage((prev) => {
          const clamped = Math.max(1, Math.min(prev, numPages));
          libraryService.updateProgress(book.id, clamped, numPages);
          return clamped;
        });
      }
    },
    [book],
  );

  const toggleFullscreen = useCallback(async () => {
    const fs = await window.electronAPI.toggleFullscreen();
    setIsFullscreen(fs);
  }, []);

  const toggleFocusMode = useCallback(() => {
    setFocusMode((prev) => !prev);
  }, []);

  const toggleDoublePage = useCallback(() => {
    setDoublePage((prev) => !prev);
  }, []);

  const onDocumentReady = useCallback((pdf: PDFDocumentProxy) => {
    setPdfDoc(pdf);
  }, []);

  const visiblePages = useMemo(() => {
    if (!doublePage) return [currentPage];
    const { first, last } = getSpreadRange(currentPage, totalPages);
    return last > first ? [first, last] : [first];
  }, [doublePage, currentPage, totalPages]);

  const handleBack = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    if (book && currentPage > 0 && totalPages > 0) {
      await libraryService.updateProgress(book.id, currentPage, totalPages);
      await libraryService.updateLastHistoryEntry(currentPage);
      if (currentPage >= totalPages) {
        await libraryService.markCompleted(book.id);
      }
    }
    onBack();
  }, [book, currentPage, totalPages, onBack]);

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
    doublePage,
    toggleDoublePage,
    visiblePages,
    pdfDoc,
    onDocumentReady,
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
