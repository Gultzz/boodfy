import { useEffect, useRef } from 'react';
import { Pencil, MapPin, Copy, Trash2, Tag } from 'lucide-react';
import { libraryService } from '@/services/library-service';
import type { Book } from '@/types';
import './BookContextMenu.css';

interface BookContextMenuProps {
  book: Book;
  x: number;
  y: number;
  onClose: () => void;
  onRename: (book: Book) => void;
  onManageTags: (book: Book) => void;
  onRemove: (book: Book) => void;
  onRelocate: (bookId: string) => void;
}

export function BookContextMenu({
  book,
  x,
  y,
  onClose,
  onRename,
  onManageTags,
  onRemove,
  onRelocate,
}: BookContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

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

  const handleImportCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await libraryService.importCopy(book.id);
    onClose();
  };

  return (
    <>
      <div
        className="context-menu-backdrop"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />
      <div
        ref={menuRef}
        className="context-menu"
        style={style}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="context-menu-item"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
            onRename(book);
          }}
        >
          <Pencil size={14} />
          Renomear
        </button>

        <button
          type="button"
          className="context-menu-item"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
            onManageTags(book);
          }}
        >
          <Tag size={14} />
          Gerenciar tags
        </button>

        <button
          type="button"
          className="context-menu-item"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
            onRelocate(book.id);
          }}
        >
          <MapPin size={14} />
          Localizar arquivo
        </button>

        {!book.isManaged && (
          <button type="button" className="context-menu-item" onClick={handleImportCopy}>
            <Copy size={14} />
            Importar cópia
          </button>
        )}

        <div className="context-menu-divider" />

        <button
          type="button"
          className="context-menu-item context-menu-item-danger"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
            onRemove(book);
          }}
        >
          <Trash2 size={14} />
          Remover da biblioteca
        </button>
      </div>
    </>
  );
}
