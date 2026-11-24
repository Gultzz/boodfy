import { useState, useEffect } from 'react';
import { ArrowLeft, Clock, BookOpen, Trash2, Timer } from 'lucide-react';
import { storage } from '@/services/storage';
import { useAppStore } from '@/stores/useAppStore';
import { useTranslation } from '@/stores/useI18nStore';
import { formatDuration } from '@/services/study-service';
import type { HistoryEntry } from '@/types';
import './HistoryPage.css';

interface HistoryPageProps {
  onBack?: () => void;
  onOpenBookById?: (bookId: string) => void;
}

export function HistoryPage({ onBack, onOpenBookById }: HistoryPageProps) {
  const { t, locale } = useTranslation();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const appBack = useAppStore((s) => s.backToLibrary);
  const appOpenBookById = useAppStore((s) => s.openBookById);

  const handleBack = onBack || appBack;
  const handleOpenBookById = onOpenBookById || appOpenBookById;

  useEffect(() => {
    storage.getHistory().then((data) => {
      setHistory(data.entries);
      setLoading(false);
    });
  }, []);

  const handleClearHistory = async () => {
    await storage.saveHistory({ entries: [] });
    setHistory([]);
  };

  const formatDate = (isoStr: string) => {
    try {
      return new Date(isoStr).toLocaleString(locale, {
        dateStyle: 'short',
        timeStyle: 'short',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="history-page">
      <header className="history-header">
        <div className="history-header-left">
          <button className="btn btn-ghost btn-icon" onClick={handleBack} title={t('common.back')}>
            <ArrowLeft size={18} />
          </button>
          <h2>{t('nav.history')}</h2>
        </div>
        {history.length > 0 && (
          <button className="btn btn-secondary btn-sm" onClick={() => void handleClearHistory()}>
            <Trash2 size={14} />
            {t('common.delete')}
          </button>
        )}
      </header>

      <div className="history-content">
        {loading ? (
          <div className="history-loading">
            <div className="spinner" />
          </div>
        ) : history.length === 0 ? (
          <div className="empty-state">
            <Clock size={48} className="empty-state-icon" />
            <h3 className="empty-state-title">Nenhum histórico registrado</h3>
            <p className="empty-state-text">
              As sessões e aberturas de livros aparecerão aqui conforme você ler.
            </p>
          </div>
        ) : (
          <div className="history-list">
            {history.map((entry, idx) => (
              <div key={idx} className="history-item card">
                <div className="history-item-left">
                  <div className="history-icon">
                    <BookOpen size={20} />
                  </div>
                  <div className="history-details">
                    <h4 className="history-title truncate">{entry.bookTitle}</h4>
                    <span className="history-date">Aberto em: {formatDate(entry.openedAt)}</span>
                    {entry.lastActivityAt && entry.lastActivityAt !== entry.openedAt && (
                      <span className="history-date">
                        Última leitura: {formatDate(entry.lastActivityAt)}
                      </span>
                    )}
                    {typeof entry.durationSeconds === 'number' && entry.durationSeconds > 0 && (
                      <span
                        className="history-date"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <Timer size={12} /> {formatDuration(entry.durationSeconds)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="history-item-right">
                  <div className="history-pages-info">
                    <span>
                      {t('common.page')} {entry.pageOnOpen}
                    </span>
                    {entry.pageOnClose && (
                      <span>
                        → {t('common.page')} {entry.pageOnClose}
                      </span>
                    )}
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleOpenBookById(entry.bookId)}
                  >
                    {t('library.resumeReading')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
