import { useEffect, useRef } from 'react';
import {
  BookOpen,
  Bookmark,
  GraduationCap,
  NotebookPen,
  Pencil,
  MapPin,
  Copy,
  Trash2,
  Tag,
  MonitorUp,
} from 'lucide-react';
import { libraryService } from '@/services/library-service';
import { useTranslation } from '@/stores/useI18nStore';
import type { Book } from '@/types';
import './BookContextMenu.css';

interface BookContextMenuProps {
  book: Book;
  x: number;
  y: number;
  onClose: () => void;
  onOpenBook: (book: Book) => void;
  onOpenNotebook: (book: Book) => void;
  onOpenBookmarks: (book: Book) => void;
  onOpenStudy: (book: Book) => void;
  onRename: (book: Book) => void;
  onManageTags: (book: Book) => void;
  onCreateShortcut: (book: Book) => void;
  onRemove: (book: Book) => void;
  onRelocate: (bookId: string) => void;
}

export function BookContextMenu({
  book,
  x,
  y,
  onClose,
  onOpenBook,
  onOpenNotebook,
  onOpenBookmarks,
  onOpenStudy,
  onRename,
  onManageTags,
  onCreateShortcut,
  onRemove,
  onRelocate,
}: BookContextMenuProps) {
  const { t } = useTranslation();
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
    left: Math.min(x, window.innerWidth - 270),
    top: Math.min(y, window.innerHeight - 380),
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
            onOpenBook(book);
          }}
        >
          <BookOpen size={14} />
          {t('menu.continueReading')}
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
          {t('menu.manageTags')}
        </button>

        <button
          type="button"
          className="context-menu-item"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
            onOpenNotebook(book);
          }}
        >
          <NotebookPen size={14} />
          {t('menu.notebook')}
        </button>

        <button
          type="button"
          className="context-menu-item"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
            onOpenBookmarks(book);
          }}
        >
          <Bookmark size={14} />
          {t('menu.bookmarks')}
        </button>

        <button
          type="button"
          className="context-menu-item"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
            onOpenStudy(book);
          }}
        >
          <GraduationCap size={14} />
          {t('menu.studyMode')}
        </button>

        <div className="context-menu-divider" />

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
          {t('menu.rename')}
        </button>

        <button
          type="button"
          className="context-menu-item"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
            onCreateShortcut(book);
          }}
        >
          <MonitorUp size={14} />
          {t('menu.createShortcut')}
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
          {t('menu.relocate')}
        </button>

        {!book.isManaged && (
          <button type="button" className="context-menu-item" onClick={handleImportCopy}>
            <Copy size={14} />
            {t('menu.importCopy')}
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
          {t('menu.remove')}
        </button>
      </div>
    </>
  );
}
