import { ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';

interface ReaderFooterProps {
  pages: number[];
  totalPages: number;
  onPrevPage: () => void;
  onNextPage: () => void;
}

export function ReaderFooter({ pages, totalPages, onPrevPage, onNextPage }: ReaderFooterProps) {
  const first = pages[0];
  const last = pages[pages.length - 1];
  const pageLabel = pages.length > 1 ? `${first}–${last}` : String(first);
  const atStart = first <= 1;
  const atEnd = last >= totalPages;

  return (
    <footer className="reader-footer">
      <div className="reader-nav-buttons">
        <button
          className="btn btn-secondary btn-icon"
          onClick={onPrevPage}
          disabled={atStart}
          title="Página Anterior (Seta Esquerda)"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="footer-page-indicator">
          {pageLabel} / {totalPages || '—'}
        </span>
        <button
          className="btn btn-secondary btn-icon"
          onClick={onNextPage}
          disabled={atEnd}
          title="Próxima Página (Seta Direita)"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {atEnd && totalPages > 0 && (
        <div className="completed-badge">
          <CheckCircle size={14} /> Leitura concluída!
        </div>
      )}
    </footer>
  );
}
