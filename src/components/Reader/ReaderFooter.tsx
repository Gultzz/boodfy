import { ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';

interface ReaderFooterProps {
  currentPage: number;
  totalPages: number;
  onPrevPage: () => void;
  onNextPage: () => void;
}

export function ReaderFooter({
  currentPage,
  totalPages,
  onPrevPage,
  onNextPage,
}: ReaderFooterProps) {
  return (
    <footer className="reader-footer">
      <div className="reader-nav-buttons">
        <button
          className="btn btn-secondary btn-icon"
          onClick={onPrevPage}
          disabled={currentPage <= 1}
          title="Página Anterior (Seta Esquerda)"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="footer-page-indicator">
          {currentPage} / {totalPages || '—'}
        </span>
        <button
          className="btn btn-secondary btn-icon"
          onClick={onNextPage}
          disabled={currentPage >= totalPages}
          title="Próxima Página (Seta Direita)"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {currentPage >= totalPages && totalPages > 0 && (
        <div className="completed-badge">
          <CheckCircle size={14} /> Leitura concluída!
        </div>
      )}
    </footer>
  );
}

