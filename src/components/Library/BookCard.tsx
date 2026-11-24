import { FileWarning, BookOpen, MoreVertical, GraduationCap } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useTranslation } from '@/stores/useI18nStore';
import { TAG_COLORS, resolveTagColor } from '@/lib/colors';
import type { Book } from '@/types';
import './BookCard.css';

interface BookCardProps {
  book: Book;
  onClick: () => void;
  onOpenStudy?: (book: Book) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onUnavailableClick?: (book: Book) => void;
}

export function BookCard({
  book,
  onClick,
  onOpenStudy,
  onContextMenu,
  onUnavailableClick,
}: BookCardProps) {
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
    if (!date) return null;
    return new Date(date).toLocaleDateString(locale, {
      day: '2-digit',
      month: 'short',
    });
  };

  const handleCardClick = () => {
    if (fileAvailable) {
      onClick();
    } else if (onUnavailableClick) {
      onUnavailableClick(book);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className={`book-card card ${!fileAvailable ? 'book-card-unavailable' : ''}`}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      onContextMenu={onContextMenu}
      title={fileAvailable ? book.title : t('library.unavailable')}
    >
      <div className="book-card-cover">
        {book.coverDataUrl ? (
          <img src={book.coverDataUrl} alt={book.title} className="book-card-cover-img" />
        ) : (
          <div className="book-card-cover-placeholder">
            {fileAvailable ? <BookOpen size={32} /> : <FileWarning size={32} />}
          </div>
        )}

        <div className="book-card-top-actions">
          {fileAvailable && onOpenStudy && (
            <button
              type="button"
              className="book-card-action-btn"
              onClick={(e) => {
                e.stopPropagation();
                onOpenStudy(book);
              }}
              title={t('library.studyShortcut')}
              aria-label={t('library.studyShortcut')}
            >
              <GraduationCap size={15} />
            </button>
          )}
          <button
            type="button"
            className="book-card-action-btn"
            onClick={(e) => {
              e.stopPropagation();
              onContextMenu(e);
            }}
            title={t('library.options')}
            aria-label={t('library.options')}
          >
            <MoreVertical size={15} />
          </button>
        </div>

        {!fileAvailable && (
          <div className="book-card-unavailable-badge">
            <FileWarning size={14} />
            {t('library.unavailable')}
          </div>
        )}
      </div>

      <div className="book-card-info">
        <h3 className="book-card-title truncate">{book.title}</h3>
        {book.author && <p className="book-card-author truncate">{book.author}</p>}

        {book.tags && book.tags.length > 0 && (
          <div className="book-card-tags">
            {book.tags.slice(0, 2).map((tag) => {
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
            {book.tags.length > 2 && (
              <span className="book-tag-chip more">+{book.tags.length - 2}</span>
            )}
          </div>
        )}

        {book.totalPages > 0 && (
          <p className="book-card-pages">
            {book.currentPage} / {book.totalPages} {t('common.pages')}
          </p>
        )}
        {book.status !== 'not-started' && book.totalPages > 0 && (
          <div className="book-card-progress">
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="book-card-percent">{progress}%</span>
          </div>
        )}
        <div className="book-card-meta">
          <span
            className={`badge badge-${book.status === 'completed' ? 'success' : book.status === 'reading' ? 'accent' : 'warning'}`}
          >
            {statusLabel}
          </span>
          {book.lastReadAt && <span className="book-card-date">{formatDate(book.lastReadAt)}</span>}
        </div>
      </div>
    </div>
  );
}
