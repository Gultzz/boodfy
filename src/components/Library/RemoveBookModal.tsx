import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Book } from '@/types';

interface RemoveBookModalProps {
  book: Book;
  isUnavailable?: boolean;
  onClose: () => void;
  onConfirm: (bookId: string, deleteFile: boolean) => void;
}

export function RemoveBookModal({ book, isUnavailable, onClose, onConfirm }: RemoveBookModalProps) {
  const [deleteFile, setDeleteFile] = useState(false);

  const handleConfirm = () => {
    onConfirm(book.id, deleteFile);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3
          className="modal-title"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--error, #ef4444)' }}
        >
          <Trash2 size={18} />
          Remover da biblioteca
        </h3>
        <div
          className="modal-body"
          style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
          <p>
            Tem certeza de que deseja remover <strong>{book.title}</strong> da sua biblioteca?
          </p>
          {isUnavailable ? (
            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
              Este arquivo não foi encontrado no disco. Ele será removido apenas da lista da biblioteca.
            </p>
          ) : (
            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
              O arquivo original na sua pasta <strong>não</strong> será excluído.
            </p>
          )}

          {book.isManaged && !isUnavailable && (
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                marginTop: '4px',
              }}
            >
              <input
                type="checkbox"
                checked={deleteFile}
                onChange={(e) => setDeleteFile(e.target.checked)}
              />
              <span>Também excluir o arquivo copiado do computador</span>
            </label>
          )}
        </div>
        <div className="modal-actions">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" onClick={handleConfirm}>
            Remover da biblioteca
          </Button>
        </div>
      </div>
    </div>
  );
}

