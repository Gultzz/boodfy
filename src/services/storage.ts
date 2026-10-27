const FILES = {
  library: 'library.json',
  progress: 'reading-progress.json',
  history: 'reading-history.json',
  settings: 'settings.json',
  study: 'study-progress.json',
} as const;

import type {
  Library,
  ReadingProgress,
  ReadingHistory,
  AppSettings,
  StudyData,
} from '@/types';

const DEFAULT_LIBRARY: Library = { books: [], watchFolder: null };
const DEFAULT_PROGRESS: ReadingProgress = {};
const DEFAULT_HISTORY: ReadingHistory = { entries: [] };
const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  defaultFitMode: 'height',
  watchFolder: null,
  ai: {
    enabled: false,
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-3.8-flash',
    provider: 'gemini',
    verified: false,
  },
};
const DEFAULT_STUDY: StudyData = { version: 1, books: {} };

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
    const data = await read<Partial<AppSettings>>(FILES.settings, DEFAULT_SETTINGS);
    return {
      ...DEFAULT_SETTINGS,
      ...data,
      ai: { ...DEFAULT_SETTINGS.ai, ...(data.ai ?? {}) },
    };
  },

  async saveSettings(settings: AppSettings): Promise<void> {
    await write(FILES.settings, settings);
  },

  async getStudy(): Promise<StudyData> {
    const data = await read<StudyData>(FILES.study, DEFAULT_STUDY);
    if (!data || typeof data !== 'object' || !data.books) return DEFAULT_STUDY;
    return { version: data.version ?? 1, books: data.books };
  },

  async saveStudy(study: StudyData): Promise<void> {
    await write(FILES.study, study);
  },
};
