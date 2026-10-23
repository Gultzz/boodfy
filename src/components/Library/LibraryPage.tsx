import { useEffect } from 'react';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useAppStore } from '@/stores/useAppStore';
import { LibraryHeader } from './LibraryHeader';
import { ContinueReadingCard } from './ContinueReadingCard';
import { LibraryToolbar } from './LibraryToolbar';
import { LibraryEmptyState } from './LibraryEmptyState';
import { LibraryBookList } from './LibraryBookList';
import { BookContextMenu } from './BookContextMenu';
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
  const relocateBook = useLibraryStore((s) => s.relocateBook);
  const getFilteredBooks = useLibraryStore((s) => s.getFilteredBooks);
  const getLastReadBook = useLibraryStore((s) => s.getLastReadBook);

  const appOpenBook = useAppStore((s) => s.openBook);
  const handleOpenBook = onOpenBook || appOpenBook;

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  const filteredBooks = getFilteredBooks();
  const lastReadBook = getLastReadBook();

  const handleContextMenu = (e: React.MouseEvent, book: Book) => {
    e.preventDefault();
    setContextMenu({ book, x: e.clientX, y: e.clientY });
  };

  const handleRemoveBook = async (bookId: string, deleteFile: boolean) => {
    await removeBook(bookId, deleteFile);
    setContextMenu(null);
  };

  const handleRelocateBook = async (bookId: string) => {
    await relocateBook(bookId);
    setContextMenu(null);
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
    <div className="library-page" onClick={() => setContextMenu(null)}>
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
        />
      )}

      {contextMenu && (
        <BookContextMenu
          book={contextMenu.book}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onRemove={handleRemoveBook}
          onRelocate={handleRelocateBook}
        />
      )}
    </div>
  );
}

