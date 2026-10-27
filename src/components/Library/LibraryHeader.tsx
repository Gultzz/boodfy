import {
  Search,
  Plus,
  FolderOpen,
  RefreshCw,
  History,
  GraduationCap,
  Settings,
} from 'lucide-react';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useAppStore } from '@/stores/useAppStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ICON_MD } from '@/components/ui/icon';
import { ReadingStreakBadge } from './ReadingStreakBadge';

export function LibraryHeader() {
  const search = useLibraryStore((s) => s.search);
  const setSearch = useLibraryStore((s) => s.setSearch);
  const addFiles = useLibraryStore((s) => s.addFiles);
  const addFolder = useLibraryStore((s) => s.addFolder);
  const refreshWatchFolder = useLibraryStore((s) => s.refreshWatchFolder);
  const watchFolder = useLibraryStore((s) => s.library.watchFolder);
  const navigateTo = useAppStore((s) => s.navigateTo);

  return (
    <header className="app-header library-header">
      <div className="app-header-left">
        <h1 className="app-header-title">
          <img
            src="./logo-extended.png"
            alt="Boodfy"
            className="app-header-logo"
          />
        </h1>
      </div>
      <div className="library-header-center">
        <div className="search-box">
          <Search size={ICON_MD} className="search-icon" />
          <Input
            className="search-input"
            placeholder="Pesquisar livros..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="app-header-right">
        <ReadingStreakBadge />
        <Button onClick={addFiles} title="Adicionar PDFs">
          <Plus size={ICON_MD} />
          Adicionar
        </Button>
        <Button variant="ghost" size="icon" onClick={addFolder} title="Adicionar pasta">
          <FolderOpen size={ICON_MD} />
        </Button>
        {watchFolder && (
          <Button
            variant="ghost"
            size="icon"
            onClick={refreshWatchFolder}
            title="Atualizar pasta monitorada"
          >
            <RefreshCw size={ICON_MD} />
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={() => navigateTo('study')} title="Estudos">
          <GraduationCap size={ICON_MD} />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => navigateTo('history')} title="Histórico">
          <History size={ICON_MD} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigateTo('settings')}
          title="Configurações"
        >
          <Settings size={ICON_MD} />
        </Button>
      </div>
    </header>
  );
}
