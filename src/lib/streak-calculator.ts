import type { HistoryEntry, StreakInfo } from '@/types';

function toLocalDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDays(d: Date, days: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

export function calculateReadingStreak(entries: HistoryEntry[]): StreakInfo {
  if (!entries || entries.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      readToday: false,
      lastReadDate: null,
    };
  }

  const dateSet = new Set<string>();

  for (const entry of entries) {
    if (entry.lastActivityAt) {
      try {
        dateSet.add(toLocalDateString(new Date(entry.lastActivityAt)));
      } catch {
        // ignore
      }
    }
    if (entry.openedAt) {
      try {
        dateSet.add(toLocalDateString(new Date(entry.openedAt)));
      } catch {
        // ignore
      }
    }
  }

  const sortedDates = Array.from(dateSet).sort();
  if (sortedDates.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      readToday: false,
      lastReadDate: null,
    };
  }

  const now = new Date();
  const todayStr = toLocalDateString(now);
  const yesterdayStr = toLocalDateString(addDays(now, -1));

  const readToday = dateSet.has(todayStr);

  // Calculate current streak
  let currentStreak = 0;
  let checkDate: Date | null = null;

  if (readToday) {
    currentStreak = 1;
    checkDate = addDays(now, -1);
  } else if (dateSet.has(yesterdayStr)) {
    currentStreak = 1;
    checkDate = addDays(now, -2);
  }

  while (checkDate && dateSet.has(toLocalDateString(checkDate))) {
    currentStreak++;
    checkDate = addDays(checkDate, -1);
  }

  // Calculate longest streak
  let longestStreak = 0;
  let currentRun = 0;
  let prevDate: Date | null = null;

  for (const dateStr of sortedDates) {
    const curDate = parseLocalDate(dateStr);
    if (!prevDate) {
      currentRun = 1;
    } else {
      const diffDays = Math.round((curDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        currentRun++;
      } else if (diffDays > 1) {
        currentRun = 1;
      }
    }
    prevDate = curDate;
    if (currentRun > longestStreak) {
      longestStreak = currentRun;
    }
  }

  const mostRecentDateStr = sortedDates[sortedDates.length - 1];
  let lastReadDateDisplay = mostRecentDateStr;
  if (mostRecentDateStr === todayStr) {
    lastReadDateDisplay = 'Hoje';
  } else if (mostRecentDateStr === yesterdayStr) {
    lastReadDateDisplay = 'Ontem';
  } else {
    try {
      const [y, m, d] = mostRecentDateStr.split('-');
      lastReadDateDisplay = `${d}/${m}/${y}`;
    } catch {
      // fallback
    }
  }

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    readToday,
    lastReadDate: lastReadDateDisplay,
  };
}

