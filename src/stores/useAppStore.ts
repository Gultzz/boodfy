import { create } from 'zustand';
import { storage } from '@/services/storage';
import type { Book, Page } from '@/types';

interface AppState {
  currentPage: Page;
  currentBook: Book | null;
  navigateTo: (page: Page) => void;
  openBook: (book: Book) => void;
  openBookById: (bookId: string) => Promise<void>;
  backToLibrary: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentPage: 'library',
  currentBook: null,

  navigateTo: (page: Page) => {
    set({ currentPage: page });
  },

  openBook: (book: Book) => {
    set({ currentBook: book, currentPage: 'reader' });
  },

  openBookById: async (bookId: string) => {
    const lib = await storage.getLibrary();
    const found = lib.books.find((b) => b.id === bookId);
    if (found) {
      set({ currentBook: found, currentPage: 'reader' });
    }
  },

  backToLibrary: () => {
    set({ currentBook: null, currentPage: 'library' });
  },
}));

