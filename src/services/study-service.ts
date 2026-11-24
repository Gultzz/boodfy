import { storage } from './storage';
import type {
  Book,
  BookStats,
  BookStudyData,
  Chapter,
  ChapterStats,
  QuizAnswer,
  QuizAttempt,
  StudyData,
} from '@/types';

const STUDY_VERSION = 1;
const MAX_ATTEMPTS_PER_BOOK = 300;

export function emptyStudyData(): StudyData {
  return { version: STUDY_VERSION, books: {} };
}

export function ensureBookEntry(
  data: StudyData,
  bookId: string,
  bookTitle: string,
): BookStudyData {
  const existing = data.books[bookId];
  if (existing) {
    return {
      ...existing,
      bookTitle: bookTitle || existing.bookTitle,
      chapters: existing.chapters ?? [],
      chaptersSignature: existing.chaptersSignature ?? '',
      quizzes: existing.quizzes ?? {},
      attempts: existing.attempts ?? [],
    };
  }
  const created: BookStudyData = {
    bookId,
    bookTitle,
    chapters: [],
    chaptersSignature: '',
    quizzes: {},
    attempts: [],
  };
  data.books[bookId] = created;
  return created;
}

function summarize(attempts: QuizAttempt[]) {
  const total = attempts.reduce((sum, item) => sum + item.total, 0);
  const correct = attempts.reduce((sum, item) => sum + item.correctCount, 0);
  return {
    attempts: attempts.length,
    correct,
    total,
    accuracy: total > 0 ? correct / total : 0,
  };
}

export function getChapterStats(entry: BookStudyData): ChapterStats[] {
  const byChapter = new Map<string, QuizAttempt[]>();
  for (const attempt of entry.attempts) {
    const list = byChapter.get(attempt.chapterId) ?? [];
    list.push(attempt);
    byChapter.set(attempt.chapterId, list);
  }

  const chapterById = new Map<string, Chapter>(
    entry.chapters.map((chapter) => [chapter.id, chapter]),
  );

  const stats: ChapterStats[] = [];

  for (const [chapterId, attempts] of byChapter.entries()) {
    if (attempts.length === 0) continue;
    const summary = summarize(attempts);
    const last = attempts[attempts.length - 1] as QuizAttempt;
    const lastAccuracy = last.total > 0 ? last.correctCount / last.total : 0;
    const bestAccuracy = attempts.reduce((best, item) => {
      const value = item.total > 0 ? item.correctCount / item.total : 0;
      return Math.max(best, value);
    }, 0);

    const quiz = entry.quizzes[chapterId];
    const chapter: Chapter = chapterById.get(chapterId) ?? {
      id: chapterId,
      title: last.chapterTitle || quiz?.chapterTitle || 'Capítulo',
      startPage: quiz?.startPage ?? 1,
      endPage: quiz?.endPage ?? 1,
      level: 0,
    };

    stats.push({
      chapter,
      ...summary,
      lastAccuracy,
      bestAccuracy,
      lastAttemptAt: last.finishedAt,
    });
  }

  return stats;
}

export function getBookStats(entry: BookStudyData): BookStats {
  const summary = summarize(entry.attempts);
  const chapterStats = getChapterStats(entry);
  return {
    bookId: entry.bookId,
    bookTitle: entry.bookTitle,
    ...summary,
    chaptersStudied: chapterStats.length,
    chapterStats,
  };
}

export function getAllBookStats(data: StudyData): BookStats[] {
  return Object.values(data.books)
    .filter((entry) => entry.attempts.length > 0 || entry.chapters.length > 0)
    .map(getBookStats)
    .sort((a, b) => (b.total ?? 0) - (a.total ?? 0));
}

export interface GlobalStudyStats {
  attempts: number;
  correct: number;
  total: number;
  accuracy: number;
  chaptersStudied: number;
  chaptersMastered: number;
  booksStudied: number;
}

export function getGlobalStats(data: StudyData): GlobalStudyStats {
  const books = Object.values(data.books);
  const summary = summarize(books.flatMap((entry) => entry.attempts));
  const allChapterStats = books.flatMap((entry) => getChapterStats(entry));
  const chaptersMastered = allChapterStats.filter((c) => c.bestAccuracy >= 0.7).length;

  return {
    ...summary,
    chaptersStudied: allChapterStats.length,
    chaptersMastered,
    booksStudied: books.filter((entry) => entry.attempts.length > 0).length,
  };
}

export interface AttemptHistoryItem {
  bookId: string;
  bookTitle: string;
  attempt: QuizAttempt;
  generator: 'local' | 'ai';
  durationSeconds: number;
  accuracy: number;
}

export function getAttemptDurationSeconds(attempt: QuizAttempt): number {
  if (typeof attempt.durationSeconds === 'number' && attempt.durationSeconds >= 0) {
    return Math.round(attempt.durationSeconds);
  }
  const start = Date.parse(attempt.startedAt);
  const end = Date.parse(attempt.finishedAt);
  if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
    return Math.max(1, Math.round((end - start) / 1000));
  }
  return 0;
}

export function getAllAttemptsHistory(
  data: StudyData,
  filterBookId?: string,
): AttemptHistoryItem[] {
  const entries = filterBookId
    ? data.books[filterBookId]
      ? [data.books[filterBookId]]
      : []
    : Object.values(data.books);

  const items: AttemptHistoryItem[] = [];
  for (const entry of entries) {
    for (const attempt of entry.attempts ?? []) {
      const quiz = entry.quizzes[attempt.chapterId];
      const generator: 'local' | 'ai' = attempt.generator ?? quiz?.generator ?? 'local';
      const durationSeconds = getAttemptDurationSeconds(attempt);
      const accuracy = attempt.total > 0 ? attempt.correctCount / attempt.total : 0;
      items.push({
        bookId: entry.bookId,
        bookTitle: entry.bookTitle,
        attempt,
        generator,
        durationSeconds,
        accuracy,
      });
    }
  }

  return items.sort(
    (a, b) => Date.parse(b.attempt.finishedAt || '') - Date.parse(a.attempt.finishedAt || ''),
  );
}

/** Capítulos com pior desempenho, de todos os livros, para a lista de revisão */
export function getWeakChapters(data: StudyData, threshold = 0.7, limit = 12): ChapterStats[] {
  return Object.values(data.books)
    .flatMap((entry) => getChapterStats(entry))
    .filter((stats) => stats.accuracy < threshold)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, limit);
}

export async function loadStudyData(): Promise<StudyData> {
  const data = await storage.getStudy();
  return { version: STUDY_VERSION, books: data.books ?? {} };
}

export function recordAttempt(
  data: StudyData,
  book: Book,
  attempt: QuizAttempt,
): void {
  const entry = ensureBookEntry(data, book.id, book.title);
  entry.attempts.push(attempt);
  if (entry.attempts.length > MAX_ATTEMPTS_PER_BOOK) {
    entry.attempts = entry.attempts.slice(-MAX_ATTEMPTS_PER_BOOK);
  }
}

export function createAttempt(
  chapter: Chapter,
  answers: QuizAnswer[],
  startedAt: string,
  generator: 'local' | 'ai' = 'local',
): QuizAttempt {
  const finishedAt = new Date().toISOString();
  const correctCount = answers.filter((answer) => answer.correct).length;
  const startMs = Date.parse(startedAt);
  const endMs = Date.parse(finishedAt);
  const durationSeconds =
    Number.isFinite(startMs) && Number.isFinite(endMs) && endMs >= startMs
      ? Math.max(1, Math.round((endMs - startMs) / 1000))
      : 1;

  return {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    chapterId: chapter.id,
    chapterTitle: chapter.title,
    startedAt,
    finishedAt,
    correctCount,
    total: answers.length,
    answers,
    generator,
    durationSeconds,
  };
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  const mins = Math.floor(s / 60);
  const remSec = s % 60;
  if (mins < 60) {
    return remSec > 0 ? `${mins}m ${remSec}s` : `${mins}m`;
  }
  const hours = Math.floor(mins / 60);
  const remMin = mins % 60;
  return remMin > 0 ? `${hours}h ${remMin}m` : `${hours}h`;
}
