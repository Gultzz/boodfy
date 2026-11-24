import { FileWarning, BookOpen, MoreVertical, GraduationCap } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useTranslation } from '@/stores/useI18nStore';
import { TAG_COLORS, resolveTagColor } from '@/lib/colors';
import type { Book } from '@/types';
import './BookListItem.css';

interface BookListItemProps {
  book: Book;
  onClick: () => void;
  onOpenStudy?: (book: Book) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onUnavailableClick?: (book: Book) => void;
}

export function BookListItem({
  book,
  onClick,
  onOpenStudy,
  onContextMenu,
  onUnavailableClick,
}: BookListItemProps) {
  const { t, locale } = useTranslation();
  const tagColors = useLibraryStore((s) => s.library.tagColors);
  const setSelectedTag = useLibraryStore((s) => s.setSelectedTag);
  const [fileAvailable, setFileAvailable] = useState(true);

  useEffect(() => {
    window.electronAPI.fileExists(book.filePath).then(setFileAvailable);
  }, [book.filePath]);

  const progress = book.totalPages > 0 ? Math.round((book.currentPage / book.totalPages) * 100) : 0;

  const statusLabel = {
    'not-started': t('library.status.notStarted'),
    reading: t('library.status.reading'),
    completed: t('library.status.completed'),
  }[book.status];

  const formatDate = (date: string | null) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString(locale);
  };

  const handleClick = () => {
    if (fileAvailable) {
      onClick();
    } else if (onUnavailableClick) {
      onUnavailableClick(book);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className={`book-list-item ${!fileAvailable ? 'book-list-item-unavailable' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onContextMenu={onContextMenu}
      title={fileAvailable ? book.title : t('library.unavailable')}
    >
      <div className="book-list-cover">
        {book.coverDataUrl ? (
          <img src={book.coverDataUrl} alt="" className="book-list-cover-img" />
        ) : fileAvailable ? (
          <BookOpen size={18} />
        ) : (
          <FileWarning size={18} />
        )}
      </div>

      <div className="book-list-title-cell">
        <div className="book-list-title truncate">{book.title}</div>
        {book.author && <div className="book-list-author truncate">{book.author}</div>}
        {book.tags && book.tags.length > 0 && (
          <div className="book-list-tags">
            {book.tags.slice(0, 3).map((tag) => {
              const meta = TAG_COLORS[resolveTagColor(tag, tagColors)];
              return (
                <span
                  key={tag}
                  className="book-tag-chip"
                  style={{
                    backgroundColor: meta.bg,
                    borderColor: meta.border,
                    color: meta.text,
                  }}
                  title={tag}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTag(tag);
                  }}
                >
                  {tag}
                </span>
              );
            })}
            {book.tags.length > 3 && (
              <span className="book-tag-chip more">+{book.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>

      <div className="book-list-progress">
        {book.totalPages > 0 && (
          <>
            <div className="progress-bar" style={{ width: '80px' }}>
              <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
            </div>
            <span>{progress}%</span>
          </>
        )}
      </div>
      <div className="book-list-pages">
        {book.totalPages > 0 ? `${book.currentPage}/${book.totalPages}` : '—'}
      </div>
      <span
        className={`badge badge-${book.status === 'completed' ? 'success' : book.status === 'reading' ? 'accent' : 'warning'}`}
      >
        {statusLabel}
      </span>
      <div className="book-list-date">{formatDate(book.lastReadAt)}</div>

      <div className="book-list-actions">
        {fileAvailable && onOpenStudy && (
          <button
            type="button"
            className="book-list-more-btn"
            onClick={(e) => {
              e.stopPropagation();
              onOpenStudy(book);
            }}
            title={t('library.studyShortcut')}
            aria-label={t('library.studyShortcut')}
          >
            <GraduationCap size={16} />
          </button>
        )}
        <button
          type="button"
          className="book-list-more-btn"
          onClick={(e) => {
            e.stopPropagation();
            onContextMenu(e);
          }}
          title={t('library.options')}
          aria-label={t('library.options')}
        >
          <MoreVertical size={16} />
        </button>
      </div>
    </div>
  );
}
