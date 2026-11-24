import { create } from 'zustand';
import { storage } from '@/services/storage';
import type { Book, Page } from '@/types';

export type ReaderInitialPanel = 'outline' | 'notebook' | 'bookmarks' | 'study' | null;

export interface ReaderEntry {
  page: number | null;
  chapterId: string | null;
  initialPanel: ReaderInitialPanel;
}

interface AppState {
  currentPage: Page;
  currentBook: Book | null;
  readerEntry: ReaderEntry;
  navigateTo: (page: Page) => void;
  openBook: (book: Book) => void;
  openBookAtPage: (
    book: Book,
    page: number,
    chapterId?: string | null,
    initialPanel?: ReaderInitialPanel,
  ) => void;
  openBookWithPanel: (book: Book, initialPanel: ReaderInitialPanel) => void;
  openBookById: (bookId: string) => Promise<void>;
  backToLibrary: () => void;
}

const EMPTY_ENTRY: ReaderEntry = { page: null, chapterId: null, initialPanel: null };

export const useAppStore = create<AppState>((set) => ({
  currentPage: 'library',
  currentBook: null,
  readerEntry: EMPTY_ENTRY,

  navigateTo: (page: Page) => {
    set({ currentPage: page });
  },

  openBook: (book: Book) => {
    set({ currentBook: book, currentPage: 'reader', readerEntry: EMPTY_ENTRY });
  },

  openBookAtPage: (
    book: Book,
    page: number,
    chapterId: string | null = null,
    initialPanel: ReaderInitialPanel = null,
  ) => {
    set({
      currentBook: book,
      currentPage: 'reader',
      readerEntry: { page, chapterId, initialPanel },
    });
  },

  openBookWithPanel: (book: Book, initialPanel: ReaderInitialPanel) => {
    set({
      currentBook: book,
      currentPage: 'reader',
      readerEntry: { page: null, chapterId: null, initialPanel },
    });
  },

  openBookById: async (bookId: string) => {
    const [lib, progress] = await Promise.all([storage.getLibrary(), storage.getProgress()]);
    const found = lib.books.find((b) => b.id === bookId);
    if (found) {
      const savedProgress = progress[bookId];
      const savedPage = savedProgress?.currentPage ?? found.currentPage ?? 1;
      const updatedBook: Book = {
        ...found,
        currentPage: savedPage,
        totalPages: savedProgress?.totalPages || found.totalPages,
        status: savedProgress?.status || found.status,
        lastReadAt: savedProgress?.lastReadAt || found.lastReadAt,
      };
      set({
        currentBook: updatedBook,
        currentPage: 'reader',
        readerEntry: { page: savedPage, chapterId: null, initialPanel: null },
      });
    }
  },

  backToLibrary: () => {
    set({ currentBook: null, currentPage: 'library', readerEntry: EMPTY_ENTRY });
  },
}));
