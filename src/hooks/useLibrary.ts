import { useState, useEffect, useCallback } from 'react';
import { storage } from '@/services/storage';
import { libraryService } from '@/services/library-service';
import type { Book, Library, ReadingProgress, FilterMode, SortMode } from '@/types';

export function useLibrary() {
  const [library, setLibrary] = useState<Library>({ books: [], watchFolder: null });
  const [progress, setProgress] = useState<ReadingProgress>({});
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [lib, prog] = await Promise.all([storage.getLibrary(), storage.getProgress()]);
      // Merge progress into books
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
      setLibrary({ ...lib, books: updatedBooks });
      setProgress(prog);
    } catch (err) {
      console.error('Erro ao carregar biblioteca:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const addFiles = useCallback(async () => {
    const paths = await window.electronAPI.openFileDialog();
    if (paths.length === 0) return;
    await libraryService.addBooks(paths);
    await reload();
  }, [reload]);

  const addFolder = useCallback(async () => {
    const folder = await window.electronAPI.openFolderDialog();
    if (!folder) return;
    await libraryService.scanWatchFolder(folder);
    // Save watch folder
    const lib = await storage.getLibrary();
    lib.watchFolder = folder;
    await storage.saveLibrary(lib);
    await reload();
  }, [reload]);

  const refreshWatchFolder = useCallback(async () => {
    const lib = await storage.getLibrary();
    if (!lib.watchFolder) return;
    await libraryService.scanWatchFolder(lib.watchFolder);
    await reload();
  }, [reload]);

  const removeBook = useCallback(
    async (bookId: string, deleteFile: boolean = false) => {
      await libraryService.removeBook(bookId, deleteFile);
      await reload();
    },
    [reload],
  );

  const relocateBook = useCallback(
    async (bookId: string) => {
      const newPath = await libraryService.relocateBook(bookId);
      if (newPath) await reload();
      return newPath;
    },
    [reload],
  );

  const getFilteredBooks = useCallback(
    (filter: FilterMode, sort: SortMode, search: string): Book[] => {
      let books = [...library.books];

      // Filter
      switch (filter) {
        case 'not-started':
          books = books.filter((b) => b.status === 'not-started');
          break;
        case 'reading':
          books = books.filter((b) => b.status === 'reading');
          break;
        case 'completed':
          books = books.filter((b) => b.status === 'completed');
          break;
        case 'recent':
          books = books.filter((b) => b.lastReadAt !== null);
          break;
      }

      // Search
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        books = books.filter((b) => b.title.toLowerCase().includes(q));
      }

      // Sort
      switch (sort) {
        case 'title':
          books.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
          break;
        case 'lastRead':
          books.sort((a, b) => {
            if (!a.lastReadAt && !b.lastReadAt) return 0;
            if (!a.lastReadAt) return 1;
            if (!b.lastReadAt) return -1;
            return new Date(b.lastReadAt).getTime() - new Date(a.lastReadAt).getTime();
          });
          break;
        case 'addedAt':
          books.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
          break;
      }

      return books;
    },
    [library.books],
  );

  const getLastReadBook = useCallback((): Book | null => {
    const readingBooks = library.books
      .filter((b) => b.status === 'reading' && b.lastReadAt)
      .sort((a, b) => {
        return new Date(b.lastReadAt!).getTime() - new Date(a.lastReadAt!).getTime();
      });
    return readingBooks[0] || null;
  }, [library.books]);

  return {
    library,
    progress,
    loading,
    reload,
    addFiles,
    addFolder,
    refreshWatchFolder,
    removeBook,
    relocateBook,
    getFilteredBooks,
    getLastReadBook,
  };
}
