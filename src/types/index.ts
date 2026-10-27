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
  tags?: string[];
}

export interface Library {
  books: Book[];
  watchFolder: string | null;
  tags?: string[];
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

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  readToday: boolean;
  lastReadDate: string | null;
}

export interface AiSettings {
  enabled: boolean;
  provider: string;
  baseUrl: string;
  model: string;
  verified: boolean;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  defaultFitMode: 'height' | 'width' | 'manual';
  watchFolder: string | null;
  ai: AiSettings;
}

export type ViewMode = 'grid' | 'list';
export type FilterMode = 'all' | 'not-started' | 'reading' | 'completed' | 'recent';
export type SortMode = 'title' | 'lastRead' | 'addedAt';
export type FitMode = 'height' | 'width' | 'manual';

export type Page = 'library' | 'reader' | 'settings' | 'history' | 'study';

/* ------------------------------------------------------------------ */
/* Modo Estudante                                                      */
/* ------------------------------------------------------------------ */

/** Um capítulo/seção do livro, derivado do sumário do próprio PDF */
export interface Chapter {
  id: string;
  title: string;
  startPage: number;
  endPage: number;
  /** Profundidade no sumário: 0 = capítulo principal, 1+ = subcapítulo */
  level: number;
  /** ID do capítulo pai imediato quando for subcapítulo (level > 0) */
  parentId?: string;
  /** True quando possui subcapítulos diretamente abaixo */
  hasChildren?: boolean;
}

export type QuizQuestionKind =
  | 'cloze'
  | 'definition'
  | 'comprehension'
  | 'cause-effect'
  | 'context'
  | 'ai';

export interface QuizQuestion {
  id: string;
  kind: QuizQuestionKind;
  /** Enunciado da pergunta */
  prompt: string;
  options: string[];
  correctIndex: number;
  /** Página do capítulo de onde o conteúdo foi tirado */
  sourcePage: number;
  /** Explicação mostrada após responder */
  explanation: string;
}

export interface Quiz {
  chapterId: string;
  chapterTitle: string;
  startPage: number;
  endPage: number;
  questions: QuizQuestion[];
  generator: 'local' | 'ai';
  generatorVersion: number;
  generatedAt: string;
}

export interface QuizAnswer {
  questionId: string;
  selectedIndex: number;
  correct: boolean;
}

export interface QuizAttempt {
  id: string;
  chapterId: string;
  chapterTitle: string;
  startedAt: string;
  finishedAt: string;
  correctCount: number;
  total: number;
  answers: QuizAnswer[];
}

export interface BookStudyData {
  bookId: string;
  bookTitle: string;
  chapters: Chapter[];
  /** Identifica a versão atual do sumário para saber quando reconstruir */
  chaptersSignature: string;
  quizzes: Record<string, Quiz>;
  attempts: QuizAttempt[];
}

export interface StudyData {
  version: number;
  books: Record<string, BookStudyData>;
}

export interface ChapterStats {
  chapter: Chapter;
  attempts: number;
  correct: number;
  total: number;
  accuracy: number;
  lastAccuracy: number;
  bestAccuracy: number;
  lastAttemptAt: string;
}

export interface BookStats {
  bookId: string;
  bookTitle: string;
  attempts: number;
  correct: number;
  total: number;
  accuracy: number;
  chaptersStudied: number;
  chapterStats: ChapterStats[];
}
