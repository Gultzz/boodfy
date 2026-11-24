import { create } from 'zustand';
import { storage } from '@/services/storage';
import type {
  AnnotationColor,
  AnnotationsData,
  BookAnnotations,
  Bookmark,
  Highlight,
  HighlightRect,
  Note,
  ReaderViewMode,
} from '@/types';

export const EMPTY_BOOK_ANNOTATIONS: BookAnnotations = Object.freeze({
  highlights: [],
  notes: [],
  bookmarks: [],
  nextHighlightNumber: 1,
}) as BookAnnotations;

function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function ensureBookEntry(data: AnnotationsData, bookId: string): BookAnnotations {
  const existing = data.books[bookId];
  if (existing) {
    const highlights = Array.isArray(existing.highlights) ? existing.highlights : [];
    const maxNum = highlights.reduce((acc, h) => Math.max(acc, h.number || 0), 0);
    return {
      highlights,
      notes: Array.isArray(existing.notes) ? existing.notes : [],
      bookmarks: Array.isArray(existing.bookmarks) ? existing.bookmarks : [],
      nextHighlightNumber: Math.max(existing.nextHighlightNumber || 1, maxNum + 1),
    };
  }
  return {
    highlights: [],
    notes: [],
    bookmarks: [],
    nextHighlightNumber: 1,
  };
}

interface AddHighlightPayload {
  bookId: string;
  pageNumber: number;
  color: AnnotationColor;
  mode: ReaderViewMode;
  rect?: HighlightRect;
  paragraphIndex?: number;
  startOffset?: number;
  endOffset?: number;
  quote?: string;
}

interface AddNotePayload {
  bookId: string;
  pageNumber: number;
  title?: string;
  content: string;
  highlightId?: string | null;
}

interface AddBookmarkPayload {
  bookId: string;
  pageNumber: number;
  title: string;
  description?: string;
  color: AnnotationColor;
}

interface AnnotationsState {
  data: AnnotationsData;
  loaded: boolean;
  loading: boolean;
  load: () => Promise<void>;

  addHighlight: (payload: AddHighlightPayload) => Promise<Highlight>;
  updateHighlightColor: (bookId: string, highlightId: string, color: AnnotationColor) => Promise<void>;
  removeHighlight: (bookId: string, highlightId: string) => Promise<void>;

  addNote: (payload: AddNotePayload) => Promise<Note>;
  updateNote: (
    bookId: string,
    noteId: string,
    updates: { title?: string; content?: string; highlightId?: string | null },
  ) => Promise<void>;
  removeNote: (bookId: string, noteId: string) => Promise<void>;

  addBookmark: (payload: AddBookmarkPayload) => Promise<Bookmark>;
  updateBookmark: (
    bookId: string,
    bookmarkId: string,
    updates: { title?: string; description?: string; color?: AnnotationColor },
  ) => Promise<void>;
  removeBookmark: (bookId: string, bookmarkId: string) => Promise<void>;

  removeBookAnnotations: (bookId: string) => Promise<void>;
}

let persistChain: Promise<void> = Promise.resolve();

export const useAnnotationsStore = create<AnnotationsState>((set, get) => {
  const persist = (data: AnnotationsData): Promise<void> => {
    persistChain = persistChain
      .catch(() => undefined)
      .then(() => storage.saveAnnotations(data))
      .catch((err) => console.error('Erro ao salvar anotações:', err));
    return persistChain;
  };

  const mutateBook = (
    bookId: string,
    updater: (entry: BookAnnotations) => BookAnnotations,
  ): AnnotationsData => {
    const current = get().data;
    const entry = ensureBookEntry(current, bookId);
    const next: AnnotationsData = {
      ...current,
      books: {
        ...current.books,
        [bookId]: updater(entry),
      },
    };
    set({ data: next });
    return next;
  };

  return {
    data: { version: 1, books: {} },
    loaded: false,
    loading: false,

    load: async () => {
      if (get().loaded || get().loading) return;
      set({ loading: true });
      try {
        const data = await storage.getAnnotations();
        set({ data, loaded: true, loading: false });
      } catch (err) {
        console.error('Erro ao carregar anotações:', err);
        set({ loaded: true, loading: false });
      }
    },

    addHighlight: async (payload) => {
      let created!: Highlight;
      const next = mutateBook(payload.bookId, (entry) => {
        created = {
          id: genId('hl'),
          bookId: payload.bookId,
          number: entry.nextHighlightNumber,
          pageNumber: payload.pageNumber,
          color: payload.color,
          mode: payload.mode,
          rect: payload.rect,
          paragraphIndex: payload.paragraphIndex,
          startOffset: payload.startOffset,
          endOffset: payload.endOffset,
          quote: payload.quote?.trim() || undefined,
          createdAt: new Date().toISOString(),
        };
        return {
          ...entry,
          highlights: [...entry.highlights, created],
          nextHighlightNumber: entry.nextHighlightNumber + 1,
        };
      });
      await persist(next);
      return created;
    },

    updateHighlightColor: async (bookId, highlightId, color) => {
      const next = mutateBook(bookId, (entry) => ({
        ...entry,
        highlights: entry.highlights.map((h) => (h.id === highlightId ? { ...h, color } : h)),
      }));
      await persist(next);
    },

    removeHighlight: async (bookId, highlightId) => {
      const next = mutateBook(bookId, (entry) => ({
        ...entry,
        highlights: entry.highlights.filter((h) => h.id !== highlightId),
        // Remove dangling pointer from notes while keeping the note text safe
        notes: entry.notes.map((n) =>
          n.highlightId === highlightId ? { ...n, highlightId: null } : n,
        ),
      }));
      await persist(next);
    },

    addNote: async (payload) => {
      const now = new Date().toISOString();
      const created: Note = {
        id: genId('note'),
        bookId: payload.bookId,
        pageNumber: payload.pageNumber,
        title: payload.title?.trim() || undefined,
        content: payload.content.trim(),
        highlightId: payload.highlightId ?? null,
        createdAt: now,
        updatedAt: now,
      };
      const next = mutateBook(payload.bookId, (entry) => ({
        ...entry,
        notes: [created, ...entry.notes],
      }));
      await persist(next);
      return created;
    },

    updateNote: async (bookId, noteId, updates) => {
      const now = new Date().toISOString();
      const next = mutateBook(bookId, (entry) => ({
        ...entry,
        notes: entry.notes.map((n) =>
          n.id === noteId
            ? {
                ...n,
                title: updates.title !== undefined ? updates.title.trim() || undefined : n.title,
                content: updates.content !== undefined ? updates.content.trim() : n.content,
                highlightId:
                  updates.highlightId !== undefined ? updates.highlightId : n.highlightId,
                updatedAt: now,
              }
            : n,
        ),
      }));
      await persist(next);
    },

    removeNote: async (bookId, noteId) => {
      const next = mutateBook(bookId, (entry) => ({
        ...entry,
        notes: entry.notes.filter((n) => n.id !== noteId),
      }));
      await persist(next);
    },

    addBookmark: async (payload) => {
      const created: Bookmark = {
        id: genId('bm'),
        bookId: payload.bookId,
        pageNumber: payload.pageNumber,
        title: payload.title.trim() || `Página ${payload.pageNumber}`,
        description: payload.description?.trim() || undefined,
        color: payload.color,
        createdAt: new Date().toISOString(),
      };
      const next = mutateBook(payload.bookId, (entry) => ({
        ...entry,
        bookmarks: [...entry.bookmarks, created].sort((a, b) => a.pageNumber - b.pageNumber),
      }));
      await persist(next);
      return created;
    },

    updateBookmark: async (bookId, bookmarkId, updates) => {
      const next = mutateBook(bookId, (entry) => ({
        ...entry,
        bookmarks: entry.bookmarks.map((b) =>
          b.id === bookmarkId
            ? {
                ...b,
                title: updates.title !== undefined ? updates.title.trim() || b.title : b.title,
                description:
                  updates.description !== undefined
                    ? updates.description.trim() || undefined
                    : b.description,
                color: updates.color ?? b.color,
              }
            : b,
        ),
      }));
      await persist(next);
    },

    removeBookmark: async (bookId, bookmarkId) => {
      const next = mutateBook(bookId, (entry) => ({
        ...entry,
        bookmarks: entry.bookmarks.filter((b) => b.id !== bookmarkId),
      }));
      await persist(next);
    },

    removeBookAnnotations: async (bookId) => {
      const current = get().data;
      if (!current.books[bookId]) return;
      const restBooks = { ...current.books };
      delete restBooks[bookId];
      const next: AnnotationsData = { ...current, books: restBooks };
      set({ data: next });
      await persist(next);
    },
  };
});
