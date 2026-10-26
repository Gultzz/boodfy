import { useState, useRef, useEffect } from 'react';
import { Tag, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLibraryStore } from '@/stores/useLibraryStore';
import type { Book } from '@/types';
import './ManageTagsModal.css';

interface ManageTagsModalProps {
  book: Book;
  onClose: () => void;
  onSaveTags: (bookId: string, tags: string[]) => void;
}

export function ManageTagsModal({ book, onClose, onSaveTags }: ManageTagsModalProps) {
  const [tags, setTags] = useState<string[]>(book.tags || []);
  const [newTagInput, setNewTagInput] = useState('');
  const allExistingTags = useLibraryStore((s) => s.getAllTags)();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleAddTag = () => {
    const trimmed = newTagInput.trim();
    if (!trimmed) return;
    if (!tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
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
      onSaveTags(book.id, tags);
      onClose();
    }
  };

  const handleSaveFinal = () => {
    const finalTags = [...tags];
    if (newTagInput.trim() && !finalTags.includes(newTagInput.trim())) {
      finalTags.push(newTagInput.trim());
    }
    onSaveTags(book.id, finalTags);
    onClose();
  };

  const suggestions = allExistingTags.filter((t) => !tags.includes(t));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Tag size={18} />
          Gerenciar Coleções e Tags
        </h3>
        <div className="tags-modal-book-title" title={book.title}>
          Livro: <strong>{book.title}</strong>
        </div>

        <div className="tags-active-list">
          {tags.length === 0 ? (
            <span className="tags-empty-hint">Nenhuma tag atribuída a este livro.</span>
          ) : (
            tags.map((t) => (
              <span key={t} className="tag-pill">
                <span>{t}</span>
                <button
                  type="button"
                  className="tag-remove-btn"
                  onClick={() => handleRemoveTag(t)}
                  title={`Remover tag "${t}"`}
                >
                  <X size={12} />
                </button>
              </span>
            ))
          )}
        </div>

        <form onSubmit={handleSubmit} className="tag-input-row">
          <Input
            ref={inputRef}
            value={newTagInput}
            onChange={(e) => setNewTagInput(e.target.value)}
            placeholder="Nome da tag (ex: Faculdade, Ficção...)"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={handleAddTag}
            disabled={!newTagInput.trim()}
          >
            <Plus size={16} style={{ marginRight: '4px' }} />
            Adicionar
          </Button>
        </form>

        {suggestions.length > 0 && (
          <div className="tags-suggestions-section">
            <div className="tags-suggestions-label">Tags existentes na biblioteca:</div>
            <div className="tags-suggestions-chips">
              {suggestions.map((st) => (
                <button
                  key={st}
                  type="button"
                  className="tag-suggestion-chip"
                  onClick={() => handleSelectSuggestion(st)}
                >
                  <Plus size={10} />
                  <span>{st}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="modal-actions">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSaveFinal}>
            Salvar tags
          </Button>
        </div>
      </div>
    </div>
  );
}
