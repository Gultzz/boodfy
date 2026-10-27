import { create } from 'zustand';
import { storage } from '@/services/storage';
import { emptyStudyData, ensureBookEntry, loadStudyData } from '@/services/study-service';
import type { Book, BookStudyData, Chapter, Quiz, QuizAttempt, StudyData } from '@/types';

interface StudyState {
  data: StudyData;
  loading: boolean;
  loaded: boolean;
  load: () => Promise<void>;
  saveChapters: (book: Book, chapters: Chapter[], signature: string) => Promise<void>;
  saveQuiz: (book: Book, quiz: Quiz) => Promise<void>;
  addAttempt: (book: Book, attempt: QuizAttempt) => Promise<void>;
  getBook: (bookId: string) => BookStudyData | undefined;
}

let persistChain: Promise<void> = Promise.resolve();

function updateBook(
  data: StudyData,
  bookId: string,
  bookTitle: string,
  update: (entry: BookStudyData) => BookStudyData,
): StudyData {
  const entry = ensureBookEntry({ ...data, books: { ...data.books } }, bookId, bookTitle);
  return { ...data, books: { ...data.books, [bookId]: update(entry) } };
}

export const useStudyStore = create<StudyState>((set, get) => {
  const persist = (data: StudyData): Promise<void> => {
    persistChain = persistChain
      .catch(() => undefined)
      .then(() => storage.saveStudy(data))
      .catch((err) => console.error('Erro ao salvar o progresso de estudo:', err));
    return persistChain;
  };

  return {
    data: emptyStudyData(),
    loading: false,
    loaded: false,

    load: async () => {
      if (get().loaded || get().loading) return;
      set({ loading: true });
      try {
        const data = await loadStudyData();
        set({ data, loading: false, loaded: true });
      } catch (err) {
        console.error('Erro ao carregar o progresso de estudo:', err);
        set({ loading: false, loaded: true });
      }
    },

    saveChapters: async (book, chapters, signature) => {
      const data = updateBook(get().data, book.id, book.title, (entry) => ({
        ...entry,
        chapters,
        chaptersSignature: signature,
      }));
      set({ data });
      await persist(data);
    },

    saveQuiz: async (book, quiz) => {
      const data = updateBook(get().data, book.id, book.title, (entry) => ({
        ...entry,
        quizzes: { ...entry.quizzes, [quiz.chapterId]: quiz },
      }));
      set({ data });
      await persist(data);
    },

    addAttempt: async (book, attempt) => {
      const data = updateBook(get().data, book.id, book.title, (entry) => {
        const attempts = [...entry.attempts, attempt].slice(-300);
        return { ...entry, attempts };
      });
      set({ data });
      await persist(data);
    },

    getBook: (bookId) => get().data.books[bookId],
  };
});

