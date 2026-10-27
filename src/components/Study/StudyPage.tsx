import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  RotateCcw,
  Settings2,
  Sparkles,
  Target,
  WifiOff,
} from 'lucide-react';
import { storage } from '@/services/storage';
import { useAppStore } from '@/stores/useAppStore';
import { useStudyStore } from '@/stores/useStudyStore';
import { formatPercent, getAllBookStats, getGlobalStats } from '@/services/study-service';
import { AiConfigModal } from './AiConfigModal';
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

function formatDate(iso: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  } catch {
    return '—';
  }
}

export function StudyPage({ onBack }: StudyPageProps) {
  const appBack = useAppStore((s) => s.backToLibrary);
  const openBookAtPage = useAppStore((s) => s.openBookAtPage);
  const data = useStudyStore((s) => s.data);
  const loadStudy = useStudyStore((s) => s.load);

  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAiConfig, setShowAiConfig] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiModel, setAiModel] = useState('');

  const handleBack = onBack ?? appBack;

  const refreshAiStatus = () => {
    storage
      .getSettings()
      .then((s) => {
        setAiEnabled(s.ai.enabled);
        setAiModel(s.ai.model || 'gemini-2.0-flash');
      })
      .catch(() => undefined);
  };

  useEffect(() => {
    void loadStudy();
    refreshAiStatus();
    storage
      .getLibrary()
      .then((library) => setBooks(library.books))
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

  return (
    <div className="study-page">
      <header className="study-header">
        <div className="study-header-left">
          <button className="btn btn-ghost btn-icon" onClick={handleBack} title="Voltar">
            <ArrowLeft size={18} />
          </button>
          <h2>Estudos e Estatísticas</h2>
        </div>

        <div className="study-header-right">
          <span className={`study-ai-status-pill ${aiEnabled ? 'ai' : 'offline'}`}>
            {aiEnabled ? (
              <>
                <Sparkles size={14} /> Modo Com IA Ativo ({aiModel})
              </>
            ) : (
              <>
                <WifiOff size={14} /> Modo Offline (Sem IA)
              </>
            )}
          </span>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowAiConfig(true)}
            title="Configurar modo de geração de perguntas (Com IA ou Sem IA)"
          >
            <Settings2 size={15} /> Configurar IA do Quiz
          </button>
        </div>
      </header>

      <div className="study-content">
        {loading ? (
          <div className="study-loading">
            <div className="spinner" />
          </div>
        ) : !hasData ? (
          <div className="empty-state study-empty">
            <GraduationCap size={48} className="empty-state-icon" />
            <h3 className="empty-state-title">Nenhum quiz realizado ainda</h3>
            <p className="empty-state-text">
              Abra qualquer livro na biblioteca e clique no botão <strong>Modo Estudante</strong> no
              topo do leitor para abrir o painel de perguntas ao lado do PDF. Seus acertos, erros e
              capítulos para revisão aparecerão aqui.
            </p>
            <button className="btn btn-secondary" onClick={() => setShowAiConfig(true)}>
              <Settings2 size={16} /> Configurar IA para Quizzes
            </button>
          </div>
        ) : (
          <div className="study-inner">
            <section className="study-kpis">
              <div className="study-kpi card">
                <span className="study-kpi-label">Perguntas respondidas</span>
                <strong>{globalStats.total}</strong>
                <span className="study-kpi-hint">{globalStats.attempts} quizzes realizados</span>
              </div>
              <div className="study-kpi card">
                <span className="study-kpi-label">Acertos</span>
                <strong className="good">{globalStats.correct}</strong>
                <span className="study-kpi-hint">{formatPercent(globalStats.accuracy)} do total</span>
              </div>
              <div className="study-kpi card">
                <span className="study-kpi-label">Erros</span>
                <strong className="low">{globalStats.total - globalStats.correct}</strong>
                <span className="study-kpi-hint">
                  {formatPercent(1 - globalStats.accuracy)} do total
                </span>
              </div>
              <div className="study-kpi card">
                <span className="study-kpi-label">Capítulos estudados</span>
                <strong>{globalStats.chaptersStudied}</strong>
                <span className="study-kpi-hint">
                  em {globalStats.booksStudied}{' '}
                  {globalStats.booksStudied === 1 ? 'livro' : 'livros'}
                </span>
              </div>
            </section>

            {weakChapters.length > 0 && (
              <section className="study-section">
                <div className="study-section-head">
                  <h3>
                    <Target size={16} /> Capítulos que precisam de revisão
                  </h3>
                  <span className="study-section-hint">abaixo de 70% de acerto</span>
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
                            {chapterStats.total} acertos
                            {quizMode && (
                              <>
                                {' · '}
                                {quizMode === 'ai' ? 'Feito com IA' : 'Feito Sem IA'}
                              </>
                            )}
                          </span>
                        </div>
                        <div className="study-weak-actions">
                          <button
                            className="btn btn-secondary btn-sm"
                            disabled={!book}
                            onClick={() => openChapter(stats, chapterStats.chapter, true)}
                            title="Abrir o livro com o Modo Estudante neste capítulo"
                          >
                            <RotateCcw size={13} /> Refazer
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            disabled={!book}
                            onClick={() => openChapter(stats, chapterStats.chapter, false)}
                            title="Abrir o capítulo no leitor para reler"
                          >
                            <BookOpen size={13} /> Reler
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
                  <Sparkles size={16} /> Desempenho por livro e capítulo
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
                            {stats.chaptersStudied}{' '}
                            {stats.chaptersStudied === 1 ? 'capítulo' : 'capítulos'} estudados ·{' '}
                            {stats.total} perguntas ({stats.correct} acertos e{' '}
                            {stats.total - stats.correct} erros)
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

                    {stats.chapterStats.length === 0 ? (
                      <p className="study-book-empty">
                        Nenhuma pergunta respondida ainda. Abra o livro e use o Modo Estudante.
                      </p>
                    ) : (
                      <div className="study-chapters">
                        {stats.chapterStats
                          .slice()
                          .sort((a, b) => a.accuracy - b.accuracy)
                          .map((chapterStats) => {
                            const quizMode =
                              data.books[stats.bookId]?.quizzes[chapterStats.chapter.id]?.generator;
                            return (
                              <div key={chapterStats.chapter.id} className="study-chapter-row">
                                <div className="study-chapter-info">
                                  <span className="study-chapter-title truncate">
                                    {chapterStats.chapter.title}
                                  </span>
                                  <span className="study-chapter-meta">
                                    pp. {chapterStats.chapter.startPage}–
                                    {chapterStats.chapter.endPage} · {chapterStats.correct} acertos /{' '}
                                    {chapterStats.total - chapterStats.correct} erros ·{' '}
                                    {chapterStats.attempts}{' '}
                                    {chapterStats.attempts === 1 ? 'tentativa' : 'tentativas'} ·{' '}
                                    {formatDate(chapterStats.lastAttemptAt)}
                                    {quizMode && (
                                      <>
                                        {' · '}
                                        <strong>
                                          {quizMode === 'ai' ? 'Com IA' : 'Sem IA'}
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
                                    onClick={() => openChapter(stats, chapterStats.chapter, true)}
                                    title="Refazer o quiz deste capítulo"
                                  >
                                    <RotateCcw size={13} /> Refazer
                                  </button>
                                  <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => openChapter(stats, chapterStats.chapter, false)}
                                    title="Abrir o capítulo no leitor"
                                  >
                                    <BookOpen size={13} /> Reler
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
              <CheckCircle2 size={13} /> Estatísticas salvas localmente em{' '}
              <code>study-progress.json</code>.
            </p>
          </div>
        )}
      </div>

      <AiConfigModal
        isOpen={showAiConfig}
        onClose={() => setShowAiConfig(false)}
        onSaved={() => refreshAiStatus()}
      />
    </div>
  );
}

