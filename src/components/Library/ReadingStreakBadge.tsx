import { useState, useEffect, useRef } from 'react';
import { Flame, Trophy, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import { storage } from '@/services/storage';
import { calculateReadingStreak } from '@/lib/streak-calculator';
import type { StreakInfo } from '@/types';
import './ReadingStreakBadge.css';

export function ReadingStreakBadge() {
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

  return (
    <div ref={containerRef} className="reading-streak-container">
      <button
        type="button"
        className={`reading-streak-badge ${isActive ? 'active' : ''}`}
        onClick={() => setShowPopover((prev) => !prev)}
        title="Ofensiva de leitura diária"
      >
        <Flame size={16} className="streak-flame" />
        <span>{streak.currentStreak} {streak.currentStreak === 1 ? 'dia' : 'dias'}</span>
      </button>

      {showPopover && (
        <div className="streak-popover">
          <div className="streak-popover-title">
            <Flame size={18} className="streak-flame" />
            <span>Ofensiva de Leitura</span>
          </div>

          <div className="streak-popover-stats">
            <div className="streak-stat-row">
              <span>Sequência atual:</span>
              <span className="streak-stat-value">
                {streak.currentStreak} {streak.currentStreak === 1 ? 'dia' : 'dias'}
              </span>
            </div>
            <div className="streak-stat-row">
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Trophy size={13} /> Recorde:
              </span>
              <span className="streak-stat-value">
                {streak.longestStreak} {streak.longestStreak === 1 ? 'dia' : 'dias'}
              </span>
            </div>
            {streak.lastReadDate && (
              <div className="streak-stat-row">
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={13} /> Última leitura:
                </span>
                <span className="streak-stat-value">{streak.lastReadDate}</span>
              </div>
            )}
          </div>

          <div className={`streak-status-msg ${streak.readToday ? 'done' : 'pending'}`}>
            {streak.readToday ? (
              <>
                <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
                <span>Meta de hoje cumprida! Sua ofensiva continua ativa.</span>
              </>
            ) : (
              <>
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>Leia hoje para manter sua ofensiva ativa!</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

