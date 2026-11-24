import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  Play,
  RotateCcw,
  Settings2,
  Sparkles,
  Target,
  WifiOff,
} from 'lucide-react';
import { storage } from '@/services/storage';
import { useAppStore } from '@/stores/useAppStore';
import { useStudyStore } from '@/stores/useStudyStore';
import { useTranslation } from '@/stores/useI18nStore';
import { formatPercent, getAllBookStats, getGlobalStats } from '@/services/study-service';
import { AiConfigModal } from './AiConfigModal';
import { QuizHistoryModal } from './QuizHistoryModal';
import type { Book, BookStats, Chapter } from '@/types';
import './StudyPage.css';

interface StudyPageProps {
  onBack?: () => void;
}

function scoreClass(accuracy: number): string {
  if (accuracy >= 0.7) return 'good';
  if (accuracy >= 0.5) return 'mid';
  return 'low';
}

export function StudyPage({ onBack }: StudyPageProps) {
  const { t, locale } = useTranslation();
  const appBack = useAppStore((s) => s.backToLibrary);
  const openBookAtPage = useAppStore((s) => s.openBookAtPage);
  const openBookWithPanel = useAppStore((s) => s.openBookWithPanel);
  const data = useStudyStore((s) => s.data);
  const loadStudy = useStudyStore((s) => s.load);

  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showAiConfig, setShowAiConfig] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiModel, setAiModel] = useState('');

  const handleBack = onBack ?? appBack;

  const formatDate = (iso: string): string => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });
    } catch {
      return '—';
    }
  };

  const refreshAiStatus = () => {
    storage
      .getSettings()
      .then((s) => {
        setAiEnabled(s.ai.enabled);
        setAiModel(s.ai.model || 'gemini-2.5-flash');
      })
      .catch(() => undefined);
  };

  useEffect(() => {
    void loadStudy();
    refreshAiStatus();
    storage
      .getLibrary()
      .then((library) => {
        setBooks(library.books);
        if (library.books.length > 0) {
          setSelectedBookId((prev) => prev || library.books[0]!.id);
        }
      })
      .catch((err) => console.error('Erro ao carregar a biblioteca:', err))
      .finally(() => setLoading(false));
  }, [loadStudy]);

  const bookById = useMemo(() => new Map(books.map((book) => [book.id, book])), [books]);
  const bookStats = useMemo(() => getAllBookStats(data), [data]);
  const globalStats = useMemo(() => getGlobalStats(data), [data]);
  const weakChapters = useMemo(
    () =>
      bookStats
        .flatMap((stats) => stats.chapterStats.map((chapterStats) => ({ stats, chapterStats })))
        .filter(({ chapterStats }) => chapterStats.accuracy < 0.7)
        .sort((a, b) => a.chapterStats.accuracy - b.chapterStats.accuracy)
        .slice(0, 8),
    [bookStats],
  );
  const hasData = globalStats.total > 0;

  const openChapter = (stats: BookStats, chapter: Chapter, withQuiz: boolean) => {
    const book = bookById.get(stats.bookId);
    if (!book) return;
    openBookAtPage(book, chapter.startPage, withQuiz ? chapter.id : null);
  };

  const handleLaunchSelectedBook = () => {
    const book = bookById.get(selectedBookId);
    if (!book) return;
    openBookWithPanel(book, 'study');
  };

  return (
    <div className="study-page">
      <header className="study-header">
        <div className="study-header-left">
          <button className="btn btn-ghost btn-icon" onClick={handleBack} title={t('common.back')}>
            <ArrowLeft size={18} />
          </button>
          <h2>{t('study.title')}</h2>
        </div>

        <div className="study-header-right">
          <span className={`study-ai-status-pill ${aiEnabled ? 'ai' : 'offline'}`}>
            {aiEnabled ? (
              <>
                <Sparkles size={14} /> {t('study.aiActive')} ({aiModel})
              </>
            ) : (
              <>
                <WifiOff size={14} /> {t('study.offlineActive')}
              </>
            )}
          </span>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setShowHistory(true)}
            title={t('study.history')}
            aria-label={t('study.history')}
          >
            <Clock size={17} />
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowAiConfig(true)}
            title={t('study.configureAi')}
          >
            <Settings2 size={15} /> {t('study.configureAi')}
          </button>
        </div>
      </header>

      <div className="study-content">
        {loading ? (
          <div className="study-loading">
            <div className="spinner" />
          </div>
        ) : (
          <div className="study-inner">
            {/* Painel de Desempenho */}
            <section className="study-kpis">
              <div className="study-kpi card">
                <span className="study-kpi-label">{t('study.avgAccuracy')}</span>
                <strong className={hasData ? scoreClass(globalStats.accuracy) : ''}>
                  {hasData ? formatPercent(globalStats.accuracy) : '—'}
                </strong>
                <span className="study-kpi-hint">
                  {globalStats.correct}/{globalStats.total}
                </span>
              </div>
              <div className="study-kpi card">
                <span className="study-kpi-label">{t('study.chaptersMastered')}</span>
                <strong className="good">{globalStats.chaptersMastered}</strong>
                <span className="study-kpi-hint">
                  / {globalStats.chaptersStudied}
                </span>
              </div>
              <div className="study-kpi card">
                <span className="study-kpi-label">{t('study.totalAttempts')}</span>
                <strong>{globalStats.attempts}</strong>
                <span className="study-kpi-hint">
                  {globalStats.total} questões
                </span>
              </div>
              <div className="study-kpi card">
                <span className="study-kpi-label">{t('study.booksStudied')}</span>
                <strong>{globalStats.booksStudied}</strong>
                <span className="study-kpi-hint">
                  / {books.length}
                </span>
              </div>
            </section>

            {/* Seletor rápido de livro para começar a estudar */}
            {books.length > 0 && (
              <section className="study-launcher card">
                <div className="study-launcher-info">
                  <GraduationCap size={20} />
                  <div>
                    <strong>{t('study.pickBook')}</strong>
                    <span className="study-section-hint">
                      {t('study.noQuizzesHint')}
                    </span>
                  </div>
                </div>
                <div className="study-launcher-controls">
                  <select
                    className="input study-book-select"
                    value={selectedBookId}
                    onChange={(e) => setSelectedBookId(e.target.value)}
                  >
                    {books.map((book) => (
                      <option key={book.id} value={book.id}>
                        {book.title}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!selectedBookId}
                    onClick={handleLaunchSelectedBook}
                  >
                    <Play size={15} />
                    {t('study.openStudentMode')}
                  </button>
                </div>
              </section>
            )}

            {!hasData ? (
              <div className="empty-state study-empty-card card">
                <GraduationCap size={44} className="empty-state-icon" />
                <h3 className="empty-state-title">{t('study.noQuizzesYet')}</h3>
                <p className="empty-state-text">{t('study.noQuizzesHint')}</p>
              </div>
            ) : (
              <>
                {weakChapters.length > 0 && (
                  <section className="study-section">
                    <div className="study-section-head">
                      <h3>
                        <Target size={16} /> {t('study.weakChapters')}
                      </h3>
                      <span className="study-section-hint">{t('study.weakHint')}</span>
                    </div>

                    <div className="study-weak-list">
                      {weakChapters.map(({ stats, chapterStats }) => {
                        const book = bookById.get(stats.bookId);
                        const quizMode =
                          data.books[stats.bookId]?.quizzes[chapterStats.chapter.id]?.generator;
                        return (
                          <div
                            key={`${stats.bookId}-${chapterStats.chapter.id}`}
                            className="study-weak-item card"
                          >
                            <span
                              className={`study-weak-score ${scoreClass(chapterStats.accuracy)}`}
                            >
                              {formatPercent(chapterStats.accuracy)}
                            </span>
                            <div className="study-weak-info">
                              <strong className="truncate">{chapterStats.chapter.title}</strong>
                              <span className="study-weak-meta">
                                {stats.bookTitle} · pp. {chapterStats.chapter.startPage}–
                                {chapterStats.chapter.endPage} · {chapterStats.correct}/
                                {chapterStats.total}
                                {quizMode && (
                                  <>
                                    {' · '}
                                    {quizMode === 'ai' ? t('study.modeAi') : t('study.modeOffline')}
                                  </>
                                )}
                              </span>
                            </div>
                            <div className="study-weak-actions">
                              <button
                                className="btn btn-secondary btn-sm"
                                disabled={!book}
                                onClick={() => openChapter(stats, chapterStats.chapter, true)}
                              >
                                <RotateCcw size={13} /> {t('study.redo')}
                              </button>
                              <button
                                className="btn btn-ghost btn-sm"
                                disabled={!book}
                                onClick={() => openChapter(stats, chapterStats.chapter, false)}
                              >
                                <BookOpen size={13} /> {t('study.reread')}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                <section className="study-section">
                  <div className="study-section-head">
                    <h3>
                      <Sparkles size={16} /> {t('study.performanceByBook')}
                    </h3>
                  </div>

                  <div className="study-books">
                    {bookStats.map((stats) => (
                      <article key={stats.bookId} className="study-book card">
                        <header className="study-book-head">
                          <div className="study-book-identity">
                            {bookById.get(stats.bookId)?.coverDataUrl ? (
                              <img
                                className="study-book-cover"
                                src={bookById.get(stats.bookId)?.coverDataUrl ?? undefined}
                                alt=""
                              />
                            ) : (
                              <span className="study-book-cover placeholder">
                                <BookOpen size={14} />
                              </span>
                            )}
                            <div className="study-book-titles">
                              <h4 className="truncate" title={stats.bookTitle}>
                                {stats.bookTitle}
                              </h4>
                              <span className="study-book-meta">
                                {stats.chaptersStudied} · {stats.correct}/{stats.total}
                              </span>
                            </div>
                          </div>

                          <div className="study-book-score">
                            <span className={scoreClass(stats.accuracy)}>
                              {stats.total > 0 ? formatPercent(stats.accuracy) : '—'}
                            </span>
                            <div className="study-bar">
                              <span
                                className={scoreClass(stats.accuracy)}
                                style={{ width: `${Math.round(stats.accuracy * 100)}%` }}
                              />
                            </div>
                          </div>
                        </header>

                        {stats.chapterStats.length > 0 && (
                          <div className="study-chapters">
                            {stats.chapterStats
                              .slice()
                              .sort((a, b) => a.accuracy - b.accuracy)
                              .map((chapterStats) => {
                                const quizMode =
                                  data.books[stats.bookId]?.quizzes[chapterStats.chapter.id]
                                    ?.generator;
                                return (
                                  <div key={chapterStats.chapter.id} className="study-chapter-row">
                                    <div className="study-chapter-info">
                                      <span className="study-chapter-title truncate">
                                        {chapterStats.chapter.title}
                                      </span>
                                      <span className="study-chapter-meta">
                                        pp. {chapterStats.chapter.startPage}–
                                        {chapterStats.chapter.endPage} · {chapterStats.correct}/
                                        {chapterStats.total} · {chapterStats.attempts}× ·{' '}
                                        {formatDate(chapterStats.lastAttemptAt)}
                                        {quizMode && (
                                          <>
                                            {' · '}
                                            <strong>
                                              {quizMode === 'ai'
                                                ? t('study.modeAi')
                                                : t('study.modeOffline')}
                                            </strong>
                                          </>
                                        )}
                                      </span>
                                    </div>

                                    <div className="study-chapter-accuracy">
                                      <div className="study-bar small">
                                        <span
                                          className={scoreClass(chapterStats.accuracy)}
                                          style={{
                                            width: `${Math.round(chapterStats.accuracy * 100)}%`,
                                          }}
                                        />
                                      </div>
                                      <span
                                        className={`study-chapter-pct ${scoreClass(chapterStats.accuracy)}`}
                                      >
                                        {formatPercent(chapterStats.accuracy)}
                                      </span>
                                    </div>

                                    <div className="study-chapter-actions">
                                      <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={() =>
                                          openChapter(stats, chapterStats.chapter, true)
                                        }
                                      >
                                        <RotateCcw size={13} /> {t('study.redo')}
                                      </button>
                                      <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={() =>
                                          openChapter(stats, chapterStats.chapter, false)
                                        }
                                      >
                                        <BookOpen size={13} /> {t('study.reread')}
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                </section>

                <p className="study-footer-note">
                  <CheckCircle2 size={13} /> <code>study-progress.json</code>
                </p>
              </>
            )}
          </div>
        )}
      </div>

      <AiConfigModal
        isOpen={showAiConfig}
        onClose={() => setShowAiConfig(false)}
        onSaved={() => refreshAiStatus()}
      />

      <QuizHistoryModal isOpen={showHistory} onClose={() => setShowHistory(false)} />
    </div>
  );
}
