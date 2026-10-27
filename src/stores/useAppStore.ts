import { create } from 'zustand';
import { storage } from '@/services/storage';
import type { Book, Page } from '@/types';

export interface ReaderEntry {
  page: number | null;
  chapterId: string | null;
}

interface AppState {
  currentPage: Page;
  currentBook: Book | null;
  readerEntry: ReaderEntry;
  navigateTo: (page: Page) => void;
  openBook: (book: Book) => void;
  openBookAtPage: (book: Book, page: number, chapterId?: string | null) => void;
  openBookById: (bookId: string) => Promise<void>;
  backToLibrary: () => void;
}

const EMPTY_ENTRY: ReaderEntry = { page: null, chapterId: null };

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

  openBookAtPage: (book: Book, page: number, chapterId: string | null = null) => {
    set({
      currentBook: book,
      currentPage: 'reader',
      readerEntry: { page, chapterId },
    });
  },

  openBookById: async (bookId: string) => {
    const lib = await storage.getLibrary();
    const found = lib.books.find((b) => b.id === bookId);
    if (found) {
      set({ currentBook: found, currentPage: 'reader', readerEntry: EMPTY_ENTRY });
    }
  },

  backToLibrary: () => {
    set({ currentBook: null, currentPage: 'library', readerEntry: EMPTY_ENTRY });
  },
}));
