import { ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { useTranslation } from '@/stores/useI18nStore';

interface ReaderFooterProps {
  pages: number[];
  totalPages: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  onGoToPage: (page: number) => void;
}

export function ReaderFooter({
  pages,
  totalPages,
  onPrevPage,
  onNextPage,
  onGoToPage,
}: ReaderFooterProps) {
  const { t } = useTranslation();
  const first = pages[0] ?? 1;
  const last = pages[pages.length - 1] ?? first;
  const pageLabel = pages.length > 1 ? `${first}–${last}` : String(first);
  const atStart = first <= 1;
  const atEnd = last >= totalPages;
  const percent = totalPages > 0 ? Math.min(100, Math.round((last / totalPages) * 100)) : 0;

  return (
    <footer className="reader-footer">
      <div className="reader-footer-inner">
        <button
          className="btn btn-secondary btn-icon btn-sm"
          onClick={onPrevPage}
          disabled={atStart}
          title="←"
          aria-label="Previous page"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="reader-slider-group">
          <span className="footer-page-indicator">
            {pageLabel} / {totalPages || '—'}
          </span>
          {totalPages > 1 && (
            <input
              type="range"
              className="reader-page-slider"
              min={1}
              max={totalPages}
              value={first}
              onChange={(e) => onGoToPage(Number(e.target.value))}
              aria-label={`${t('common.page')} ${first} ${t('common.of')} ${totalPages}`}
            />
          )}
          <span className="footer-percent-indicator">{percent}%</span>
        </div>

        <button
          className="btn btn-secondary btn-icon btn-sm"
          onClick={onNextPage}
          disabled={atEnd}
          title="→"
          aria-label="Next page"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {atEnd && totalPages > 0 && (
        <div className="completed-badge">
          <CheckCircle size={14} /> {t('reader.completed')}
        </div>
      )}
    </footer>
  );
}
