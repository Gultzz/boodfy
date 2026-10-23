import { useState, useEffect, useMemo } from 'react';
import {
  useLibraryStore,
  filterAndSortBooks,
  getLastReadBookFromList,
} from '@/stores/useLibraryStore';
import { useAppStore } from '@/stores/useAppStore';
import { LibraryHeader } from './LibraryHeader';
import { ContinueReadingCard } from './ContinueReadingCard';
import { LibraryToolbar } from './LibraryToolbar';
import { LibraryEmptyState } from './LibraryEmptyState';
import { LibraryBookList } from './LibraryBookList';
import { BookContextMenu } from './BookContextMenu';
import { RenameBookModal } from './RenameBookModal';
import { RemoveBookModal } from './RemoveBookModal';
import { UnavailableBookModal } from './UnavailableBookModal';
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
  const relocateBook = useLibraryStore((s) => s.relocateBook);

  const books = useLibraryStore((s) => s.library.books);
  const filter = useLibraryStore((s) => s.filter);
  const sort = useLibraryStore((s) => s.sort);
  const search = useLibraryStore((s) => s.search);

  const [bookToRename, setBookToRename] = useState<Book | null>(null);
  const [bookToRemove, setBookToRemove] = useState<Book | null>(null);
  const [unavailableBook, setUnavailableBook] = useState<Book | null>(null);

  const appOpenBook = useAppStore((s) => s.openBook);
  const handleOpenBook = onOpenBook || appOpenBook;

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  const filteredBooks = useMemo(() => {
    return filterAndSortBooks(books, filter, sort, search);
  }, [books, filter, sort, search]);

  const lastReadBook = useMemo(() => {
    return getLastReadBookFromList(books);
  }, [books]);

  const handleContextMenu = (e: React.MouseEvent, book: Book) => {
    e.preventDefault();
    setContextMenu({ book, x: e.clientX, y: e.clientY });
  };

  const handleRenameBook = async (bookId: string, newTitle: string) => {
    await renameBook(bookId, newTitle);
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

  if (loading) {
    return (
      <div className="library-loading">
        <div className="spinner" />
        <p>Carregando biblioteca...</p>
      </div>
    );
  }

  return (
    <div className="library-page">
      <LibraryHeader />

      {lastReadBook && (
        <ContinueReadingCard book={lastReadBook} onOpenBook={handleOpenBook} />
      )}

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
          onRemove={(book) => setBookToRemove(book)}
          onRelocate={handleRelocateBook}
        />
      )}

      {bookToRename && (
        <RenameBookModal
          book={bookToRename}
          onClose={() => setBookToRename(null)}
          onRename={handleRenameBook}
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
