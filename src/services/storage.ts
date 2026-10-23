const FILES = {
  library: 'library.json',
  progress: 'reading-progress.json',
  history: 'reading-history.json',
  settings: 'settings.json',
} as const;

import type { Library, ReadingProgress, ReadingHistory, AppSettings } from '@/types';

const DEFAULT_LIBRARY: Library = { books: [], watchFolder: null };
const DEFAULT_PROGRESS: ReadingProgress = {};
const DEFAULT_HISTORY: ReadingHistory = { entries: [] };
const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  defaultFitMode: 'height',
  watchFolder: null,
};

async function read<T>(file: string, defaultValue: T): Promise<T> {
  try {
    const data = await window.electronAPI.readData(file);
    if (data === null || data === undefined) return defaultValue;
    return data as T;
  } catch {
    return defaultValue;
  }
}

async function write(file: string, data: unknown): Promise<void> {
  await window.electronAPI.writeData(file, data);
}

export const storage = {
  async getLibrary(): Promise<Library> {
    return read(FILES.library, DEFAULT_LIBRARY);
  },

  async saveLibrary(library: Library): Promise<void> {
    await write(FILES.library, library);
  },

  async getProgress(): Promise<ReadingProgress> {
    return read(FILES.progress, DEFAULT_PROGRESS);
  },

  async saveProgress(progress: ReadingProgress): Promise<void> {
    await write(FILES.progress, progress);
  },

  async getHistory(): Promise<ReadingHistory> {
    return read(FILES.history, DEFAULT_HISTORY);
  },

  async saveHistory(history: ReadingHistory): Promise<void> {
    await write(FILES.history, history);
  },

  async getSettings(): Promise<AppSettings> {
    return read(FILES.settings, DEFAULT_SETTINGS);
  },

  async saveSettings(settings: AppSettings): Promise<void> {
    await write(FILES.settings, settings);
  },
};
