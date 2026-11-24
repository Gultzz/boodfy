import { useMemo } from 'react';
import { Clock, Sparkles, WifiOff, X, Timer } from 'lucide-react';
import { useStudyStore } from '@/stores/useStudyStore';
import { useTranslation } from '@/stores/useI18nStore';
import {
  formatDuration,
  formatPercent,
  getAllAttemptsHistory,
} from '@/services/study-service';
import './QuizHistoryModal.css';

interface QuizHistoryModalProps {
  isOpen: boolean;
  filterBookId?: string;
  onClose: () => void;
}

function scoreTone(accuracy: number): string {
  if (accuracy >= 0.7) return 'good';
  if (accuracy >= 0.5) return 'mid';
  return 'low';
}

export function QuizHistoryModal({ isOpen, filterBookId, onClose }: QuizHistoryModalProps) {
  const { t, locale } = useTranslation();
  const data = useStudyStore((s) => s.data);

  const items = useMemo(
    () => getAllAttemptsHistory(data, filterBookId),
    [data, filterBookId],
  );

  if (!isOpen) return null;

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(locale, {
        dateStyle: 'short',
        timeStyle: 'short',
      });
    } catch {
      return '—';
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal quiz-history-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t('study.history')}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="quiz-history-header">
          <div className="quiz-history-title">
            <Clock size={18} />
            <h3>{t('study.history')}</h3>
            <span className="side-panel-count">{items.length}</span>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={onClose}
            title={t('common.close')}
          >
            <X size={18} />
          </button>
        </header>

        <div className="quiz-history-body">
          {items.length === 0 ? (
            <div className="quiz-history-empty">
              <Clock size={36} />
              <p>{t('study.noAttemptsHistory')}</p>
            </div>
          ) : (
            <div className="quiz-history-list">
              {items.map((item) => (
                <article key={item.attempt.id} className="quiz-history-row">
                  <div className="quiz-history-row-main">
                    <div className="quiz-history-row-top">
                      <strong className="truncate">{item.attempt.chapterTitle}</strong>
                      <span className={`quiz-history-mode ${item.generator}`}>
                        {item.generator === 'ai' ? (
                          <>
                            <Sparkles size={11} /> {t('study.modeAi')}
                          </>
                        ) : (
                          <>
                            <WifiOff size={11} /> {t('study.modeOffline')}
                          </>
                        )}
                      </span>
                    </div>
                    <span className="quiz-history-book truncate">{item.bookTitle}</span>
                    <div className="quiz-history-meta">
                      <span>{formatDate(item.attempt.finishedAt)}</span>
                      <span>·</span>
                      <span className="quiz-history-duration">
                        <Timer size={11} /> {formatDuration(item.durationSeconds)}
                      </span>
                      <span>·</span>
                      <span>
                        {item.attempt.correctCount}/{item.attempt.total}
                      </span>
                    </div>
                  </div>
                  <span className={`quiz-history-score ${scoreTone(item.accuracy)}`}>
                    {formatPercent(item.accuracy)}
                  </span>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
