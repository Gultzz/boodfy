import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReader } from '@/hooks/useReader';
import type { Book } from '@/types';

const mockBook: Book = {
  id: 'test-1',
  title: 'Test Book',
  filePath: 'C:/livros/teste.pdf',
  fileName: 'teste.pdf',
  totalPages: 50,
  currentPage: 10,
  addedAt: new Date().toISOString(),
  lastReadAt: null,
  status: 'reading',
  isManaged: false,
  coverDataUrl: null,
};

beforeEach(() => {
  const store: Record<string, unknown> = {
    'library.json': { books: [mockBook], watchFolder: null },
    'reading-progress.json': {},
    'reading-history.json': { entries: [] },
  };

  window.electronAPI = {
    fileExists: vi.fn(async (path: string) => !path.includes('missing')),
    readPdf: vi.fn(async (path: string) => {
      if (path.includes('missing')) throw new Error('Arquivo não encontrado');
      return new ArrayBuffer(16);
    }),
    readData: vi.fn(async (file: string) => store[file] || null),
    writeData: vi.fn(async (file: string, data: unknown) => {
      store[file] = data;
      return true;
    }),
    toggleFullscreen: vi.fn(async () => true),
    getFileName: vi.fn(async () => 'teste'),
    getPageCount: vi.fn(async () => 50),
    scanFolder: vi.fn(async () => []),
    openFileDialog: vi.fn(async () => []),
    openFolderDialog: vi.fn(async () => null),
    relocateFile: vi.fn(async () => null),
    importCopy: vi.fn(async () => 'copied'),
    deleteManaged: vi.fn(async () => true),
    getVersion: vi.fn(async () => '1.0.0'),
    getDataPath: vi.fn(async () => 'C:/data'),
    isFullscreen: vi.fn(async () => false),
    openPath: vi.fn(async () => {}),
  } as unknown as typeof window.electronAPI;
});

describe('useReader Hook - Navegação e Tratamento de Arquivos', () => {
  it('deve carregar o PDF e inicializar na página salva do livro', async () => {
    const onBack = vi.fn();
    const { result } = renderHook(() => useReader({ book: mockBook, onBack }));

    await act(async () => {
      result.current.onDocumentLoadSuccess(50);
    });

    expect(result.current.currentPage).toBe(10);
    expect(result.current.totalPages).toBe(50);
  });

  it('deve avançar e retroceder páginas respeitando os limites', async () => {
    const onBack = vi.fn();
    const { result } = renderHook(() => useReader({ book: mockBook, onBack }));

    await act(async () => {
      result.current.onDocumentLoadSuccess(50);
    });

    await act(async () => {
      result.current.nextPage();
    });
    expect(result.current.currentPage).toBe(11);

    await act(async () => {
      result.current.prevPage();
    });
    expect(result.current.currentPage).toBe(10);

    // Ir diretamente para uma página
    await act(async () => {
      result.current.goToPage(45);
    });
    expect(result.current.currentPage).toBe(45);

    // Tentativa inválida acima do total
    await act(async () => {
      result.current.goToPage(999);
    });
    expect(result.current.currentPage).toBe(45);
  });

  it('deve identificar arquivo indisponível e exibir mensagem de erro', async () => {
    const onBack = vi.fn();
    const missingBook: Book = {
      ...mockBook,
      id: 'missing-1',
      filePath: 'C:/livros/missing-book.pdf',
    };

    const { result } = renderHook(() => useReader({ book: missingBook, onBack }));

    await vi.waitFor(() => {
      expect(result.current.error).toContain('Arquivo não encontrado');
    });
  });
});
