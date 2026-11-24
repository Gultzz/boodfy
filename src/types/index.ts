export type TagColor =
  | 'indigo'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'blue'
  | 'violet'
  | 'orange'
  | 'teal';

export type AnnotationColor = 'amber' | 'emerald' | 'indigo' | 'rose';

export type AppLanguage = 'pt' | 'en' | 'es' | 'zh' | 'hi' | 'fr';

export type ThemePreference = 'light' | 'dark' | 'sepia' | 'system';
export type ResolvedTheme = 'light' | 'dark' | 'sepia';
export type ReadingTheme = 'original' | 'sepia' | 'dark';

export type ReaderViewMode = 'pdf' | 'fluid';
export type LineSpacing = 'compact' | 'comfortable' | 'wide';

export interface ReaderTypographySettings {
  defaultViewMode: ReaderViewMode;
  fontSize: number; // 14..28
  lineSpacing: LineSpacing;
  readingTheme: ReadingTheme;
  /** @deprecated substituído por readingTheme */
  adaptPdfColors?: boolean;
}

export interface Book {
  id: string;
  title: string;
  author?: string;
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
  readingTimeSeconds?: number;
}

export interface Library {
  books: Book[];
  watchFolder: string | null;
  tags?: string[];
  tagColors?: Record<string, TagColor>;
}

export interface ReadingProgress {
  [bookId: string]: {
    currentPage: number;
    totalPages: number;
    lastReadAt: string;
    status: 'not-started' | 'reading' | 'completed';
    readingTimeSeconds?: number;
  };
}

export interface HistoryEntry {
  bookId: string;
  bookTitle: string;
  openedAt: string;
  lastActivityAt: string;
  pageOnOpen: number;
  pageOnClose: number | null;
  durationSeconds?: number;
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
  theme: ThemePreference;
  language: AppLanguage;
  defaultFitMode: 'height' | 'width' | 'manual';
  watchFolder: string | null;
  ai: AiSettings;
  reader: ReaderTypographySettings;
}

export type ViewMode = 'grid' | 'list';
export type FilterMode = 'all' | 'not-started' | 'reading' | 'completed' | 'recent';
export type SortMode = 'title' | 'lastRead' | 'addedAt';
export type FitMode = 'height' | 'width' | 'manual';

export type Page = 'library' | 'reader' | 'settings' | 'history' | 'study';

/* ------------------------------------------------------------------ */
/* Anotações, Marcações (Grifos) e Marcadores de Página                */
/* ------------------------------------------------------------------ */

export interface HighlightRect {
  /** Posição horizontal normalizada (0..1) relativa à largura da página */
  x: number;
  /** Posição vertical normalizada (0..1) relativa à altura da página */
  y: number;
  /** Largura normalizada (0..1) */
  width: number;
  /** Altura normalizada (0..1) */
  height: number;
}

export interface Highlight {
  id: string;
  bookId: string;
  /** Número sequencial da marcação no livro (#1, #2, #3...) */
  number: number;
  pageNumber: number;
  color: AnnotationColor;
  mode: ReaderViewMode;
  /** Retângulo normalizado para grifo visual no PDF Original */
  rect?: HighlightRect;
  /** Índice do parágrafo e intervalo para grifo no Texto Fluido */
  paragraphIndex?: number;
  startOffset?: number;
  endOffset?: number;
  /** Trecho de texto grifado (quando disponível) */
  quote?: string;
  createdAt: string;
}

export interface Note {
  id: string;
  bookId: string;
  pageNumber: number;
  title?: string;
  content: string;
  /** ID da marcação (#N) vinculada, ou null/undefined se ligada apenas à página */
  highlightId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Bookmark {
  id: string;
  bookId: string;
  pageNumber: number;
  title: string;
  description?: string;
  color: AnnotationColor;
  createdAt: string;
}

export interface BookAnnotations {
  highlights: Highlight[];
  notes: Note[];
  bookmarks: Bookmark[];
  nextHighlightNumber: number;
}

export interface AnnotationsData {
  version: number;
  books: Record<string, BookAnnotations>;
}

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
  language?: AppLanguage;
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
  generator?: 'local' | 'ai';
  durationSeconds?: number;
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
