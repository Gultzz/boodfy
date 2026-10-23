import { BookCard } from './BookCard';
import { BookListItem } from './BookListItem';
import { useLibraryStore } from '@/stores/useLibraryStore';
import type { Book } from '@/types';

interface LibraryBookListProps {
  books: Book[];
  onOpenBook: (book: Book) => void;
  onContextMenu: (e: React.MouseEvent, book: Book) => void;
}

export function LibraryBookList({ books, onOpenBook, onContextMenu }: LibraryBookListProps) {
  const viewMode = useLibraryStore((s) => s.viewMode);

  return (
    <div className={`books-container ${viewMode === 'grid' ? 'books-grid' : 'books-list'}`}>
      {books.map((book) =>
        viewMode === 'grid' ? (
          <BookCard
            key={book.id}
            book={book}
            onClick={() => onOpenBook(book)}
            onContextMenu={(e) => onContextMenu(e, book)}
          />
        ) : (
          <BookListItem
            key={book.id}
            book={book}
            onClick={() => onOpenBook(book)}
            onContextMenu={(e) => onContextMenu(e, book)}
          />
        ),
      )}
    </div>
  );
}

