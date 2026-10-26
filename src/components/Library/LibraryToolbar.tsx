import { Grid3x3, List } from 'lucide-react';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { Button } from '@/components/ui/button';
import { ICON_MD } from '@/components/ui/icon';
import type { FilterMode, SortMode } from '@/types';

const FILTERS: { key: FilterMode; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'not-started', label: 'Não iniciados' },
  { key: 'reading', label: 'Em andamento' },
  { key: 'completed', label: 'Concluídos' },
  { key: 'recent', label: 'Recentes' },
];

const SORTS: { key: SortMode; label: string }[] = [
  { key: 'lastRead', label: 'Última leitura' },
  { key: 'title', label: 'Título' },
  { key: 'addedAt', label: 'Data de adição' },
];

export function LibraryToolbar() {
  const filter = useLibraryStore((s) => s.filter);
  const setFilter = useLibraryStore((s) => s.setFilter);
  const sort = useLibraryStore((s) => s.sort);
  const setSort = useLibraryStore((s) => s.setSort);
  const viewMode = useLibraryStore((s) => s.viewMode);
  const setViewMode = useLibraryStore((s) => s.setViewMode);
  const selectedTag = useLibraryStore((s) => s.selectedTag);
  const setSelectedTag = useLibraryStore((s) => s.setSelectedTag);
  const allTags = useLibraryStore((s) => s.getAllTags)();

  return (
    <div className="library-toolbar">
      <div className="tabs-list" role="tablist">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            role="tab"
            aria-selected={filter === f.key}
            className={`tabs-trigger ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="toolbar-right">
        {allTags.length > 0 && (
          <select
            className="input tag-select"
            value={selectedTag || ''}
            onChange={(e) => setSelectedTag(e.target.value ? e.target.value : null)}
            title="Filtrar por tag ou coleção"
          >
            <option value="">Todas as coleções / tags</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>
                Tag: {tag}
              </option>
            ))}
          </select>
        )}

        <select
          className="input sort-select"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortMode)}
        >
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>

        <div className="toggle-group">
          <Button
            variant="ghost"
            size="icon"
            className={viewMode === 'grid' ? 'active' : ''}
            onClick={() => setViewMode('grid')}
            title="Visualização em grade"
          >
            <Grid3x3 size={ICON_MD} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={viewMode === 'list' ? 'active' : ''}
            onClick={() => setViewMode('list')}
            title="Visualização em lista"
          >
            <List size={ICON_MD} />
          </Button>
        </div>
      </div>
    </div>
  );
}
