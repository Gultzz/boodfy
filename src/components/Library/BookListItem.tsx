import { FileWarning, BookOpen, MoreVertical } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Book } from '@/types';
import './BookListItem.css';

interface BookListItemProps {
  book: Book;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onUnavailableClick?: (book: Book) => void;
}

export function BookListItem({ book, onClick, onContextMenu, onUnavailableClick }: BookListItemProps) {
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
      title={fileAvailable ? `Abrir ${book.title}` : 'Arquivo indisponível - clique para opções'}
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

      <button
        type="button"
        className="book-list-more-btn"
        onClick={(e) => {
          e.stopPropagation();
          onContextMenu(e);
        }}
        title="Opções do livro"
      >
        <MoreVertical size={16} />
      </button>
    </div>
  );
}
