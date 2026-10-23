import { BookOpen, Plus, FolderOpen } from 'lucide-react';
import { useLibraryStore } from '@/stores/useLibraryStore';

export function LibraryEmptyState() {
  const totalBooks = useLibraryStore((s) => s.library.books.length);
  const addFiles = useLibraryStore((s) => s.addFiles);
  const addFolder = useLibraryStore((s) => s.addFolder);

  const isLibraryEmpty = totalBooks === 0;

  return (
    <div className="empty-state">
      <BookOpen size={64} className="empty-state-icon" />
      <h2 className="empty-state-title">
        {isLibraryEmpty ? 'Sua biblioteca está vazia' : 'Nenhum livro encontrado'}
      </h2>
      <p className="empty-state-text">
        {isLibraryEmpty
          ? 'Adicione seus PDFs para começar a ler. Você pode selecionar arquivos individuais ou uma pasta inteira.'
          : 'Tente ajustar os filtros ou o termo de pesquisa.'}
      </p>
      {isLibraryEmpty && (
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-primary btn-lg" onClick={addFiles}>
            <Plus size={18} />
            Adicionar PDFs
          </button>
          <button className="btn btn-secondary btn-lg" onClick={addFolder}>
            <FolderOpen size={18} />
            Adicionar pasta
          </button>
        </div>
      )}
    </div>
  );
}

