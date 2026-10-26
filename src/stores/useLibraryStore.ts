import { create } from 'zustand';
import { storage } from '@/services/storage';
import { libraryService } from '@/services/library-service';
import type { Book, Library, ReadingProgress, FilterMode, SortMode, ViewMode } from '@/types';

interface LibraryState {
  library: Library;
  progress: ReadingProgress;
  loading: boolean;
  viewMode: ViewMode;
  filter: FilterMode;
  sort: SortMode;
  search: string;
  selectedTag: string | null;
  contextMenu: { book: Book; x: number; y: number } | null;

  loadLibrary: () => Promise<void>;
  addFiles: () => Promise<void>;
  addFolder: () => Promise<void>;
  refreshWatchFolder: () => Promise<void>;
  removeBook: (bookId: string, deleteFile?: boolean) => Promise<void>;
  relocateBook: (bookId: string) => Promise<string | null>;
  renameBook: (bookId: string, newTitle: string) => Promise<void>;
  setBookTags: (bookId: string, tags: string[]) => Promise<void>;
  deleteTagGlobally: (tag: string) => Promise<void>;
  setViewMode: (mode: ViewMode) => void;
  setFilter: (filter: FilterMode) => void;
  setSort: (sort: SortMode) => void;
  setSearch: (search: string) => void;
  setSelectedTag: (tag: string | null) => void;
  setContextMenu: (menu: { book: Book; x: number; y: number } | null) => void;

  getFilteredBooks: () => Book[];
  getLastReadBook: () => Book | null;
  getAllTags: () => string[];
  ensureMissingCovers: () => Promise<void>;
}

export function filterAndSortBooks(
  books: Book[],
  filter: FilterMode,
  sort: SortMode,
  search: string,
  selectedTag?: string | null,
): Book[] {
  let result = [...books];

  switch (filter) {
    case 'not-started':
      result = result.filter((b) => b.status === 'not-started');
      break;
    case 'reading':
      result = result.filter((b) => b.status === 'reading');
      break;
    case 'completed':
      result = result.filter((b) => b.status === 'completed');
      break;
    case 'recent':
      result = result.filter((b) => b.lastReadAt !== null);
      break;
  }

  // Filter by custom tag/collection if selected
  if (selectedTag) {
    result = result.filter((b) => b.tags && b.tags.includes(selectedTag));
  }

  if (search.trim()) {
    const q = search.toLowerCase().trim();
    result = result.filter((b) => b.title.toLowerCase().includes(q));
  }

  switch (sort) {
    case 'title':
      result.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
      break;
    case 'lastRead':
      result.sort((a, b) => {
        if (!a.lastReadAt && !b.lastReadAt) return 0;
        if (!a.lastReadAt) return 1;
        if (!b.lastReadAt) return -1;
        return new Date(b.lastReadAt).getTime() - new Date(a.lastReadAt).getTime();
      });
      break;
    case 'addedAt':
      result.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
      break;
  }

  return result;
}

export function getLastReadBookFromList(books: Book[]): Book | null {
  const readingBooks = books
    .filter((b) => b.status === 'reading' && b.lastReadAt)
    .sort((a, b) => new Date(b.lastReadAt!).getTime() - new Date(a.lastReadAt!).getTime());
  return readingBooks[0] || null;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  library: { books: [], watchFolder: null, tags: [] },
  progress: {},
  loading: true,
  viewMode: 'grid',
  filter: 'all',
  sort: 'lastRead',
  search: '',
  selectedTag: null,
  contextMenu: null,

  loadLibrary: async () => {
    const isInitial = get().library.books.length === 0;
    if (isInitial) {
      set({ loading: true });
    }
    try {
      const [rawLib, prog] = await Promise.all([storage.getLibrary(), storage.getProgress()]);
      let lib = rawLib;

      // Auto-migrate legacy base64 covers to local disk cache files
      try {
        lib = await libraryService.migrateBase64CoversToDisk(rawLib);
      } catch (err) {
        console.warn('Erro na migração de capas:', err);
      }

      const updatedBooks = lib.books.map((book) => {
        const p = prog[book.id];
        if (p) {
          return {
            ...book,
            currentPage: p.currentPage,
            totalPages: p.totalPages,
            lastReadAt: p.lastReadAt,
            status: p.status,
          };
        }
        return book;
      });
      set({ library: { ...lib, books: updatedBooks }, progress: prog });
      void get().ensureMissingCovers();
    } catch (err) {
      console.error('Erro ao carregar biblioteca:', err);
    } finally {
      if (isInitial) {
        set({ loading: false });
      }
    }
  },

  ensureMissingCovers: async () => {
    const pending = get().library.books.filter((book) => !book.coverDataUrl);
    if (pending.length === 0) return;

    const queue = [...pending];
    const workerCount = Math.min(2, queue.length);

    const worker = async () => {
      while (queue.length > 0) {
        const book = queue.shift();
        if (!book) break;

        const updated = await libraryService.generateCoverIfNeeded(book);
        if (!updated.coverDataUrl) continue;

        set((state) => ({
          library: {
            ...state.library,
            books: state.library.books.map((item) =>
              item.id === updated.id ? { ...item, ...updated } : item,
            ),
          },
        }));
      }
    };

    await Promise.all(Array.from({ length: workerCount }, () => worker()));
  },

  addFiles: async () => {
    const paths = await window.electronAPI.openFileDialog();
    if (paths.length === 0) return;
    await libraryService.addBooks(paths);
    await get().loadLibrary();
  },

  addFolder: async () => {
    const folder = await window.electronAPI.openFolderDialog();
    if (!folder) return;
    await libraryService.scanWatchFolder(folder);
    const lib = await storage.getLibrary();
    lib.watchFolder = folder;
    await storage.saveLibrary(lib);
    await get().loadLibrary();
  },

  refreshWatchFolder: async () => {
    const { library } = get();
    if (!library.watchFolder) return;
    await libraryService.scanWatchFolder(library.watchFolder);
    await get().loadLibrary();
  },

  removeBook: async (bookId: string, deleteFile = false) => {
    set((state) => ({
      library: {
        ...state.library,
        books: state.library.books.filter((b) => b.id !== bookId),
      },
    }));
    await libraryService.removeBook(bookId, deleteFile);
    await get().loadLibrary();
  },

  renameBook: async (bookId: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    set((state) => ({
      library: {
        ...state.library,
        books: state.library.books.map((b) => (b.id === bookId ? { ...b, title: trimmed } : b)),
      },
    }));
    await libraryService.renameBook(bookId, trimmed);
    await get().loadLibrary();
  },

  setBookTags: async (bookId: string, tags: string[]) => {
    set((state) => ({
      library: {
        ...state.library,
        books: state.library.books.map((b) => (b.id === bookId ? { ...b, tags } : b)),
      },
    }));
    await libraryService.setBookTags(bookId, tags);
    await get().loadLibrary();
  },

  deleteTagGlobally: async (tag: string) => {
    if (get().selectedTag === tag) {
      set({ selectedTag: null });
    }
    await libraryService.deleteTagGlobally(tag);
    await get().loadLibrary();
  },

  relocateBook: async (bookId: string) => {
    const newPath = await libraryService.relocateBook(bookId);
    if (newPath) {
      await get().loadLibrary();
    }
    return newPath;
  },

  setViewMode: (viewMode) => set({ viewMode }),
  setFilter: (filter) => set({ filter }),
  setSort: (sort) => set({ sort }),
  setSearch: (search) => set({ search }),
  setSelectedTag: (selectedTag) => set({ selectedTag }),
  setContextMenu: (contextMenu) => set({ contextMenu }),

  getFilteredBooks: () => {
    const { library, filter, sort, search, selectedTag } = get();
    return filterAndSortBooks(library.books, filter, sort, search, selectedTag);
  },

  getLastReadBook: () => {
    return getLastReadBookFromList(get().library.books);
  },

  getAllTags: () => {
    const { library } = get();
    const tagsSet = new Set<string>(library.tags || []);
    for (const b of library.books) {
      if (b.tags) {
        for (const t of b.tags) {
          if (t.trim()) tagsSet.add(t.trim());
        }
      }
    }
    return Array.from(tagsSet).sort();
  },
}));

