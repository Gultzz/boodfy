import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from '@/stores/useAppStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useThemeStore } from '@/stores/useThemeStore';
import type { Book } from '@/types';

const mockBook: Book = {
  id: 'book-1',
  title: 'Livro Teste',
  filePath: 'C:/docs/teste.pdf',
  fileName: 'teste.pdf',
  totalPages: 100,
  currentPage: 1,
  addedAt: new Date().toISOString(),
  lastReadAt: null,
  status: 'not-started',
  isManaged: false,
  coverDataUrl: null,
};

describe('Zustand Stores', () => {
  beforeEach(() => {
    useAppStore.setState({
      currentPage: 'library',
      currentBook: null,
    });
  });

  describe('useAppStore', () => {
    it('deve navegar entre páginas corretamente', () => {
      useAppStore.getState().navigateTo('history');
      expect(useAppStore.getState().currentPage).toBe('history');

      useAppStore.getState().navigateTo('settings');
      expect(useAppStore.getState().currentPage).toBe('settings');
    });

    it('deve abrir livro e voltar para a biblioteca', () => {
      useAppStore.getState().openBook(mockBook);
      expect(useAppStore.getState().currentPage).toBe('reader');
      expect(useAppStore.getState().currentBook).toEqual(mockBook);

      useAppStore.getState().backToLibrary();
      expect(useAppStore.getState().currentPage).toBe('library');
      expect(useAppStore.getState().currentBook).toBeNull();
    });
  });

  describe('useLibraryStore', () => {
    beforeEach(() => {
      useLibraryStore.setState({
        library: { books: [mockBook], watchFolder: null },
        filter: 'all',
        sort: 'lastRead',
        search: '',
        viewMode: 'grid',
      });
    });

    it('deve filtrar livros por texto de busca', () => {
      useLibraryStore.getState().setSearch('teste');
      const filtered = useLibraryStore.getState().getFilteredBooks();
      expect(filtered.length).toBe(1);

      useLibraryStore.getState().setSearch('inexistente');
      expect(useLibraryStore.getState().getFilteredBooks().length).toBe(0);
    });

    it('deve alternar modo de visualização entre grid e lista', () => {
      useLibraryStore.getState().setViewMode('list');
      expect(useLibraryStore.getState().viewMode).toBe('list');

      useLibraryStore.getState().setViewMode('grid');
      expect(useLibraryStore.getState().viewMode).toBe('grid');
    });
  });
});

