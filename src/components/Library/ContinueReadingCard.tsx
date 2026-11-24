import { useEffect, useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import { useStudyStore } from '@/stores/useStudyStore';
import { useTranslation } from '@/stores/useI18nStore';
import { chapterForPage } from '@/services/study-chapters';
import type { Book } from '@/types';

interface ContinueReadingCardProps {
  book: Book;
  onOpenBook: (book: Book) => void;
}

export function ContinueReadingCard({ book, onOpenBook }: ContinueReadingCardProps) {
  const { t } = useTranslation();
  const loadStudy = useStudyStore((s) => s.load);
  const studyEntry = useStudyStore((s) => s.data.books[book.id]);

  useEffect(() => {
    void loadStudy();
  }, [loadStudy]);

  const currentChapter = useMemo(() => {
    if (!studyEntry?.chapters?.length) return null;
    return chapterForPage(studyEntry.chapters, book.currentPage) ?? null;
  }, [studyEntry, book.currentPage]);

  const percent =
    book.totalPages > 0 ? Math.min(100, Math.round((book.currentPage / book.totalPages) * 100)) : 0;

  return (
    <section className="continue-section">
      <button className="continue-card" onClick={() => onOpenBook(book)}>
        {book.coverDataUrl && (
          <img src={book.coverDataUrl} alt="" className="continue-cover" />
        )}
        <div className="continue-info">
          <span className="continue-label">{t('library.continueReading')}</span>
          <span className="continue-title truncate">{book.title}</span>
          {currentChapter && (
            <span className="continue-chapter truncate">{currentChapter.title}</span>
          )}
          <div className="continue-progress-row">
            <span className="continue-page">
              {t('common.page')} {book.currentPage} {t('common.of')} {book.totalPages || '—'} ·{' '}
              {percent}%
            </span>
            <div className="continue-progress-track">
              <div className="continue-progress-fill" style={{ width: `${percent}%` }} />
            </div>
          </div>
        </div>
        <span className="continue-cta">
          <span>{t('library.resumeReading')}</span>
          <ArrowRight size={16} className="continue-arrow" />
        </span>
      </button>
    </section>
  );
}
