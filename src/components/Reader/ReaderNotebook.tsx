import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Highlighter,
  NotebookPen,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import {
  EMPTY_BOOK_ANNOTATIONS,
  useAnnotationsStore,
} from '@/stores/useAnnotationsStore';
import { useTranslation } from '@/stores/useI18nStore';
import { ANNOTATION_COLORS, ANNOTATION_COLOR_ORDER } from '@/lib/colors';
import type { AnnotationColor, Highlight, Note } from '@/types';
import './ReaderNotebook.css';

interface ReaderNotebookProps {
  bookId: string;
  currentPage: number;
  initialDraftHighlightId?: string | null;
  onClearDraftHighlight?: () => void;
  onJumpToPage: (page: number) => void;
  onJumpToHighlight: (highlight: Highlight) => void;
  onClose: () => void;
}

export function ReaderNotebook({
  bookId,
  currentPage,
  initialDraftHighlightId = null,
  onClearDraftHighlight,
  onJumpToPage,
  onJumpToHighlight,
  onClose,
}: ReaderNotebookProps) {
  const { t, locale } = useTranslation();
  const bookData = useAnnotationsStore((s) => s.data.books[bookId]);
  const addNote = useAnnotationsStore((s) => s.addNote);
  const updateNote = useAnnotationsStore((s) => s.updateNote);
  const removeNote = useAnnotationsStore((s) => s.removeNote);
  const updateHighlightColor = useAnnotationsStore((s) => s.updateHighlightColor);
  const removeHighlight = useAnnotationsStore((s) => s.removeHighlight);

  const annotations = bookData ?? EMPTY_BOOK_ANNOTATIONS;
  const highlights = annotations.highlights;
  const notes = annotations.notes;

  const [activeTab, setActiveTab] = useState<'notes' | 'highlights'>('notes');
  const [noteScope, setNoteScope] = useState<'page' | 'all'>('all');
  const [highlightColorFilter, setHighlightColorFilter] = useState<AnnotationColor | 'all'>('all');

  // Composer state
  const [composerOpen, setComposerOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [draftHighlightId, setDraftHighlightId] = useState<string | null>(null);

  // Open composer automatically when user clicks "Anotar no caderno" after highlighting
  useEffect(() => {
    if (initialDraftHighlightId) {
      setActiveTab('notes');
      setEditingNoteId(null);
      setDraftTitle('');
      setDraftContent('');
      setDraftHighlightId(initialDraftHighlightId);
      setComposerOpen(true);
      onClearDraftHighlight?.();
    }
  }, [initialDraftHighlightId, onClearDraftHighlight]);

  const highlightById = useMemo(
    () => new Map(highlights.map((h) => [h.id, h])),
    [highlights],
  );

  const filteredNotes = useMemo(() => {
    if (noteScope === 'page') {
      return notes.filter((n) => n.pageNumber === currentPage);
    }
    return notes;
  }, [notes, noteScope, currentPage]);

  const filteredHighlights = useMemo(() => {
    const list =
      highlightColorFilter === 'all'
        ? highlights
        : highlights.filter((h) => h.color === highlightColorFilter);
    return [...list].sort((a, b) => a.pageNumber - b.pageNumber || a.number - b.number);
  }, [highlights, highlightColorFilter]);

  const pageHighlights = useMemo(
    () => highlights.filter((h) => h.pageNumber === currentPage),
    [highlights, currentPage],
  );

  const selectableHighlights = useMemo(() => {
    // Show highlights on current page first, then any other highlights
    const onPage = pageHighlights;
    const others = highlights.filter((h) => h.pageNumber !== currentPage);
    return [...onPage, ...others];
  }, [pageHighlights, highlights, currentPage]);

  const resetComposer = () => {
    setComposerOpen(false);
    setEditingNoteId(null);
    setDraftTitle('');
    setDraftContent('');
    setDraftHighlightId(null);
  };

  const handleOpenNewNote = (highlightId: string | null = null) => {
    setActiveTab('notes');
    setEditingNoteId(null);
    setDraftTitle('');
    setDraftContent('');
    setDraftHighlightId(highlightId);
    setComposerOpen(true);
  };

  const handleStartEditNote = (note: Note) => {
    setEditingNoteId(note.id);
    setDraftTitle(note.title || '');
    setDraftContent(note.content);
    setDraftHighlightId(note.highlightId ?? null);
    setComposerOpen(true);
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftContent.trim()) return;

    if (editingNoteId) {
      await updateNote(bookId, editingNoteId, {
        title: draftTitle,
        content: draftContent,
        highlightId: draftHighlightId,
      });
    } else {
      const linkedHl = draftHighlightId ? highlightById.get(draftHighlightId) : undefined;
      await addNote({
        bookId,
        pageNumber: linkedHl ? linkedHl.pageNumber : currentPage,
        title: draftTitle,
        content: draftContent,
        highlightId: draftHighlightId,
      });
    }

    resetComposer();
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: 'short' });
    } catch {
      return '';
    }
  };

  return (
    <aside className="reader-side-panel notebook-panel" aria-label={t('notebook.title')}>
      <header className="side-panel-header">
        <div className="side-panel-title">
          <NotebookPen size={16} />
          <h4>{t('notebook.title')}</h4>
        </div>
        <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} title={t('common.close')}>
          <X size={16} />
        </button>
      </header>

      <div className="side-panel-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'notes'}
          className={`side-panel-tab ${activeTab === 'notes' ? 'active' : ''}`}
          onClick={() => setActiveTab('notes')}
        >
          <NotebookPen size={14} />
          <span>{t('notebook.tabNotes')}</span>
          <span className="side-panel-count">{notes.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'highlights'}
          className={`side-panel-tab ${activeTab === 'highlights' ? 'active' : ''}`}
          onClick={() => setActiveTab('highlights')}
        >
          <Highlighter size={14} />
          <span>{t('notebook.tabHighlights')}</span>
          <span className="side-panel-count">{highlights.length}</span>
        </button>
      </div>

      {activeTab === 'notes' && (
        <div className="side-panel-body">
          <div className="notebook-toolbar">
            <div className="notebook-scope-toggle">
              <button
                type="button"
                className={`scope-pill ${noteScope === 'page' ? 'active' : ''}`}
                onClick={() => setNoteScope('page')}
              >
                {t('notebook.filterPage')}
              </button>
              <button
                type="button"
                className={`scope-pill ${noteScope === 'all' ? 'active' : ''}`}
                onClick={() => setNoteScope('all')}
              >
                {t('notebook.filterAll')}
              </button>
            </div>
            {!composerOpen && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => handleOpenNewNote(null)}
              >
                <Plus size={14} />
                {t('notebook.newNote')}
              </button>
            )}
          </div>

          {composerOpen && (
            <form className="notebook-composer" onSubmit={(e) => void handleSaveNote(e)}>
              <input
                type="text"
                className="input"
                placeholder={t('notebook.noteTitlePlaceholder')}
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
              />
              <textarea
                className="input notebook-textarea"
                rows={4}
                placeholder={t('notebook.noteContentPlaceholder')}
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                autoFocus
              />
              <label className="notebook-link-field">
                <span>{t('notebook.linkLabel')}</span>
                <select
                  className="input"
                  value={draftHighlightId ?? ''}
                  onChange={(e) => setDraftHighlightId(e.target.value || null)}
                >
                  <option value="">{t('notebook.linkPageOnly', { page: currentPage })}</option>
                  {selectableHighlights.map((hl) => (
                    <option key={hl.id} value={hl.id}>
                      {t('notebook.linkHighlight', {
                        n: hl.number,
                        meaning: t(`annotation.${hl.color}`),
                      })}{' '}
                      ({t('common.page')} {hl.pageNumber})
                    </option>
                  ))}
                </select>
              </label>

              <div className="notebook-composer-actions">
                <button type="button" className="btn btn-ghost btn-sm" onClick={resetComposer}>
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={!draftContent.trim()}
                >
                  {editingNoteId ? t('notebook.updateNote') : t('notebook.saveNote')}
                </button>
              </div>
            </form>
          )}

          {filteredNotes.length === 0 ? (
            <p className="side-panel-empty">{t('notebook.emptyNotes')}</p>
          ) : (
            <div className="notebook-list">
              {filteredNotes.map((note) => {
                const linkedHl = note.highlightId ? highlightById.get(note.highlightId) : undefined;
                const hlMeta = linkedHl ? ANNOTATION_COLORS[linkedHl.color] : null;

                return (
                  <article key={note.id} className="notebook-item">
                    <div className="notebook-item-top">
                      {linkedHl && hlMeta ? (
                        <button
                          type="button"
                          className="notebook-jump-pill"
                          style={{
                            backgroundColor: hlMeta.fill,
                            borderColor: hlMeta.border,
                            color: 'var(--text-primary)',
                          }}
                          onClick={() => onJumpToHighlight(linkedHl)}
                          title={linkedHl.quote || t('notebook.highlightBadge', { n: linkedHl.number, page: linkedHl.pageNumber })}
                        >
                          <span
                            className="notebook-jump-dot"
                            style={{ backgroundColor: hlMeta.hex }}
                          />
                          <span>
                            {t('notebook.highlightBadge', {
                              n: linkedHl.number,
                              page: linkedHl.pageNumber,
                            })}
                          </span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="notebook-jump-pill neutral"
                          onClick={() => onJumpToPage(note.pageNumber)}
                        >
                          <span>{t('notebook.jumpToPage', { page: note.pageNumber })}</span>
                        </button>
                      )}

                      <div className="notebook-item-actions">
                        <button
                          type="button"
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => handleStartEditNote(note)}
                          title={t('common.edit')}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => void removeNote(bookId, note.id)}
                          title={t('common.delete')}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {note.title && <h5 className="notebook-item-title">{note.title}</h5>}
                    <p className="notebook-item-content">{note.content}</p>
                    <span className="notebook-item-date">{formatDate(note.updatedAt)}</span>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'highlights' && (
        <div className="side-panel-body">
          <div className="highlight-filter-row">
            <button
              type="button"
              className={`scope-pill ${highlightColorFilter === 'all' ? 'active' : ''}`}
              onClick={() => setHighlightColorFilter('all')}
            >
              {t('common.all')}
            </button>
            {ANNOTATION_COLOR_ORDER.map((c) => {
              const meta = ANNOTATION_COLORS[c];
              const active = highlightColorFilter === c;
              return (
                <button
                  key={c}
                  type="button"
                  className={`highlight-filter-dot ${active ? 'active' : ''}`}
                  style={{ backgroundColor: meta.hex }}
                  onClick={() => setHighlightColorFilter(active ? 'all' : c)}
                  title={t(`annotation.${c}`)}
                />
              );
            })}
          </div>

          {filteredHighlights.length === 0 ? (
            <p className="side-panel-empty">{t('notebook.emptyHighlights')}</p>
          ) : (
            <div className="notebook-list">
              {filteredHighlights.map((hl) => {
                const meta = ANNOTATION_COLORS[hl.color];
                return (
                  <article
                    key={hl.id}
                    className="notebook-item highlight-list-card"
                    style={{ borderLeftColor: meta.hex }}
                  >
                    <div className="notebook-item-top">
                      <button
                        type="button"
                        className="notebook-jump-pill"
                        style={{
                          backgroundColor: meta.fill,
                          borderColor: meta.border,
                          color: 'var(--text-primary)',
                        }}
                        onClick={() => onJumpToHighlight(hl)}
                      >
                        <span className="notebook-jump-dot" style={{ backgroundColor: meta.hex }} />
                        <span>
                          #{hl.number} · {t(`annotation.${hl.color}`)} · {t('common.page')}{' '}
                          {hl.pageNumber}
                        </span>
                        <ArrowUpRight size={12} />
                      </button>

                      <div className="notebook-item-actions">
                        <button
                          type="button"
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => handleOpenNewNote(hl.id)}
                          title={t('highlight.annotate')}
                        >
                          <NotebookPen size={13} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => void removeHighlight(bookId, hl.id)}
                          title={t('highlight.remove')}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {hl.quote && <blockquote className="highlight-quote">“{hl.quote}”</blockquote>}

                    <div className="highlight-card-footer">
                      <div className="highlight-quick-colors">
                        {ANNOTATION_COLOR_ORDER.map((c) => (
                          <button
                            key={c}
                            type="button"
                            className={`highlight-color-dot sm ${hl.color === c ? 'active' : ''}`}
                            style={{ backgroundColor: ANNOTATION_COLORS[c].hex }}
                            onClick={() => void updateHighlightColor(bookId, hl.id, c)}
                            title={t(`annotation.${c}`)}
                          />
                        ))}
                      </div>
                      <span className="notebook-item-date">
                        {hl.mode === 'fluid' ? t('reader.modeFluid') : t('reader.modePdf')}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
