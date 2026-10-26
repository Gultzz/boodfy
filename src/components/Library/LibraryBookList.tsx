import { useRef, useState, useEffect, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { BookCard } from './BookCard';
import { BookListItem } from './BookListItem';
import { useLibraryStore } from '@/stores/useLibraryStore';
import type { Book } from '@/types';

interface LibraryBookListProps {
  books: Book[];
  onOpenBook: (book: Book) => void;
  onContextMenu: (e: React.MouseEvent, book: Book) => void;
  onUnavailableClick: (book: Book) => void;
}

const GRID_GAP = 16;
const MIN_COLUMN_WIDTH = 180;
const CONTAINER_PADDING = 48; // 24px left + 24px right
const ESTIMATED_ROW_HEIGHT_GRID = 360;
const ESTIMATED_ROW_HEIGHT_LIST = 68;

export function LibraryBookList({
  books,
  onOpenBook,
  onContextMenu,
  onUnavailableClick,
}: LibraryBookListProps) {
  const viewMode = useLibraryStore((s) => s.viewMode);
  const parentRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Measure container width for responsive column calculation
  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;

    const updateWidth = () => {
      setContainerWidth(el.clientWidth);
    };

    updateWidth();
    const resizeObserver = new ResizeObserver(() => {
      updateWidth();
    });

    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, []);

  // Compute number of columns in grid mode based on container width
  const columns = useMemo(() => {
    if (viewMode !== 'grid') return 1;
    const availableWidth = Math.max(containerWidth - CONTAINER_PADDING, MIN_COLUMN_WIDTH);
    return Math.max(1, Math.floor((availableWidth + GRID_GAP) / (MIN_COLUMN_WIDTH + GRID_GAP)));
  }, [containerWidth, viewMode]);

  // Group books into rows for grid virtualization
  const rowCount = useMemo(() => {
    if (viewMode === 'list') return books.length;
    return Math.ceil(books.length / columns);
  }, [books.length, columns, viewMode]);

  // Grid virtualizer
  const gridVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT_GRID,
    overscan: 3,
  });

  // List virtualizer
  const listVirtualizer = useVirtualizer({
    count: books.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT_LIST,
    overscan: 6,
  });

  if (viewMode === 'list') {
    return (
      <div ref={parentRef} className="books-container books-list-container">
        <div
          style={{
            height: `${listVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {listVirtualizer.getVirtualItems().map((virtualRow) => {
            const book = books[virtualRow.index];
            if (!book) return null;

            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={listVirtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                  paddingBottom: '2px',
                }}
              >
                <BookListItem
                  book={book}
                  onClick={() => onOpenBook(book)}
                  onContextMenu={(e) => onContextMenu(e, book)}
                  onUnavailableClick={onUnavailableClick}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div ref={parentRef} className="books-container books-grid-container">
      <div
        style={{
          height: `${gridVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {gridVirtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * columns;
          const rowBooks = books.slice(startIndex, startIndex + columns);

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={gridVirtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
                display: 'grid',
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                gap: `${GRID_GAP}px`,
                paddingBottom: `${GRID_GAP}px`,
              }}
            >
              {rowBooks.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  onClick={() => onOpenBook(book)}
                  onContextMenu={(e) => onContextMenu(e, book)}
                  onUnavailableClick={onUnavailableClick}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
