import { FileWarning, BookOpen } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Book } from '@/types';
import './BookCard.css';

interface BookCardProps {
  book: Book;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

export function BookCard({ book, onClick, onContextMenu }: BookCardProps) {
  const [fileAvailable, setFileAvailable] = useState(true);

  useEffect(() => {
    window.electronAPI.fileExists(book.filePath).then(setFileAvailable);
  }, [book.filePath]);

  const progress = book.totalPages > 0 ? Math.round((book.currentPage / book.totalPages) * 100) : 0;

  const statusLabel = {
    'not-started': 'Não iniciado',
    reading: 'Em andamento',
    completed: 'Concluído',
  }[book.status];

  const formatDate = (date: string | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    });
  };

  return (
    <button
      className={`book-card card ${!fileAvailable ? 'book-card-unavailable' : ''}`}
      onClick={fileAvailable ? onClick : undefined}
      onContextMenu={onContextMenu}
      title={fileAvailable ? `Abrir ${book.title}` : 'Arquivo indisponível'}
    >
      <div className="book-card-cover">
        {book.coverDataUrl ? (
          <img src={book.coverDataUrl} alt={book.title} className="book-card-cover-img" />
        ) : (
          <div className="book-card-cover-placeholder">
            {fileAvailable ? <BookOpen size={32} /> : <FileWarning size={32} />}
          </div>
        )}
        {!fileAvailable && (
          <div className="book-card-unavailable-badge">
            <FileWarning size={14} />
            Indisponível
          </div>
        )}
      </div>
      <div className="book-card-info">
        <h3 className="book-card-title truncate">{book.title}</h3>
        {book.totalPages > 0 && (
          <p className="book-card-pages">
            {book.currentPage} / {book.totalPages} páginas
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
    </button>
  );
}
