import { useState, useEffect, useRef } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Book } from '@/types';

interface RenameBookModalProps {
  book: Book;
  onClose: () => void;
  onRename: (bookId: string, newTitle: string) => void;
}

export function RenameBookModal({ book, onClose, onRename }: RenameBookModalProps) {
  const [title, setTitle] = useState(book.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onRename(book.id, trimmed);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Pencil size={18} />
          Renomear livro
        </h3>
        <p className="modal-body" style={{ marginBottom: '16px' }}>
          Altere o nome de exibição deste livro na biblioteca. O arquivo original na pasta não será renomeado.
        </p>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <Input
              ref={inputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título do livro"
              required
            />
          </div>
          <div className="modal-actions">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!title.trim()}>
              Salvar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

