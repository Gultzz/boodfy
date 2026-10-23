import { describe, it, expect, beforeEach, vi } from 'vitest';
import { libraryService } from '@/services/library-service';
import { storage } from '@/services/storage';
import type { Library, ReadingProgress, ReadingHistory } from '@/types';

// Mock electronAPI
const mockStorage: {
  'library.json': Library;
  'reading-progress.json': ReadingProgress;
  'reading-history.json': ReadingHistory;
  'settings.json': unknown;
} = {
  'library.json': { books: [], watchFolder: null },
  'reading-progress.json': {},
  'reading-history.json': { entries: [] },
  'settings.json': { theme: 'system', defaultFitMode: 'height', watchFolder: null },
};

beforeEach(() => {
  mockStorage['library.json'] = { books: [], watchFolder: null };
  mockStorage['reading-progress.json'] = {};
  mockStorage['reading-history.json'] = { entries: [] };

  window.electronAPI = {
    readData: vi.fn(async (file: string) => {
      return mockStorage[file as keyof typeof mockStorage] || null;
    }),
    writeData: vi.fn(async (file: string, data: unknown) => {
      (mockStorage as Record<string, unknown>)[file] = data;
      return true;
    }),
    getFileName: vi.fn(async (path: string) => {
      const match = path.match(/[/\\]([^/\\]+)\.pdf$/i);
      return match ? match[1] : 'Livro';
    }),
    fileExists: vi.fn(async () => true),
    scanFolder: vi.fn(async () => []),
    openFileDialog: vi.fn(async () => []),
    openFolderDialog: vi.fn(async () => null),
    readPdf: vi.fn(async () => new ArrayBuffer(8)),
    getPageCount: vi.fn(async () => 10),
    relocateFile: vi.fn(async () => null),
    importCopy: vi.fn(async (src) => `managed/${src}`),
    deleteManaged: vi.fn(async () => true),
    getVersion: vi.fn(async () => '1.0.0'),
    getDataPath: vi.fn(async () => 'C:/UserData'),
    toggleFullscreen: vi.fn(async () => false),
    isFullscreen: vi.fn(async () => false),
    openPath: vi.fn(async () => {}),
  } as unknown as typeof window.electronAPI;
});

describe('Biblioteca Local e Gerenciamento de Livros', () => {
  it('deve adicionar novos PDFs sem duplicatas', async () => {
    const books1 = await libraryService.addBooks(['C:/livros/dom-casmurro.pdf']);
    expect(books1.length).toBe(1);
    expect(books1[0].title).toBe('dom-casmurro');

    // Tentar adicionar o mesmo PDF novamente não deve duplicar
    const books2 = await libraryService.addBooks(['C:/livros/dom-casmurro.pdf']);
    expect(books2.length).toBe(0);

    const lib = await storage.getLibrary();
    expect(lib.books.length).toBe(1);
  });

  it('deve remover um livro e limpar seu progresso', async () => {
    const [book] = await libraryService.addBooks(['C:/livros/memorias-postumas.pdf']);
    await libraryService.updateProgress(book.id, 5, 20);

    let progress = await storage.getProgress();
    expect(progress[book.id].currentPage).toBe(5);

    await libraryService.removeBook(book.id);

    const lib = await storage.getLibrary();
    expect(lib.books.length).toBe(0);

    progress = await storage.getProgress();
    expect(progress[book.id]).toBeUndefined();
  });
});

describe('Salvamento e Recuperação de Progresso de Leitura', () => {
  it('deve salvar e atualizar o progresso de leitura mantendo estado isolado por livro', async () => {
    const [livroA, livroB] = await libraryService.addBooks([
      'C:/livros/livro-a.pdf',
      'C:/livros/livro-b.pdf',
    ]);

    await libraryService.updateProgress(livroA.id, 12, 100);
    await libraryService.updateProgress(livroB.id, 45, 250);

    const progress = await storage.getProgress();
    expect(progress[livroA.id].currentPage).toBe(12);
    expect(progress[livroA.id].totalPages).toBe(100);
    expect(progress[livroA.id].status).toBe('reading');

    expect(progress[livroB.id].currentPage).toBe(45);
    expect(progress[livroB.id].totalPages).toBe(250);
    expect(progress[livroB.id].status).toBe('reading');
  });

  it('deve marcar explicitamente como concluído quando indicado', async () => {
    const [livro] = await libraryService.addBooks(['C:/livros/ensaio-cegueira.pdf']);
    await libraryService.updateProgress(livro.id, 300, 300);
    await libraryService.markCompleted(livro.id);

    const lib = await storage.getLibrary();
    const updated = lib.books.find((b) => b.id === livro.id);
    expect(updated?.status).toBe('completed');
  });
});

describe('Histórico de Leitura', () => {
  it('deve registrar abertura de livro e atualização de encerramento', async () => {
    const [livro] = await libraryService.addBooks(['C:/livros/grande-sertao.pdf']);

    await libraryService.addHistoryEntry(livro.id, livro.title, 1);
    let hist = await storage.getHistory();
    expect(hist.entries.length).toBe(1);
    expect(hist.entries[0].pageOnOpen).toBe(1);

    await libraryService.updateLastHistoryEntry(15);
    hist = await storage.getHistory();
    expect(hist.entries[0].pageOnClose).toBe(15);
  });
});
