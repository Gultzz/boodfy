import { BookOpen, Search, Plus, FolderOpen, RefreshCw, History, Settings } from 'lucide-react';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useAppStore } from '@/stores/useAppStore';

export function LibraryHeader() {
  const search = useLibraryStore((s) => s.search);
  const setSearch = useLibraryStore((s) => s.setSearch);
  const addFiles = useLibraryStore((s) => s.addFiles);
  const addFolder = useLibraryStore((s) => s.addFolder);
  const refreshWatchFolder = useLibraryStore((s) => s.refreshWatchFolder);
  const watchFolder = useLibraryStore((s) => s.library.watchFolder);
  const navigateTo = useAppStore((s) => s.navigateTo);

  return (
    <header className="library-header">
      <div className="library-header-left">
        <h1 className="library-title">
          <BookOpen size={24} />
          BooklyPDF
        </h1>
      </div>
      <div className="library-header-center">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="input search-input"
            placeholder="Pesquisar livros..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="library-header-right">
        <button className="btn btn-primary" onClick={addFiles} title="Adicionar PDFs">
          <Plus size={16} />
          Adicionar
        </button>
        <button className="btn btn-ghost btn-icon" onClick={addFolder} title="Adicionar pasta">
          <FolderOpen size={18} />
        </button>
        {watchFolder && (
          <button
            className="btn btn-ghost btn-icon"
            onClick={refreshWatchFolder}
            title="Atualizar pasta monitorada"
          >
            <RefreshCw size={18} />
          </button>
        )}
        <button
          className="btn btn-ghost btn-icon"
          onClick={() => navigateTo('history')}
          title="Histórico"
        >
          <History size={18} />
        </button>
        <button
          className="btn btn-ghost btn-icon"
          onClick={() => navigateTo('settings')}
          title="Configurações"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
}

