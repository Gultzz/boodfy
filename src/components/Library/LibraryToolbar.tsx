import { Grid3x3, List } from 'lucide-react';
import { useLibraryStore } from '@/stores/useLibraryStore';
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

  return (
    <div className="library-toolbar">
      <div className="filter-tabs">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`filter-tab ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="toolbar-right">
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

        <div className="view-toggle">
          <button
            className={`btn btn-icon btn-ghost ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Visualização em grade"
          >
            <Grid3x3 size={18} />
          </button>
          <button
            className={`btn btn-icon btn-ghost ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="Visualização em lista"
          >
            <List size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

