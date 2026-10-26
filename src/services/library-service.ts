import { storage } from './storage';
import { generatePdfCover } from './cover-service';
import type { Book, HistoryEntry, Library } from '@/types';

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
        tags: [],
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
      try {
        await window.electronAPI.deleteManaged(book.filePath);
      } catch (err) {
        console.warn('Erro ao apagar arquivo gerenciado:', err);
      }
    }

    // Clean up local cover cache file
    try {
      await window.electronAPI.deleteCover(bookId);
    } catch (err) {
      console.warn('Erro ao deletar capa em cache:', err);
    }

    library.books = library.books.filter((b) => b.id !== bookId);
    await storage.saveLibrary(library);

    // Clean up progress
    try {
      const progress = await storage.getProgress();
      if (progress[bookId]) {
        delete progress[bookId];
        await storage.saveProgress(progress);
      }
    } catch (err) {
      console.warn('Erro ao remover progresso:', err);
    }
  },

  async renameBook(bookId: string, newTitle: string): Promise<void> {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    await this.updateBook(bookId, { title: trimmed });

    try {
      const history = await storage.getHistory();
      let changed = false;
      for (const entry of history.entries) {
        if (entry.bookId === bookId) {
          entry.bookTitle = trimmed;
          changed = true;
        }
      }
      if (changed) {
        await storage.saveHistory(history);
      }
    } catch (err) {
      console.warn('Erro ao atualizar histórico após renomear livro:', err);
    }
  },

  async updateBook(bookId: string, updates: Partial<Book>): Promise<void> {
    const library = await storage.getLibrary();
    const index = library.books.findIndex((b) => b.id === bookId);
    if (index === -1) return;
    library.books[index] = { ...library.books[index], ...updates };
    await storage.saveLibrary(library);
  },

  async setBookTags(bookId: string, tags: string[]): Promise<void> {
    const library = await storage.getLibrary();
    const index = library.books.findIndex((b) => b.id === bookId);
    if (index === -1) return;

    const cleanTags = Array.from(new Set(tags.map((t) => t.trim()).filter(Boolean)));
    library.books[index].tags = cleanTags;

    // Update global tags registry in library
    const globalTags = new Set(library.tags || []);
    for (const t of cleanTags) {
      globalTags.add(t);
    }
    library.tags = Array.from(globalTags).sort();

    await storage.saveLibrary(library);
  },

  async getAllTags(): Promise<string[]> {
    const library = await storage.getLibrary();
    const tagsSet = new Set<string>(library.tags || []);
    for (const book of library.books) {
      if (book.tags) {
        for (const t of book.tags) {
          if (t.trim()) tagsSet.add(t.trim());
        }
      }
    }
    return Array.from(tagsSet).sort();
  },

  async deleteTagGlobally(tagToDelete: string): Promise<void> {
    const library = await storage.getLibrary();
    library.tags = (library.tags || []).filter((t) => t !== tagToDelete);
    for (const book of library.books) {
      if (book.tags) {
        book.tags = book.tags.filter((t) => t !== tagToDelete);
      }
    }
    await storage.saveLibrary(library);
  },

  async relocateBook(bookId: string): Promise<string | null> {
    const newPath = await window.electronAPI.relocateFile();
    if (!newPath) return null;

    // Delete old cover cache so new one can be generated
    try {
      await window.electronAPI.deleteCover(bookId);
    } catch {
      // ignore
    }

    await this.updateBook(bookId, { filePath: newPath, coverDataUrl: null });
    return newPath;
  },

  async generateCoverIfNeeded(book: Book): Promise<Book> {
    if (book.coverDataUrl || coverInFlight.has(book.id)) return book;
    coverInFlight.add(book.id);
    try {
      // First check if cover already exists in local disk cache
      try {
        const cachedUrl = await window.electronAPI.getCover(book.id);
        if (cachedUrl) {
          const updates: Partial<Book> = { coverDataUrl: cachedUrl };
          await this.updateBook(book.id, updates);
          return { ...book, ...updates };
        }
      } catch {
        // continue to generate
      }

      const result = await generatePdfCover(book.filePath);
      if (!result) return book;

      // Save to local file cache via Electron
      let coverUrl = result.coverDataUrl;
      try {
        const savedUrl = await window.electronAPI.saveCover(book.id, result.coverDataUrl);
        if (savedUrl) {
          coverUrl = savedUrl;
        }
      } catch (err) {
        console.warn('Erro ao salvar capa em arquivo local:', err);
      }

      const updates: Partial<Book> = { coverDataUrl: coverUrl };
      if (!book.totalPages) {
        updates.totalPages = result.totalPages;
      }

      await this.updateBook(book.id, updates);
      return { ...book, ...updates };
    } finally {
      coverInFlight.delete(book.id);
    }
  },

  async migrateBase64CoversToDisk(library: Library): Promise<Library> {
    let hasChanges = false;
    for (const book of library.books) {
      if (book.coverDataUrl && book.coverDataUrl.startsWith('data:image/')) {
        try {
          const savedUrl = await window.electronAPI.saveCover(book.id, book.coverDataUrl);
          if (savedUrl) {
            book.coverDataUrl = savedUrl;
            hasChanges = true;
          }
        } catch (err) {
          console.warn(`Erro ao migrar capa do livro ${book.id} para arquivo:`, err);
        }
      }
    }
    if (hasChanges) {
      await storage.saveLibrary(library);
    }
    return library;
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
      status: totalPages > 0 && currentPage >= totalPages ? 'completed' : 'reading',
    };

    await storage.saveProgress(progress);

    // Also update the book in library
    await this.updateBook(bookId, {
      currentPage,
      totalPages,
      lastReadAt: now,
      status: totalPages > 0 && currentPage >= totalPages ? 'completed' : 'reading',
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
