import { useState, useEffect, useRef } from 'react';
import { Flame, Trophy, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import { storage } from '@/services/storage';
import { calculateReadingStreak } from '@/lib/streak-calculator';
import { useTranslation } from '@/stores/useI18nStore';
import type { StreakInfo } from '@/types';
import './ReadingStreakBadge.css';

export function ReadingStreakBadge() {
  const { t } = useTranslation();
  const [streak, setStreak] = useState<StreakInfo>({
    currentStreak: 0,
    longestStreak: 0,
    readToday: false,
    lastReadDate: null,
  });
  const [showPopover, setShowPopover] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    storage.getHistory().then((history) => {
      const info = calculateReadingStreak(history.entries);
      setStreak(info);
    });
  }, []);

  // Close popover when clicking outside
  useEffect(() => {
    if (!showPopover) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowPopover(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPopover]);

  const isActive = streak.currentStreak > 0;
  const dayUnit = (n: number) => (n === 1 ? t('streak.day') : t('streak.days'));

  return (
    <div ref={containerRef} className="reading-streak-container">
      <button
        type="button"
        className={`reading-streak-badge ${isActive ? 'active' : ''}`}
        onClick={() => setShowPopover((prev) => !prev)}
        title={t('streak.title')}
      >
        <Flame size={16} className="streak-flame" />
        <span>
          {streak.currentStreak} {dayUnit(streak.currentStreak)}
        </span>
      </button>

      {showPopover && (
        <div className="streak-popover">
          <div className="streak-popover-title">
            <Flame size={18} className="streak-flame" />
            <span>{t('streak.title')}</span>
          </div>

          <div className="streak-popover-stats">
            <div className="streak-stat-row">
              <span>{t('streak.current')}</span>
              <span className="streak-stat-value">
                {streak.currentStreak} {dayUnit(streak.currentStreak)}
              </span>
            </div>
            <div className="streak-stat-row">
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Trophy size={13} /> {t('streak.record')}
              </span>
              <span className="streak-stat-value">
                {streak.longestStreak} {dayUnit(streak.longestStreak)}
              </span>
            </div>
            {streak.lastReadDate && (
              <div className="streak-stat-row">
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={13} /> {t('streak.lastRead')}
                </span>
                <span className="streak-stat-value">{streak.lastReadDate}</span>
              </div>
            )}
          </div>

          <div className={`streak-status-msg ${streak.readToday ? 'done' : 'pending'}`}>
            {streak.readToday ? (
              <>
                <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
                <span>{t('streak.doneToday')}</span>
              </>
            ) : (
              <>
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{t('streak.pendingToday')}</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
