import { storage } from './storage';
import { generatePdfCover } from './cover-service';
import type { Book, HistoryEntry } from '@/types';

const coverInFlight = new Set<string>();

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

export const libraryService = {
  async addBooks(filePaths: string[]): Promise<Book[]> {
    const library = await storage.getLibrary();
    const newBooks: Book[] = [];

    for (const filePath of filePaths) {
      // Check for duplicates by file path
      const exists = library.books.some((b) => b.filePath.toLowerCase() === filePath.toLowerCase());
      if (exists) continue;

      const fileName = await window.electronAPI.getFileName(filePath);

      const book: Book = {
        id: generateId(),
        title: fileName,
        filePath,
        fileName: fileName + '.pdf',
        totalPages: 0,
        currentPage: 1,
        addedAt: new Date().toISOString(),
        lastReadAt: null,
        status: 'not-started',
        isManaged: false,
        coverDataUrl: null,
      };

      library.books.push(book);
      newBooks.push(book);
    }

    await storage.saveLibrary(library);
    return newBooks;
  },

  async removeBook(bookId: string, deleteFile: boolean = false): Promise<void> {
    const library = await storage.getLibrary();
    const book = library.books.find((b) => b.id === bookId);

    if (book && deleteFile && book.isManaged) {
      await window.electronAPI.deleteManaged(book.filePath);
    }

    library.books = library.books.filter((b) => b.id !== bookId);
    await storage.saveLibrary(library);

    // Clean up progress
    const progress = await storage.getProgress();
    delete progress[bookId];
    await storage.saveProgress(progress);
  },

  async updateBook(bookId: string, updates: Partial<Book>): Promise<void> {
    const library = await storage.getLibrary();
    const index = library.books.findIndex((b) => b.id === bookId);
    if (index === -1) return;
    library.books[index] = { ...library.books[index], ...updates };
    await storage.saveLibrary(library);
  },

  async relocateBook(bookId: string): Promise<string | null> {
    const newPath = await window.electronAPI.relocateFile();
    if (!newPath) return null;

    await this.updateBook(bookId, { filePath: newPath, coverDataUrl: null });
    return newPath;
  },

  async generateCoverIfNeeded(book: Book): Promise<Book> {
    if (book.coverDataUrl || coverInFlight.has(book.id)) return book;
    coverInFlight.add(book.id);
    try {
      const result = await generatePdfCover(book.filePath);
      if (!result) return book;

      const updates: Partial<Book> = { coverDataUrl: result.coverDataUrl };
      if (!book.totalPages) {
        updates.totalPages = result.totalPages;
      }

      await this.updateBook(book.id, updates);
      return { ...book, ...updates };
    } finally {
      coverInFlight.delete(book.id);
    }
  },

  async importCopy(bookId: string): Promise<string | null> {
    const library = await storage.getLibrary();
    const book = library.books.find((b) => b.id === bookId);
    if (!book) return null;

    try {
      const newPath = await window.electronAPI.importCopy(book.filePath);
      await this.updateBook(bookId, { filePath: newPath, isManaged: true });
      return newPath;
    } catch {
      return null;
    }
  },

  async scanWatchFolder(folderPath: string): Promise<Book[]> {
    const files = await window.electronAPI.scanFolder(folderPath);
    return this.addBooks(files);
  },

  async updateProgress(bookId: string, currentPage: number, totalPages: number): Promise<void> {
    const progress = await storage.getProgress();
    const now = new Date().toISOString();

    progress[bookId] = {
      currentPage,
      totalPages,
      lastReadAt: now,
      status: (totalPages > 0 && currentPage >= totalPages) ? 'completed' : 'reading',
    };

    await storage.saveProgress(progress);

    // Also update the book in library
    await this.updateBook(bookId, {
      currentPage,
      totalPages,
      lastReadAt: now,
      status: (totalPages > 0 && currentPage >= totalPages) ? 'completed' : 'reading',
    });
  },

  async markCompleted(bookId: string): Promise<void> {
    const progress = await storage.getProgress();
    if (progress[bookId]) {
      progress[bookId].status = 'completed';
      await storage.saveProgress(progress);
    }
    await this.updateBook(bookId, { status: 'completed' });
  },

  async addHistoryEntry(bookId: string, bookTitle: string, page: number): Promise<void> {
    const history = await storage.getHistory();
    const entry: HistoryEntry = {
      bookId,
      bookTitle,
      openedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      pageOnOpen: page,
      pageOnClose: null,
    };
    history.entries.unshift(entry);
    // Keep last 500 entries
    if (history.entries.length > 500) {
      history.entries = history.entries.slice(0, 500);
    }
    await storage.saveHistory(history);
  },

  async updateLastHistoryEntry(pageOnClose: number): Promise<void> {
    const history = await storage.getHistory();
    if (history.entries.length > 0) {
      history.entries[0].lastActivityAt = new Date().toISOString();
      history.entries[0].pageOnClose = pageOnClose;
      await storage.saveHistory(history);
    }
  },
};
