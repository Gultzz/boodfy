import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import {
  AlertCircle,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  ListOrdered,
  Loader2,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  Settings2,
  Sparkles,
  WifiOff,
  X,
  XCircle,
} from 'lucide-react';
import type { Book, Chapter, Quiz, QuizQuestion } from '@/types';
import { useStudyStore } from '@/stores/useStudyStore';
import { buildChapters } from '@/services/study-chapters';
import { extractPagesText } from '@/services/pdf-text';
import {
  generateLocalQuiz,
  MIN_QUIZ_QUESTIONS,
  QUIZ_GENERATOR_VERSION,
  QuizGenerationError,
} from '@/services/quiz-generator';
import { generateAiQuiz } from '@/services/quiz-ai';
import {
  createAttempt,
  formatPercent,
  getBookStats,
  getChapterStats,
} from '@/services/study-service';
import { storage } from '@/services/storage';
import { AiConfigModal } from './AiConfigModal';
import './StudentMode.css';

type Phase = 'overview' | 'preparing' | 'quiz' | 'results';

interface StudentModeProps {
  book: Book;
  pdf: PDFDocumentProxy | null;
  totalPages: number;
  currentPage: number;
  initialChapterId?: string | null;
  onClose: () => void;
  onGoToPage: (page: number) => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

function scoreClass(accuracy: number): string {
  if (accuracy >= 0.7) return 'good';
  if (accuracy >= 0.5) return 'mid';
  return 'low';
}

function resultMessage(accuracy: number): string {
  if (accuracy >= 0.9) return 'Excelente domínio do capítulo!';
  if (accuracy >= 0.7) return 'Bom resultado! Vale revisar apenas os pontos que errou.';
  if (accuracy >= 0.5) return 'Quase lá. Releia os trechos indicados ao lado e tente novamente.';
  return 'Este capítulo merece uma releitura atenta antes de refazer o quiz.';
}

function chapterForPage(chapters: Chapter[], page: number): Chapter | undefined {
  return chapters
    .filter((chapter) => page >= chapter.startPage && page <= chapter.endPage)
    .sort((a, b) => b.level - a.level)[0];
}

export function StudentMode({
  book,
  pdf,
  totalPages,
  currentPage,
  initialChapterId,
  onClose,
  onGoToPage,
}: StudentModeProps) {
  const studyData = useStudyStore((s) => s.data);
  const loadStudy = useStudyStore((s) => s.load);
  const saveChapters = useStudyStore((s) => s.saveChapters);
  const saveQuiz = useStudyStore((s) => s.saveQuiz);
  const addAttempt = useStudyStore((s) => s.addAttempt);

  const [panelWidth, setPanelWidth] = useState(490);
  const isResizingRef = useRef(false);

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(true);
  const [chaptersError, setChaptersError] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chapterPickerOpen, setChapterPickerOpen] = useState(false);
  const [filter, setFilter] = useState('');

  const [phase, setPhase] = useState<Phase>('overview');
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<
    { questionId: string; selectedIndex: number; correct: boolean }[]
  >([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState(() => new Date().toISOString());
  const [quizError, setQuizError] = useState<string | null>(null);
  const [aiFailedError, setAiFailedError] = useState<string | null>(null);
  const [prepareLabel, setPrepareLabel] = useState('Lendo o texto do capítulo...');

  const [showAiConfig, setShowAiConfig] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiModel, setAiModel] = useState('');
  const [aiVerified, setAiVerified] = useState(false);

  const entry = studyData.books[book.id];
  const bookStats = useMemo(() => (entry ? getBookStats(entry) : null), [entry]);
  const chapterStats = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getChapterStats>[number]>();
    if (entry) {
      for (const stats of getChapterStats(entry)) map.set(stats.chapter.id, stats);
    }
    return map;
  }, [entry]);

  const dataRef = useRef(studyData);
  dataRef.current = studyData;
  const defaultsRef = useRef({ initialChapterId, currentPage });
  defaultsRef.current = { initialChapterId, currentPage };

  const refreshAiSettings = useCallback(async () => {
    try {
      const [s, hasKey] = await Promise.all([
        storage.getSettings(),
        window.electronAPI.aiHasKey().catch(() => false),
      ]);
      const isLocal = /localhost|127\.0\.0\.1/i.test(s.ai.baseUrl || '');
      setAiEnabled(s.ai.enabled);
      setAiModel(s.ai.model || 'gemini-2.0-flash');
      setAiVerified(Boolean(s.ai.enabled && (hasKey || isLocal)));
    } catch {
      setAiEnabled(false);
      setAiVerified(false);
    }
  }, []);

  useEffect(() => {
    void loadStudy();
    void refreshAiSettings();
  }, [loadStudy, refreshAiSettings]);

  // Redimensionamento lateral do painel
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      const newWidth = Math.min(Math.max(window.innerWidth - e.clientX, 380), 760);
      setPanelWidth(newWidth);
    };
    const handleMouseUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Monta os capítulos a partir do sumário do PDF
  useEffect(() => {
    if (!pdf || totalPages <= 0) {
      setChaptersLoading(false);
      return;
    }
    let cancelled = false;
    setChaptersLoading(true);
    setChaptersError(null);

    buildChapters(pdf, totalPages)
      .then((result) => {
        if (cancelled) return;
        setChapters(result.chapters);
        setUsedFallback(result.fallback);
        setChaptersLoading(false);
        const cached = dataRef.current.books[book.id];
        if (cached?.chaptersSignature !== result.signature) {
          void saveChapters(book, result.chapters, result.signature);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Erro ao montar os capítulos:', err);
        setChaptersError('Não foi possível montar os capítulos deste PDF.');
        setChaptersLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pdf, totalPages, book, saveChapters]);

  // Capítulo inicial: o pedido de fora, a página atual ou o primeiro capítulo
  useEffect(() => {
    if (selectedId || chapters.length === 0) return;
    const preferred = defaultsRef.current.initialChapterId;
    if (preferred && chapters.some((chapter) => chapter.id === preferred)) {
      setSelectedId(preferred);
      return;
    }
    const containing = chapterForPage(chapters, defaultsRef.current.currentPage);
    setSelectedId(containing?.id ?? chapters[0]?.id ?? null);
  }, [chapters, selectedId]);

  // Trocar de capítulo volta ao estado inicial do quiz
  useEffect(() => {
    setQuiz(null);
    setPhase('overview');
    setAnswers([]);
    setQuestionIndex(0);
    setSelectedIndex(null);
    setQuizError(null);
    setAiFailedError(null);
  }, [selectedId]);

  const selectedChapter = chapters.find((chapter) => chapter.id === selectedId) ?? null;
  const selectedStats = selectedId ? chapterStats.get(selectedId) : undefined;
  const cachedQuiz = selectedChapter ? entry?.quizzes[selectedChapter.id] : undefined;

  const filteredChapters = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return chapters;
    return chapters.filter((chapter) => chapter.title.toLowerCase().includes(term));
  }, [chapters, filter]);

  const startQuiz = useCallback(
    async (options?: { forceRegenerate?: boolean; forceMode?: 'ai' | 'local' }) => {
      if (!pdf || !selectedChapter) return;

      const forceRegenerate = options?.forceRegenerate ?? false;
      const settings = await storage.getSettings();
      const targetMode: 'ai' | 'local' =
        options?.forceMode ?? (settings.ai.enabled ? 'ai' : 'local');

      // Se já existe um quiz salvo do mesmo modo (IA ou Offline) e não pediu para regerar, usa o salvo
      if (!forceRegenerate) {
        const cached = useStudyStore.getState().data.books[book.id]?.quizzes[selectedChapter.id];
        if (
          cached &&
          cached.generatorVersion === QUIZ_GENERATOR_VERSION &&
          cached.questions.length >= MIN_QUIZ_QUESTIONS &&
          cached.generator === targetMode
        ) {
          setQuiz(cached);
          setAnswers([]);
          setQuestionIndex(0);
          setSelectedIndex(null);
          setStartedAt(new Date().toISOString());
          setQuizError(null);
          setAiFailedError(null);
          setPhase('quiz');
          return;
        }
      }

      // Se o modo escolhido é IA, verifica se está configurada antes de iniciar
      if (targetMode === 'ai') {
        const isLocal = /localhost|127\.0\.0\.1/i.test(settings.ai.baseUrl || '');
        const hasKey = isLocal || (await window.electronAPI.aiHasKey().catch(() => false));
        if (!hasKey) {
          setShowAiConfig(true);
          return;
        }
      }

      setPhase('preparing');
      setQuizError(null);
      setAiFailedError(null);
      setPrepareLabel(
        `Lendo as páginas ${selectedChapter.startPage}–${selectedChapter.endPage} do capítulo...`,
      );

      try {
        const pages = await extractPagesText(
          pdf,
          selectedChapter.startPage,
          selectedChapter.endPage,
        );

        let questions: QuizQuestion[];
        let generator: 'local' | 'ai' = targetMode;

        if (targetMode === 'ai') {
          setPrepareLabel(
            `Gerando perguntas com IA (${settings.ai.model || 'modelo configurado'})...`,
          );
          try {
            questions = await generateAiQuiz(pages, selectedChapter, {
              baseUrl: settings.ai.baseUrl,
              model: settings.ai.model,
            });
            generator = 'ai';
          } catch (err) {
            const msg =
              err instanceof Error
                ? err.message
                : 'Não foi possível gerar as perguntas com a IA.';
            setAiFailedError(msg);
            setPhase('overview');
            return;
          }
        } else {
          setPrepareLabel('Gerando perguntas no Modo Offline (Sem IA)...');
          const seedSuffix = forceRegenerate ? String(Date.now()) : '';
          questions = generateLocalQuiz(pages, selectedChapter, seedSuffix);
          generator = 'local';
        }

        const nextQuiz: Quiz = {
          chapterId: selectedChapter.id,
          chapterTitle: selectedChapter.title,
          startPage: selectedChapter.startPage,
          endPage: selectedChapter.endPage,
          questions,
          generator,
          generatorVersion: QUIZ_GENERATOR_VERSION,
          generatedAt: new Date().toISOString(),
        };

        await saveQuiz(book, nextQuiz);

        setQuiz(nextQuiz);
        setAnswers([]);
        setQuestionIndex(0);
        setSelectedIndex(null);
        setStartedAt(new Date().toISOString());
        setPhase('quiz');
      } catch (err) {
        console.error('Erro ao gerar o quiz:', err);
        setQuizError(
          err instanceof QuizGenerationError
            ? err.message
            : 'Não foi possível gerar o quiz deste capítulo. Tente outro capítulo ou um PDF com texto selecionável.',
        );
        setPhase('overview');
      }
    },
    [pdf, selectedChapter, book, saveQuiz],
  );

  const selectOption = useCallback(
    (optionIndex: number) => {
      if (phase !== 'quiz' || !quiz || selectedIndex !== null) return;
      const question = quiz.questions[questionIndex];
      if (!question) return;
      setSelectedIndex(optionIndex);
      setAnswers((prev) => [
        ...prev,
        {
          questionId: question.id,
          selectedIndex: optionIndex,
          correct: optionIndex === question.correctIndex,
        },
      ]);
    },
    [phase, quiz, selectedIndex, questionIndex],
  );

  const finishQuiz = useCallback(async () => {
    if (!quiz || !selectedChapter) return;
    const attempt = createAttempt(selectedChapter, answers, startedAt);
    setPhase('results');
    await addAttempt(book, attempt);
  }, [quiz, selectedChapter, answers, startedAt, book, addAttempt]);

  const goNext = useCallback(() => {
    if (!quiz || selectedIndex === null) return;
    if (questionIndex + 1 < quiz.questions.length) {
      setQuestionIndex((index) => index + 1);
      setSelectedIndex(null);
    } else {
      void finishQuiz();
    }
  }, [quiz, selectedIndex, questionIndex, finishQuiz]);

  const restartQuiz = useCallback(() => {
    setAnswers([]);
    setQuestionIndex(0);
    setSelectedIndex(null);
    setStartedAt(new Date().toISOString());
    setPhase('quiz');
  }, []);

  // Navega para a página no PDF ao lado SEM fechar o Modo Estudante
  const jumpToPdfPage = useCallback(
    (page: number) => {
      onGoToPage(page);
    },
    [onGoToPage],
  );

  // Teclado: 1-4 ou A-D responde, Enter avança/termina
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (showAiConfig) return;
      if (phase !== 'quiz' || !quiz) return;

      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      if (selectedIndex === null) {
        const map: Record<string, number> = {
          '1': 0,
          '2': 1,
          '3': 2,
          '4': 3,
          a: 0,
          b: 1,
          c: 2,
          d: 3,
        };
        const optionIndex = map[event.key.toLowerCase()];
        const question = quiz.questions[questionIndex];
        if (optionIndex !== undefined && question && optionIndex < question.options.length) {
          event.preventDefault();
          selectOption(optionIndex);
        }
      } else if (event.key === 'Enter') {
        event.preventDefault();
        goNext();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, quiz, selectedIndex, questionIndex, selectOption, goNext, showAiConfig]);

  const currentQuestion = quiz?.questions[questionIndex];
  const correctCount = answers.filter((answer) => answer.correct).length;
  const accuracy = answers.length > 0 ? correctCount / answers.length : 0;
  const progress =
    quiz && quiz.questions.length > 0
      ? ((questionIndex + (selectedIndex === null ? 0 : 1)) / quiz.questions.length) * 100
      : 0;

  // Erros da última tentativa deste capítulo para revisão rápida
  const lastAttemptMistakes = useMemo(() => {
    if (!entry || !selectedChapter) return [];
    const chapAttempts = entry.attempts.filter((a) => a.chapterId === selectedChapter.id);
    if (chapAttempts.length === 0) return [];
    const lastAttempt = chapAttempts[chapAttempts.length - 1];
    const chapQuiz = entry.quizzes[selectedChapter.id];
    if (!lastAttempt || !chapQuiz) return [];

    const qMap = new Map(chapQuiz.questions.map((q) => [q.id, q]));
    return lastAttempt.answers
      .filter((ans) => !ans.correct)
      .map((ans) => {
        const question = qMap.get(ans.questionId);
        if (!question) return null;
        return {
          question,
          selectedOption: question.options[ans.selectedIndex] ?? '—',
          correctOption: question.options[question.correctIndex] ?? '—',
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [entry, selectedChapter]);

  return (
    <aside
      className="student-panel"
      style={{ width: `${panelWidth}px` }}
      aria-label="Painel do Modo Estudante"
    >
      {/* Alça de redimensionamento lateral */}
      <div
        className="student-resize-handle"
        onMouseDown={() => {
          isResizingRef.current = true;
          document.body.style.cursor = 'col-resize';
          document.body.style.userSelect = 'none';
        }}
        title="Arraste para ajustar a largura do painel"
      />

      {/* Topo do painel */}
      <header className="student-header">
        <div className="student-header-left">
          <span className="student-header-icon">
            <GraduationCap size={18} />
          </span>
          <div className="student-header-titles">
            <h2>Modo Estudante</h2>
            <span className="student-header-sub">
              {bookStats && bookStats.total > 0
                ? `${formatPercent(bookStats.accuracy)} de acerto no livro (${bookStats.correct}/${bookStats.total})`
                : 'Leia o PDF ao lado enquanto responde'}
            </span>
          </div>
        </div>

        <div className="student-header-actions">
          <button
            className={`btn btn-secondary btn-sm student-mode-config-btn ${aiEnabled && aiVerified ? 'ai-on' : 'ai-off'}`}
            onClick={() => setShowAiConfig(true)}
            title="Escolher entre perguntas com IA ou Offline (Sem IA)"
          >
            {aiEnabled && aiVerified ? <Sparkles size={14} /> : <Settings2 size={14} />}
            <span>{aiEnabled && aiVerified ? 'Com IA' : 'Sem IA'}</span>
          </button>

          <button className="btn btn-ghost btn-icon" onClick={onClose} title="Fechar Modo Estudante">
            <X size={18} />
          </button>
        </div>
      </header>

      {/* Aviso explícito e permanente do modo ativo (Com IA vs Sem IA) */}
      <div className={`student-mode-banner ${aiEnabled && aiVerified ? 'is-ai' : 'is-offline'}`}>
        <div className="student-mode-banner-text">
          {aiEnabled && aiVerified ? (
            <>
              <Sparkles size={15} className="banner-icon" />
              <div>
                <strong>Modo com Inteligência Artificial ativo ({aiModel})</strong>
                <span>
                  As perguntas são criadas por IA analisando o contexto e o entendimento do capítulo.
                </span>
              </div>
            </>
          ) : (
            <>
              <WifiOff size={15} className="banner-icon" />
              <div>
                <strong>Modo Offline (Sem IA) ativo</strong>
                <span>
                  As perguntas são feitas sem IA (localmente a partir de frases do texto). Ative a IA
                  para perguntas mais complexas de contexto.
                </span>
              </div>
            </>
          )}
        </div>
        <button
          type="button"
          className="student-banner-link"
          onClick={() => setShowAiConfig(true)}
        >
          {aiEnabled && aiVerified ? 'Alterar' : 'Ativar IA'}
        </button>
      </div>

      {/* Seletor de Capítulo recolhível */}
      <div className="student-chapter-bar">
        <button
          type="button"
          className="student-chapter-trigger"
          onClick={() => setChapterPickerOpen((prev) => !prev)}
          disabled={chaptersLoading || chapters.length === 0}
        >
          <div className="student-chapter-trigger-info">
            <span className="student-chapter-trigger-label">
              <ListOrdered size={14} /> Capítulo selecionado ({chapters.length})
            </span>
            <strong className="truncate">
              {chaptersLoading
                ? 'Carregando capítulos...'
                : selectedChapter
                  ? `${selectedChapter.title} (pp. ${selectedChapter.startPage}–${selectedChapter.endPage})`
                  : 'Selecione um capítulo'}
            </strong>
          </div>
          {chapterPickerOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {chapterPickerOpen && (
          <div className="student-chapter-dropdown">
            {chapters.length > 6 && (
              <div className="student-search">
                <Search size={14} />
                <input
                  className="input student-search-input"
                  placeholder="Filtrar capítulos..."
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                />
              </div>
            )}
            {usedFallback && (
              <p className="student-chapters-note">
                Este PDF não possui sumário interno. Dividimos em blocos de 10 páginas.
              </p>
            )}
            <div className="student-chapter-list">
              {filteredChapters.map((chapter) => {
                const stats = chapterStats.get(chapter.id);
                const isSelected = chapter.id === selectedId;
                return (
                  <button
                    key={chapter.id}
                    type="button"
                    className={`student-chapter-item ${isSelected ? 'active' : ''}`}
                    style={{ paddingLeft: `${12 + Math.min(chapter.level, 3) * 12}px` }}
                    onClick={() => {
                      setSelectedId(chapter.id);
                      setChapterPickerOpen(false);
                      jumpToPdfPage(chapter.startPage);
                    }}
                  >
                    <span className="student-chapter-title">{chapter.title}</span>
                    <span className="student-chapter-meta">
                      pp. {chapter.startPage}–{chapter.endPage}
                    </span>
                    {stats && (
                      <span className={`student-chapter-score ${scoreClass(stats.accuracy)}`}>
                        {formatPercent(stats.accuracy)}
                      </span>
                    )}
                  </button>
                );
              })}
              {filteredChapters.length === 0 && (
                <p className="student-sidebar-error">Nenhum capítulo encontrado.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Corpo Principal do Painel */}
      <div className="student-main">
        {chaptersLoading && (
          <div className="student-stage-centered">
            <Loader2 size={26} className="spin" />
            <p>Montando os capítulos a partir do PDF...</p>
          </div>
        )}

        {chaptersError && !chaptersLoading && (
          <div className="student-stage-centered">
            <AlertCircle size={28} />
            <p>{chaptersError}</p>
          </div>
        )}

        {!chaptersLoading && selectedChapter && phase === 'overview' && (
          <div className="student-stage">
            <div className="student-hero">
              <div className="student-hero-top">
                <span className="student-eyebrow">
                  Páginas {selectedChapter.startPage} a {selectedChapter.endPage} (
                  {selectedChapter.endPage - selectedChapter.startPage + 1}{' '}
                  {selectedChapter.endPage - selectedChapter.startPage + 1 === 1
                    ? 'página'
                    : 'páginas'}
                  )
                </span>
                <button
                  type="button"
                  className="student-jump-btn"
                  onClick={() => jumpToPdfPage(selectedChapter.startPage)}
                  title="Posicionar o PDF ao lado no início deste capítulo"
                >
                  <BookOpen size={13} /> Ir para pág. {selectedChapter.startPage} no PDF
                </button>
              </div>
              <h3>{selectedChapter.title}</h3>
            </div>

            <div className="student-stat-grid">
              <div className="student-stat">
                <span className="student-stat-label">Tentativas</span>
                <strong>{selectedStats?.attempts ?? 0}</strong>
              </div>
              <div className="student-stat">
                <span className="student-stat-label">Última</span>
                <strong className={selectedStats ? scoreClass(selectedStats.lastAccuracy) : ''}>
                  {selectedStats ? formatPercent(selectedStats.lastAccuracy) : '—'}
                </strong>
              </div>
              <div className="student-stat">
                <span className="student-stat-label">Melhor</span>
                <strong className={selectedStats ? scoreClass(selectedStats.bestAccuracy) : ''}>
                  {selectedStats ? formatPercent(selectedStats.bestAccuracy) : '—'}
                </strong>
              </div>
              <div className="student-stat">
                <span className="student-stat-label">Acertos</span>
                <strong>
                  {selectedStats ? `${selectedStats.correct}/${selectedStats.total}` : '—'}
                </strong>
              </div>
            </div>

            {/* Caso já exista um quiz salvo, informa claramente se ele foi feito com IA ou Sem IA */}
            {cachedQuiz && (
              <div
                className={`student-cached-origin ${cachedQuiz.generator === 'ai' ? 'ai' : 'local'}`}
              >
                {cachedQuiz.generator === 'ai' ? (
                  <>
                    <Sparkles size={15} />
                    <span>
                      Quiz salvo gerado <strong>com Inteligência Artificial</strong> ({cachedQuiz.questions.length} perguntas).
                    </span>
                  </>
                ) : (
                  <>
                    <WifiOff size={15} />
                    <span>
                      Quiz salvo gerado no <strong>Modo Offline (Sem IA)</strong> ({cachedQuiz.questions.length} perguntas).
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Alerta explícito caso a chamada à IA tenha falhado */}
            {aiFailedError && (
              <div className="student-ai-error-box">
                <div className="student-ai-error-head">
                  <AlertCircle size={17} />
                  <strong>Não foi possível gerar o quiz com a IA</strong>
                </div>
                <p>{aiFailedError}</p>
                <div className="student-ai-error-actions">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => void startQuiz({ forceRegenerate: true, forceMode: 'ai' })}
                  >
                    <RefreshCw size={13} /> Tentar novamente com IA
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowAiConfig(true)}
                  >
                    <Settings2 size={13} /> Revisar configuração da IA
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => void startQuiz({ forceRegenerate: true, forceMode: 'local' })}
                  >
                    <WifiOff size={13} /> Gerar no Modo Offline (Sem IA)
                  </button>
                </div>
              </div>
            )}

            {quizError && (
              <div className="student-alert">
                <AlertCircle size={16} />
                <span>{quizError}</span>
              </div>
            )}

            <div className="student-actions-stack">
              <button
                type="button"
                className="btn btn-primary student-primary-btn"
                onClick={() => void startQuiz()}
              >
                {aiEnabled && aiVerified ? <Sparkles size={16} /> : <Play size={16} />}
                {cachedQuiz &&
                cachedQuiz.generator === (aiEnabled && aiVerified ? 'ai' : 'local')
                  ? aiEnabled && aiVerified
                    ? 'Começar Quiz (Gerado com IA)'
                    : 'Começar Quiz (Modo Offline Sem IA)'
                  : aiEnabled && aiVerified
                    ? 'Gerar Quiz deste Capítulo com IA'
                    : 'Gerar Quiz no Modo Offline (Sem IA)'}
              </button>

              <div className="student-secondary-actions">
                {cachedQuiz && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => void startQuiz({ forceRegenerate: true })}
                    title="Criar novas perguntas para este capítulo"
                  >
                    <RefreshCw size={14} />
                    Novas perguntas ({aiEnabled && aiVerified ? 'Com IA' : 'Sem IA'})
                  </button>
                )}

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setChapterPickerOpen(true)}
                >
                  <ListOrdered size={14} />
                  Trocar capítulo
                </button>
              </div>
            </div>

            {/* Resumo dos erros da última tentativa para estudo direcionado */}
            {lastAttemptMistakes.length > 0 && (
              <div className="student-mistakes-card">
                <div className="student-mistakes-head">
                  <strong>
                    ⚠️ Pontos para reforçar ({lastAttemptMistakes.length}{' '}
                    {lastAttemptMistakes.length === 1 ? 'erro' : 'erros'} na última tentativa)
                  </strong>
                  <span>Clique na página para ler o trecho no PDF ao lado</span>
                </div>
                <div className="student-mistakes-list">
                  {lastAttemptMistakes.map(({ question, selectedOption, correctOption }) => (
                    <div key={question.id} className="student-mistake-item">
                      <p className="student-mistake-q">{question.prompt}</p>
                      <p className="student-mistake-ans">
                        <span className="wrong">Você marcou: {selectedOption}</span>
                        <span className="right">Correta: {correctOption}</span>
                      </p>
                      <button
                        type="button"
                        className="student-page-link"
                        onClick={() => jumpToPdfPage(question.sourcePage)}
                      >
                        <BookOpen size={12} /> Ler pág. {question.sourcePage} no PDF ao lado
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {phase === 'preparing' && (
          <div className="student-stage-centered">
            <Loader2 size={28} className="spin" />
            <p>{prepareLabel}</p>
            <span className="student-preparing-hint">
              Você pode continuar lendo o PDF ao lado enquanto preparamos as perguntas.
            </span>
          </div>
        )}

        {phase === 'quiz' && quiz && currentQuestion && (
          <div className="student-quiz">
            {/* Aviso claro se o quiz atual é Com IA ou Sem IA */}
            <div className={`student-quiz-origin-bar ${quiz.generator === 'ai' ? 'ai' : 'local'}`}>
              {quiz.generator === 'ai' ? (
                <>
                  <Sparkles size={14} />
                  <span>
                    <strong>Perguntas geradas com IA</strong> · Análise de contexto e compreensão
                  </span>
                </>
              ) : (
                <>
                  <WifiOff size={14} />
                  <span>
                    <strong>Perguntas geradas no Modo Offline (Sem IA)</strong> · Extraídas localmente
                  </span>
                </>
              )}
            </div>

            <div className="student-quiz-top">
              <span className="student-quiz-counter">
                Pergunta {questionIndex + 1} de {quiz.questions.length}
              </span>
              <div className="student-progress">
                <div style={{ width: `${progress}%` }} />
              </div>
              <span className="student-quiz-score">
                {correctCount} {correctCount === 1 ? 'acerto' : 'acertos'}
              </span>
            </div>

            <div className="student-question-meta-row">
              <span className="student-question-kind">
                {currentQuestion.kind === 'ai'
                  ? 'Interpretação e Contexto (IA)'
                  : currentQuestion.kind === 'cloze'
                    ? 'Complete o trecho (Offline)'
                    : currentQuestion.kind === 'definition'
                      ? 'Conceito do capítulo (Offline)'
                      : currentQuestion.kind === 'comprehension'
                        ? 'Compreensão do capítulo (Offline)'
                        : currentQuestion.kind === 'cause-effect'
                          ? 'Causa e efeito (Offline)'
                          : 'Contexto do capítulo (Offline)'}
              </span>
              <button
                type="button"
                className="student-page-chip"
                onClick={() => jumpToPdfPage(currentQuestion.sourcePage)}
                title="Mostrar esta página no PDF ao lado"
              >
                <BookOpen size={12} /> Ver pág. {currentQuestion.sourcePage} ao lado
              </button>
            </div>

            <h3 className="student-question">{currentQuestion.prompt}</h3>

            <div className="student-options" role="radiogroup" aria-label="Alternativas">
              {currentQuestion.options.map((option, index) => {
                const isCorrect = index === currentQuestion.correctIndex;
                const isSelected = index === selectedIndex;
                const revealed = selectedIndex !== null;
                const state = !revealed
                  ? ''
                  : isCorrect
                    ? 'correct'
                    : isSelected
                      ? 'wrong'
                      : 'muted';
                return (
                  <button
                    key={`${currentQuestion.id}-${index}`}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    className={`student-option ${state}`}
                    onClick={() => selectOption(index)}
                    disabled={revealed}
                  >
                    <span className="student-option-letter">{OPTION_LETTERS[index]}</span>
                    <span className="student-option-text">{option}</span>
                    {revealed && isCorrect && <Check size={16} className="student-option-icon" />}
                    {revealed && isSelected && !isCorrect && (
                      <X size={16} className="student-option-icon" />
                    )}
                  </button>
                );
              })}
            </div>

            {selectedIndex !== null && (
              <div
                className={`student-feedback ${
                  selectedIndex === currentQuestion.correctIndex ? 'ok' : 'bad'
                }`}
                aria-live="polite"
              >
                <strong>
                  {selectedIndex === currentQuestion.correctIndex
                    ? 'Resposta correta!'
                    : `Incorreto. A alternativa correta é “${currentQuestion.options[currentQuestion.correctIndex]}”.`}
                </strong>
                <p>{currentQuestion.explanation}</p>
                <button
                  type="button"
                  className="student-page-link"
                  onClick={() => jumpToPdfPage(currentQuestion.sourcePage)}
                >
                  <BookOpen size={13} /> Conferir na página {currentQuestion.sourcePage} do PDF ao lado
                </button>
              </div>
            )}

            <div className="student-quiz-footer">
              <span className="student-kbd-hint">Teclas 1–4 respondem · Enter avança</span>
              <button
                type="button"
                className="btn btn-primary"
                disabled={selectedIndex === null}
                onClick={goNext}
              >
                {questionIndex + 1 === quiz.questions.length ? 'Finalizar e ver resultado' : 'Próxima pergunta'}
              </button>
            </div>
          </div>
        )}

        {phase === 'results' && quiz && selectedChapter && (
          <div className="student-results">
            <div className={`student-quiz-origin-bar ${quiz.generator === 'ai' ? 'ai' : 'local'}`}>
              {quiz.generator === 'ai' ? (
                <>
                  <Sparkles size={14} />
                  <span>Resultado do quiz gerado <strong>com Inteligência Artificial</strong></span>
                </>
              ) : (
                <>
                  <WifiOff size={14} />
                  <span>Resultado do quiz gerado no <strong>Modo Offline (Sem IA)</strong></span>
                </>
              )}
            </div>

            <div className="student-results-summary">
              <div
                className={`student-ring ${scoreClass(accuracy)}`}
                style={{
                  background: `conic-gradient(${
                    accuracy >= 0.7
                      ? 'var(--success)'
                      : accuracy >= 0.5
                        ? 'var(--warning)'
                        : 'var(--error)'
                  } ${Math.round(accuracy * 360)}deg, var(--bg-tertiary) 0deg)`,
                }}
              >
                <div className="student-ring-inner">
                  <strong>{formatPercent(accuracy)}</strong>
                  <span>
                    {correctCount}/{answers.length}
                  </span>
                </div>
              </div>

              <div className="student-results-text">
                <h3>{resultMessage(accuracy)}</h3>
                <p>
                  {selectedChapter.title} · pp. {selectedChapter.startPage}–
                  {selectedChapter.endPage}
                </p>
              </div>
            </div>

            <div className="student-review">
              {quiz.questions.map((question, index) => {
                const answer = answers[index];
                const correct = answer?.correct ?? false;
                return (
                  <div key={question.id} className="student-review-item">
                    <span className={`student-review-icon ${correct ? 'good' : 'low'}`}>
                      {correct ? <CheckCircle2 size={17} /> : <XCircle size={17} />}
                    </span>
                    <div className="student-review-body">
                      <p className="student-review-prompt">
                        {index + 1}. {question.prompt}
                      </p>
                      <p className="student-review-answers">
                        Sua resposta:{' '}
                        <strong>
                          {answer
                            ? (question.options[answer.selectedIndex] ?? '—')
                            : 'não respondida'}
                        </strong>
                        {!correct && (
                          <>
                            {' · '}Correta:{' '}
                            <strong>{question.options[question.correctIndex]}</strong>
                          </>
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => jumpToPdfPage(question.sourcePage)}
                      title={`Ir para a página ${question.sourcePage} no PDF ao lado`}
                    >
                      pág. {question.sourcePage}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="student-actions-stack">
              <div className="student-secondary-actions">
                <button type="button" className="btn btn-primary btn-sm" onClick={restartQuiz}>
                  <RotateCcw size={14} />
                  Refazer este quiz
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => void startQuiz({ forceRegenerate: true })}
                >
                  <RefreshCw size={14} />
                  Gerar novas perguntas
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => jumpToPdfPage(selectedChapter.startPage)}
                >
                  <BookOpen size={14} />
                  Reler capítulo ao lado
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <AiConfigModal
        isOpen={showAiConfig}
        onClose={() => setShowAiConfig(false)}
        onSaved={() => {
          void refreshAiSettings();
        }}
      />
    </aside>
  );
}

