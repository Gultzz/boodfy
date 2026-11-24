import { useState, useRef, useEffect } from 'react';
import { Tag, Plus, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useTranslation } from '@/stores/useI18nStore';
import { TAG_COLORS, TAG_COLOR_ORDER, resolveTagColor } from '@/lib/colors';
import type { Book, TagColor } from '@/types';
import './ManageTagsModal.css';

interface ManageTagsModalProps {
  book: Book;
  onClose: () => void;
  onSaveTags: (bookId: string, tags: string[], tagColors?: Record<string, TagColor>) => void;
}

export function ManageTagsModal({ book, onClose, onSaveTags }: ManageTagsModalProps) {
  const { t } = useTranslation();
  const [tags, setTags] = useState<string[]>(book.tags || []);
  const [newTagInput, setNewTagInput] = useState('');
  const [selectedColor, setSelectedColor] = useState<TagColor>('indigo');
  const storedTagColors = useLibraryStore((s) => s.library.tagColors);
  const [localColors, setLocalColors] = useState<Record<string, TagColor>>(
    () => ({ ...(storedTagColors || {}) }),
  );
  const allExistingTags = useLibraryStore((s) => s.getAllTags)();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const getColor = (tag: string): TagColor => resolveTagColor(tag, localColors);

  const handleAddTag = () => {
    const trimmed = newTagInput.trim();
    if (!trimmed) return;
    if (!tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
    }
    setLocalColors((prev) => ({ ...prev, [trimmed]: selectedColor }));
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((tag) => tag !== tagToRemove));
  };

  const handleCycleTagColor = (tag: string) => {
    const current = getColor(tag);
    const idx = TAG_COLOR_ORDER.indexOf(current);
    const next = TAG_COLOR_ORDER[(idx + 1) % TAG_COLOR_ORDER.length] ?? 'indigo';
    setLocalColors((prev) => ({ ...prev, [tag]: next }));
  };

  const handleSelectSuggestion = (suggestedTag: string) => {
    if (!tags.includes(suggestedTag)) {
      setTags((prev) => [...prev, suggestedTag]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTagInput.trim()) {
      handleAddTag();
    } else {
      onSaveTags(book.id, tags, localColors);
      onClose();
    }
  };

  const handleSaveFinal = () => {
    const finalTags = [...tags];
    const finalColors = { ...localColors };
    const trimmed = newTagInput.trim();
    if (trimmed) {
      if (!finalTags.includes(trimmed)) {
        finalTags.push(trimmed);
      }
      finalColors[trimmed] = selectedColor;
    }
    onSaveTags(book.id, finalTags, finalColors);
    onClose();
  };

  const suggestions = allExistingTags.filter((tag) => !tags.includes(tag));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Tag size={18} />
          {t('tags.modalTitle')}
        </h3>
        <div className="tags-modal-book-title" title={book.title}>
          {t('tags.bookLabel')} <strong>{book.title}</strong>
        </div>

        <div className="tags-active-list">
          {tags.length === 0 ? (
            <span className="tags-empty-hint">{t('tags.empty')}</span>
          ) : (
            tags.map((tag) => {
              const colorKey = getColor(tag);
              const meta = TAG_COLORS[colorKey];
              return (
                <span
                  key={tag}
                  className="tag-pill"
                  style={{
                    backgroundColor: meta.bg,
                    borderColor: meta.border,
                    color: meta.text,
                  }}
                >
                  <button
                    type="button"
                    className="tag-color-dot-btn"
                    style={{ backgroundColor: meta.hex }}
                    onClick={() => handleCycleTagColor(tag)}
                    title={`${t('highlight.changeColor')} (${t(`tags.color.${colorKey}`)})`}
                    aria-label={t('highlight.changeColor')}
                  />
                  <span>{tag}</span>
                  <button
                    type="button"
                    className="tag-remove-btn"
                    onClick={() => handleRemoveTag(tag)}
                    title={`${t('common.remove')} "${tag}"`}
                  >
                    <X size={12} />
                  </button>
                </span>
              );
            })
          )}
        </div>

        <form onSubmit={handleSubmit} className="tag-input-row">
          <Input
            ref={inputRef}
            value={newTagInput}
            onChange={(e) => setNewTagInput(e.target.value)}
            placeholder={t('tags.inputPlaceholder')}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={handleAddTag}
            disabled={!newTagInput.trim()}
          >
            <Plus size={16} style={{ marginRight: '4px' }} />
            {t('common.add')}
          </Button>
        </form>

        <div className="tag-color-picker">
          <span className="tag-color-picker-label">{t('tags.chooseColor')}</span>
          <div className="tag-color-swatches" role="radiogroup" aria-label={t('tags.chooseColor')}>
            {TAG_COLOR_ORDER.map((colorKey) => {
              const meta = TAG_COLORS[colorKey];
              const active = selectedColor === colorKey;
              return (
                <button
                  key={colorKey}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={`tag-color-swatch ${active ? 'active' : ''}`}
                  style={{ backgroundColor: meta.hex }}
                  onClick={() => setSelectedColor(colorKey)}
                  title={t(`tags.color.${colorKey}`)}
                >
                  {active && <Check size={12} color="#fff" strokeWidth={3} />}
                </button>
              );
            })}
          </div>
        </div>

        {suggestions.length > 0 && (
          <div className="tags-suggestions-section">
            <div className="tags-suggestions-label">{t('tags.existing')}</div>
            <div className="tags-suggestions-chips">
              {suggestions.map((st) => {
                const meta = TAG_COLORS[getColor(st)];
                return (
                  <button
                    key={st}
                    type="button"
                    className="tag-suggestion-chip"
                    style={{
                      backgroundColor: meta.bg,
                      borderColor: meta.border,
                      color: meta.text,
                    }}
                    onClick={() => handleSelectSuggestion(st)}
                  >
                    <Plus size={10} />
                    <span>{st}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="modal-actions">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="button" onClick={handleSaveFinal}>
            {t('tags.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}
