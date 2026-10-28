import { useState, useEffect, useMemo, useRef } from 'react';
import {
  useLibraryStore,
  filterAndSortBooks,
  getLastReadBookFromList,
} from '@/stores/useLibraryStore';
import { useAppStore } from '@/stores/useAppStore';
import { libraryService } from '@/services/library-service';
import { LibraryHeader } from './LibraryHeader';
import { ContinueReadingCard } from './ContinueReadingCard';
import { LibraryToolbar } from './LibraryToolbar';
import { LibraryEmptyState } from './LibraryEmptyState';
import { LibraryBookList } from './LibraryBookList';
import { BookContextMenu } from './BookContextMenu';
import { RenameBookModal } from './RenameBookModal';
import { RemoveBookModal } from './RemoveBookModal';
import { UnavailableBookModal } from './UnavailableBookModal';
import { ManageTagsModal } from './ManageTagsModal';
import { DragDropOverlay } from './DragDropOverlay';
import type { Book, Page } from '@/types';
import './LibraryPage.css';

interface LibraryPageProps {
  onOpenBook?: (book: Book) => void;
  onNavigate?: (page: Page) => void;
}

export function LibraryPage({ onOpenBook }: LibraryPageProps) {
  const loading = useLibraryStore((s) => s.loading);
  const loadLibrary = useLibraryStore((s) => s.loadLibrary);
  const contextMenu = useLibraryStore((s) => s.contextMenu);
  const setContextMenu = useLibraryStore((s) => s.setContextMenu);
  const removeBook = useLibraryStore((s) => s.removeBook);
  const renameBook = useLibraryStore((s) => s.renameBook);
  const setBookTags = useLibraryStore((s) => s.setBookTags);
  const relocateBook = useLibraryStore((s) => s.relocateBook);

  const books = useLibraryStore((s) => s.library.books);
  const filter = useLibraryStore((s) => s.filter);
  const sort = useLibraryStore((s) => s.sort);
  const search = useLibraryStore((s) => s.search);
  const selectedTag = useLibraryStore((s) => s.selectedTag);

  const [bookToRename, setBookToRename] = useState<Book | null>(null);
  const [bookToRemove, setBookToRemove] = useState<Book | null>(null);
  const [unavailableBook, setUnavailableBook] = useState<Book | null>(null);
  const [bookToManageTags, setBookToManageTags] = useState<Book | null>(null);
  const [shortcutFeedback, setShortcutFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const appOpenBook = useAppStore((s) => s.openBook);
  const handleOpenBook = onOpenBook || appOpenBook;

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  // Prevent default window navigation when files are dropped outside drop target
  useEffect(() => {
    const handleWindowDrag = (e: DragEvent) => e.preventDefault();
    window.addEventListener('dragover', handleWindowDrag);
    window.addEventListener('drop', handleWindowDrag);
    return () => {
      window.removeEventListener('dragover', handleWindowDrag);
      window.removeEventListener('drop', handleWindowDrag);
    };
  }, []);

  const filteredBooks = useMemo(() => {
    return filterAndSortBooks(books, filter, sort, search, selectedTag);
  }, [books, filter, sort, search, selectedTag]);

  const lastReadBook = useMemo(() => {
    return getLastReadBookFromList(books);
  }, [books]);

  // Drag and drop handlers for importing PDFs
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current <= 0) {
      setIsDragging(false);
      dragCounterRef.current = 0;
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    const files = Array.from(e.dataTransfer.files);
    // In Electron, File objects contain the absolute native path in the `.path` property
    const pdfPaths = files
      .map((f) => (f as unknown as { path?: string }).path || '')
      .filter((p) => p && p.toLowerCase().endsWith('.pdf'));

    if (pdfPaths.length > 0) {
      await libraryService.addBooks(pdfPaths);
      await loadLibrary();
    }
  };

  const handleContextMenu = (e: React.MouseEvent, book: Book) => {
    e.preventDefault();
    setContextMenu({ book, x: e.clientX, y: e.clientY });
  };

  const handleRenameBook = async (bookId: string, newTitle: string) => {
    await renameBook(bookId, newTitle);
  };

  const handleSaveBookTags = async (bookId: string, tags: string[]) => {
    await setBookTags(bookId, tags);
    setBookToManageTags(null);
  };

  const handleConfirmRemove = async (bookId: string, deleteFile: boolean) => {
    await removeBook(bookId, deleteFile);
    setBookToRemove(null);
    setUnavailableBook(null);
  };

  const handleRelocateBook = async (bookId: string) => {
    await relocateBook(bookId);
    setContextMenu(null);
    setUnavailableBook(null);
  };

  const handleCreateDesktopShortcut = async (book: Book) => {
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
    }
    try {
      const result = await window.electronAPI.createDesktopShortcut({
        bookId: book.id,
        title: book.title,
      });
      if (result.ok) {
        setShortcutFeedback({
          ok: true,
          message: `Atalho de “${book.title}” criado na Área de Trabalho!`,
        });
      } else {
        setShortcutFeedback({
          ok: false,
          message: result.error || 'Não foi possível criar o atalho na Área de Trabalho.',
        });
      }
    } catch {
      setShortcutFeedback({
        ok: false,
        message: 'Erro ao criar o atalho na Área de Trabalho.',
      });
    }
    feedbackTimerRef.current = setTimeout(() => {
      setShortcutFeedback(null);
    }, 3500);
  };

  if (loading) {
    return (
      <div className="library-loading">
        <div className="spinner" />
        <p>Carregando biblioteca...</p>
      </div>
    );
  }

  return (
    <div
      className="library-page"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{ position: 'relative' }}
    >
      {isDragging && <DragDropOverlay />}

      <LibraryHeader />

      {lastReadBook && <ContinueReadingCard book={lastReadBook} onOpenBook={handleOpenBook} />}

      <LibraryToolbar />

      {filteredBooks.length === 0 ? (
        <LibraryEmptyState />
      ) : (
        <LibraryBookList
          books={filteredBooks}
          onOpenBook={handleOpenBook}
          onContextMenu={handleContextMenu}
          onUnavailableClick={(book) => setUnavailableBook(book)}
        />
      )}

      {contextMenu && (
        <BookContextMenu
          book={contextMenu.book}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onRename={(book) => setBookToRename(book)}
          onManageTags={(book) => setBookToManageTags(book)}
          onCreateShortcut={handleCreateDesktopShortcut}
          onRemove={(book) => setBookToRemove(book)}
          onRelocate={handleRelocateBook}
        />
      )}

      {shortcutFeedback && (
        <div
          className={`library-shortcut-toast ${shortcutFeedback.ok ? 'is-ok' : 'is-err'}`}
          role="status"
          aria-live="polite"
        >
          {shortcutFeedback.message}
        </div>
      )}

      {bookToRename && (
        <RenameBookModal
          book={bookToRename}
          onClose={() => setBookToRename(null)}
          onRename={handleRenameBook}
        />
      )}

      {bookToManageTags && (
        <ManageTagsModal
          book={bookToManageTags}
          onClose={() => setBookToManageTags(null)}
          onSaveTags={handleSaveBookTags}
        />
      )}

      {bookToRemove && (
        <RemoveBookModal
          book={bookToRemove}
          isUnavailable={unavailableBook?.id === bookToRemove.id}
          onClose={() => setBookToRemove(null)}
          onConfirm={handleConfirmRemove}
        />
      )}

      {unavailableBook && !bookToRemove && (
        <UnavailableBookModal
          book={unavailableBook}
          onClose={() => setUnavailableBook(null)}
          onRelocate={handleRelocateBook}
          onRequestRemove={(book) => setBookToRemove(book)}
        />
      )}
    </div>
  );
}

