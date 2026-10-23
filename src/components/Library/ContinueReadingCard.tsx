import { ArrowRight } from 'lucide-react';
import type { Book } from '@/types';

interface ContinueReadingCardProps {
  book: Book;
  onOpenBook: (book: Book) => void;
}

export function ContinueReadingCard({ book, onOpenBook }: ContinueReadingCardProps) {
  return (
    <section className="continue-section">
      <button className="continue-card" onClick={() => onOpenBook(book)}>
        {book.coverDataUrl && (
          <img src={book.coverDataUrl} alt="" className="continue-cover" />
        )}
        <div className="continue-info">
          <span className="continue-label">Continuar leitura</span>
          <span className="continue-title">{book.title}</span>
          <span className="continue-page">
            Página {book.currentPage} de {book.totalPages}
          </span>
        </div>
        <ArrowRight size={20} className="continue-arrow" />
      </button>
    </section>
  );
}

