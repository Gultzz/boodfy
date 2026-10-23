export interface Book {
  id: string;
  title: string;
  filePath: string;
  fileName: string;
  totalPages: number;
  currentPage: number;
  addedAt: string;
  lastReadAt: string | null;
  status: 'not-started' | 'reading' | 'completed';
  isManaged: boolean; // true if copied to managed folder
  coverDataUrl: string | null;
}

export interface Library {
  books: Book[];
  watchFolder: string | null;
}

export interface ReadingProgress {
  [bookId: string]: {
    currentPage: number;
    totalPages: number;
    lastReadAt: string;
    status: 'not-started' | 'reading' | 'completed';
  };
}

export interface HistoryEntry {
  bookId: string;
  bookTitle: string;
  openedAt: string;
  lastActivityAt: string;
  pageOnOpen: number;
  pageOnClose: number | null;
}

export interface ReadingHistory {
  entries: HistoryEntry[];
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  defaultFitMode: 'height' | 'width' | 'manual';
  watchFolder: string | null;
}

export type ViewMode = 'grid' | 'list';
export type FilterMode = 'all' | 'not-started' | 'reading' | 'completed' | 'recent';
export type SortMode = 'title' | 'lastRead' | 'addedAt';
export type FitMode = 'height' | 'width' | 'manual';

export type Page = 'library' | 'reader' | 'settings' | 'history';
