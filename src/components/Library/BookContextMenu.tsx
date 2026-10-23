import { useEffect, useRef, useState } from 'react';
import { Trash2, MapPin, Copy } from 'lucide-react';
import { libraryService } from '@/services/library-service';
import type { Book } from '@/types';
import './BookContextMenu.css';

interface BookContextMenuProps {
  book: Book;
  x: number;
  y: number;
  onClose: () => void;
  onRemove: (bookId: string, deleteFile: boolean) => void;
  onRelocate: (bookId: string) => void;
}

export function BookContextMenu({
  book,
  x,
  y,
  onClose,
  onRemove,
  onRelocate,
}: BookContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  // Adjust position to stay within viewport
  const style: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(x, window.innerWidth - 220),
    top: Math.min(y, window.innerHeight - 200),
    zIndex: 1001,
  };

  const handleImportCopy = async () => {
    await libraryService.importCopy(book.id);
    onClose();
  };

  if (confirmDelete) {
    return (
      <div ref={menuRef} className="context-menu" style={style}>
        <div className="context-menu-confirm">
          <p>
            Remover <strong>{book.title}</strong> da biblioteca?
          </p>
          {book.isManaged && (
            <button
              className="context-menu-item context-menu-item-danger"
              onClick={() => onRemove(book.id, true)}
            >
              <Trash2 size={14} />
              Remover e apagar arquivo
            </button>
          )}
          <button className="context-menu-item" onClick={() => onRemove(book.id, false)}>
            <Trash2 size={14} />
            Remover apenas da biblioteca
          </button>
          <button className="context-menu-item" onClick={() => setConfirmDelete(false)}>
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={menuRef} className="context-menu" style={style}>
      <button className="context-menu-item" onClick={() => onRelocate(book.id)}>
        <MapPin size={14} />
        Localizar arquivo
      </button>
      {!book.isManaged && (
        <button className="context-menu-item" onClick={handleImportCopy}>
          <Copy size={14} />
          Importar cópia
        </button>
      )}
      <div className="context-menu-divider" />
      <button
        className="context-menu-item context-menu-item-danger"
        onClick={() => setConfirmDelete(true)}
      >
        <Trash2 size={14} />
        Remover da biblioteca
      </button>
    </div>
  );
}
