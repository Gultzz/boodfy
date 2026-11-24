import { Grid3x3, List, X } from 'lucide-react';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useTranslation } from '@/stores/useI18nStore';
import { TAG_COLORS, resolveTagColor } from '@/lib/colors';
import { Button } from '@/components/ui/button';
import { ICON_MD } from '@/components/ui/icon';
import type { FilterMode, SortMode } from '@/types';

export function LibraryToolbar() {
  const { t } = useTranslation();
  const filter = useLibraryStore((s) => s.filter);
  const setFilter = useLibraryStore((s) => s.setFilter);
  const sort = useLibraryStore((s) => s.sort);
  const setSort = useLibraryStore((s) => s.setSort);
  const viewMode = useLibraryStore((s) => s.viewMode);
  const setViewMode = useLibraryStore((s) => s.setViewMode);
  const selectedTag = useLibraryStore((s) => s.selectedTag);
  const setSelectedTag = useLibraryStore((s) => s.setSelectedTag);
  const tagColors = useLibraryStore((s) => s.library.tagColors);
  const allTags = useLibraryStore((s) => s.getAllTags)();

  const filters: { key: FilterMode; label: string }[] = [
    { key: 'all', label: t('library.filter.all') },
    { key: 'reading', label: t('library.filter.reading') },
    { key: 'not-started', label: t('library.filter.notStarted') },
    { key: 'completed', label: t('library.filter.completed') },
    { key: 'recent', label: t('library.filter.recent') },
  ];

  const sorts: { key: SortMode; label: string }[] = [
    { key: 'lastRead', label: t('library.sort.lastRead') },
    { key: 'title', label: t('library.sort.title') },
    { key: 'addedAt', label: t('library.sort.addedAt') },
  ];

  return (
    <div className="library-toolbar-wrap">
      <div className="library-toolbar">
        <div className="tabs-list" role="tablist">
          {filters.map((f) => (
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
          <select
            className="input sort-select"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
          >
            {sorts.map((s) => (
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
              title={t('library.gridView')}
            >
              <Grid3x3 size={ICON_MD} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => setViewMode('list')}
              title={t('library.listView')}
            >
              <List size={ICON_MD} />
            </Button>
          </div>
        </div>
      </div>

      {allTags.length > 0 && (
        <div className="library-tag-bar" role="group" aria-label={t('library.allTags')}>
          <button
            type="button"
            className={`library-tag-filter-pill ${selectedTag === null ? 'active' : ''}`}
            onClick={() => setSelectedTag(null)}
          >
            {t('library.allTags')}
          </button>
          {allTags.map((tag) => {
            const meta = TAG_COLORS[resolveTagColor(tag, tagColors)];
            const isActive = selectedTag === tag;
            return (
              <button
                key={tag}
                type="button"
                className={`library-tag-filter-pill ${isActive ? 'active' : ''}`}
                style={
                  isActive
                    ? {
                        backgroundColor: meta.hex,
                        borderColor: meta.hex,
                        color: '#ffffff',
                      }
                    : {
                        backgroundColor: meta.bg,
                        borderColor: meta.border,
                        color: meta.text,
                      }
                }
                onClick={() => setSelectedTag(isActive ? null : tag)}
              >
                <span
                  className="library-tag-filter-dot"
                  style={{ backgroundColor: isActive ? '#ffffff' : meta.hex }}
                />
                <span>{tag}</span>
                {isActive && <X size={11} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
