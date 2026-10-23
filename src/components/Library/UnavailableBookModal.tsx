import { FileWarning, MapPin, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Book } from '@/types';

interface UnavailableBookModalProps {
  book: Book;
  onClose: () => void;
  onRelocate: (bookId: string) => void;
  onRequestRemove: (book: Book) => void;
}

export function UnavailableBookModal({
  book,
  onClose,
  onRelocate,
  onRequestRemove,
}: UnavailableBookModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3
          className="modal-title"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--warning, #f59e0b)' }}
        >
          <FileWarning size={18} />
          Arquivo indisponível
        </h3>
        <div
          className="modal-body"
          style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}
        >
          <p>
            O arquivo do livro <strong>{book.title}</strong> não foi encontrado no local esperado:
          </p>
          <code
            style={{
              display: 'block',
              padding: '8px 10px',
              backgroundColor: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '11px',
              wordBreak: 'break-all',
              color: 'var(--text-secondary)',
            }}
          >
            {book.filePath}
          </code>
          <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
            O arquivo pode ter sido movido, renomeado ou excluído. Você pode localizar o arquivo novamente ou removê-lo da sua biblioteca.
          </p>
        </div>
        <div className="modal-actions" style={{ flexWrap: 'wrap' }}>
          <Button type="button" variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              onClose();
              onRequestRemove(book);
            }}
          >
            <Trash2 size={14} style={{ marginRight: '6px' }} />
            Remover da lista
          </Button>
          <Button
            type="button"
            onClick={() => {
              onClose();
              onRelocate(book.id);
            }}
          >
            <MapPin size={14} style={{ marginRight: '6px' }} />
            Localizar arquivo
          </Button>
        </div>
      </div>
    </div>
  );
}

