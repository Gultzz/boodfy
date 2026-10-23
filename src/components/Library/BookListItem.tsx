import { FileWarning, BookOpen } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Book } from '@/types';
import './BookListItem.css';

interface BookListItemProps {
  book: Book;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

export function BookListItem({ book, onClick, onContextMenu }: BookListItemProps) {
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
    if (!date) return '—';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  return (
    <button
      className={`book-list-item ${!fileAvailable ? 'book-list-item-unavailable' : ''}`}
      onClick={fileAvailable ? onClick : undefined}
      onContextMenu={onContextMenu}
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
      <div className="book-list-title truncate">{book.title}</div>
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
    </button>
  );
}
