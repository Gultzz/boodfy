import { useState } from 'react';
import { Bookmark as BookmarkIcon, Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import {
  EMPTY_BOOK_ANNOTATIONS,
  useAnnotationsStore,
} from '@/stores/useAnnotationsStore';
import { useTranslation } from '@/stores/useI18nStore';
import { ANNOTATION_COLORS, ANNOTATION_COLOR_ORDER } from '@/lib/colors';
import type { AnnotationColor, Bookmark } from '@/types';
import './ReaderBookmarks.css';

interface ReaderBookmarksProps {
  bookId: string;
  currentPage: number;
  onJumpToPage: (page: number) => void;
  onClose: () => void;
}

export function ReaderBookmarks({
  bookId,
  currentPage,
  onJumpToPage,
  onClose,
}: ReaderBookmarksProps) {
  const { t } = useTranslation();
  const bookData = useAnnotationsStore((s) => s.data.books[bookId]);
  const addBookmark = useAnnotationsStore((s) => s.addBookmark);
  const updateBookmark = useAnnotationsStore((s) => s.updateBookmark);
  const removeBookmark = useAnnotationsStore((s) => s.removeBookmark);

  const bookmarks = (bookData ?? EMPTY_BOOK_ANNOTATIONS).bookmarks;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<AnnotationColor>('amber');
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await updateBookmark(bookId, editingId, {
        title: title.trim() || `${t('common.page')} ${currentPage}`,
        description,
        color,
      });
      setEditingId(null);
    } else {
      await addBookmark({
        bookId,
        pageNumber: currentPage,
        title: title.trim() || `${t('common.page')} ${currentPage}`,
        description,
        color,
      });
    }
    setTitle('');
    setDescription('');
  };

  const handleEdit = (bm: Bookmark) => {
    setEditingId(bm.id);
    setTitle(bm.title);
    setDescription(bm.description || '');
    setColor(bm.color);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setColor('amber');
  };

  return (
    <aside className="reader-side-panel bookmarks-panel" aria-label={t('bookmarks.title')}>
      <header className="side-panel-header">
        <div className="side-panel-title">
          <BookmarkIcon size={16} />
          <h4>{t('bookmarks.title')}</h4>
          {bookmarks.length > 0 && (
            <span className="side-panel-count">{bookmarks.length}</span>
          )}
        </div>
        <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} title={t('common.close')}>
          <X size={16} />
        </button>
      </header>

      <div className="side-panel-body">
        <form className="bookmark-form" onSubmit={(e) => void handleSubmit(e)}>
          <div className="bookmark-form-header">
            <Plus size={14} />
            <span>
              {editingId ? t('common.edit') : t('bookmarks.addCurrent', { page: currentPage })}
            </span>
          </div>

          <input
            type="text"
            className="input"
            placeholder={t('bookmarks.labelPlaceholder')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            type="text"
            className="input"
            placeholder={t('bookmarks.descPlaceholder')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="bookmark-color-grid">
            {ANNOTATION_COLOR_ORDER.map((c) => {
              const meta = ANNOTATION_COLORS[c];
              const active = color === c;
              return (
                <button
                  key={c}
                  type="button"
                  className={`bookmark-color-chip ${active ? 'active' : ''}`}
                  style={
                    active
                      ? { backgroundColor: meta.fill, borderColor: meta.hex, color: 'var(--text-primary)' }
                      : { borderColor: 'var(--border)' }
                  }
                  onClick={() => setColor(c)}
                >
                  <span className="notebook-jump-dot" style={{ backgroundColor: meta.hex }} />
                  <span>{t(`annotation.${c}`)}</span>
                  {active && <Check size={11} />}
                </button>
              );
            })}
          </div>

          <div className="notebook-composer-actions">
            {editingId && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleCancelEdit}>
                {t('common.cancel')}
              </button>
            )}
            <button type="submit" className="btn btn-primary btn-sm">
              {t('bookmarks.save')}
            </button>
          </div>
        </form>

        {bookmarks.length === 0 ? (
          <p className="side-panel-empty">{t('bookmarks.empty')}</p>
        ) : (
          <div className="notebook-list">
            {bookmarks.map((bm) => {
              const meta = ANNOTATION_COLORS[bm.color] ?? ANNOTATION_COLORS.amber;
              const isCurrent = bm.pageNumber === currentPage;

              return (
                <article
                  key={bm.id}
                  className={`bookmark-card ${isCurrent ? 'is-current' : ''}`}
                  style={{ borderLeftColor: meta.hex }}
                  onClick={() => onJumpToPage(bm.pageNumber)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onJumpToPage(bm.pageNumber);
                    }
                  }}
                >
                  <div className="bookmark-card-top">
                    <span
                      className="bookmark-page-pill"
                      style={{ backgroundColor: meta.fill, color: 'var(--text-primary)', borderColor: meta.border }}
                    >
                      <BookmarkIcon size={11} style={{ color: meta.hex }} />
                      {t('common.page')} {bm.pageNumber} · {t(`annotation.${bm.color}`)}
                    </span>
                    <div
                      className="notebook-item-actions"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => handleEdit(bm)}
                        title={t('common.edit')}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => void removeBookmark(bookId, bm.id)}
                        title={t('common.delete')}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <strong className="bookmark-card-title">{bm.title}</strong>
                  {bm.description && (
                    <p className="bookmark-card-desc">{bm.description}</p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
