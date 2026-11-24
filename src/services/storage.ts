const FILES = {
  library: 'library.json',
  progress: 'reading-progress.json',
  history: 'reading-history.json',
  settings: 'settings.json',
  study: 'study-progress.json',
  annotations: 'annotations.json',
} as const;

import type {
  AnnotationsData,
  AppSettings,
  Library,
  ReadingHistory,
  ReadingProgress,
  ReaderTypographySettings,
  StudyData,
} from '@/types';

export const DEFAULT_READER_SETTINGS: ReaderTypographySettings = {
  defaultViewMode: 'pdf',
  fontSize: 18,
  lineSpacing: 'comfortable',
  readingTheme: 'original',
};

const DEFAULT_LIBRARY: Library = { books: [], watchFolder: null, tags: [], tagColors: {} };
const DEFAULT_PROGRESS: ReadingProgress = {};
const DEFAULT_HISTORY: ReadingHistory = { entries: [] };
const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  language: 'pt',
  defaultFitMode: 'height',
  watchFolder: null,
  ai: {
    enabled: false,
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-2.5-flash',
    provider: 'gemini',
    verified: false,
  },
  reader: DEFAULT_READER_SETTINGS,
};
const DEFAULT_STUDY: StudyData = { version: 1, books: {} };
const DEFAULT_ANNOTATIONS: AnnotationsData = { version: 1, books: {} };

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
    const data = await read<Partial<Library>>(FILES.library, DEFAULT_LIBRARY);
    return {
      books: Array.isArray(data.books) ? data.books : [],
      watchFolder: data.watchFolder ?? null,
      tags: Array.isArray(data.tags) ? data.tags : [],
      tagColors: data.tagColors && typeof data.tagColors === 'object' ? data.tagColors : {},
    };
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
    const mergedAi = { ...DEFAULT_SETTINGS.ai, ...(data.ai ?? {}) };
    if (
      mergedAi.model === 'gemini-3.8-flash' ||
      mergedAi.model === 'gemini-3.6-flash' ||
      mergedAi.model === 'gemini-3.5-flash-lite'
    ) {
      mergedAi.model = 'gemini-2.5-flash';
    }
    const mergedReader: ReaderTypographySettings = {
      ...DEFAULT_READER_SETTINGS,
      ...(data.reader ?? {}),
    };
    return {
      ...DEFAULT_SETTINGS,
      ...data,
      language: data.language ?? 'pt',
      ai: mergedAi,
      reader: mergedReader,
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

  async getAnnotations(): Promise<AnnotationsData> {
    const data = await read<AnnotationsData>(FILES.annotations, DEFAULT_ANNOTATIONS);
    if (!data || typeof data !== 'object' || !data.books) return DEFAULT_ANNOTATIONS;
    return { version: data.version ?? 1, books: data.books };
  },

  async saveAnnotations(annotations: AnnotationsData): Promise<void> {
    await write(FILES.annotations, annotations);
  },
};
