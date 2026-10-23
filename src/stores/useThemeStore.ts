import { create } from 'zustand';
import { storage } from '@/services/storage';
import type { AppSettings } from '@/types';

interface ThemeState {
  theme: AppSettings['theme'];
  resolvedTheme: 'light' | 'dark';
  initializeTheme: () => Promise<void>;
  setTheme: (theme: AppSettings['theme']) => Promise<void>;
}

function resolveThemeMode(t: AppSettings['theme']): 'light' | 'dark' {
  if (t === 'system') {
    return typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return t;
}

function applyToDocument(resolved: 'light' | 'dark') {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', resolved);
  }
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'system',
  resolvedTheme: 'dark',

  initializeTheme: async () => {
    try {
      const settings = await storage.getSettings();
      const resolved = resolveThemeMode(settings.theme);
      applyToDocument(resolved);
      set({ theme: settings.theme, resolvedTheme: resolved });

      if (typeof window !== 'undefined') {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        mq.addEventListener('change', () => {
          if (get().theme === 'system') {
            const nextResolved = mq.matches ? 'dark' : 'light';
            applyToDocument(nextResolved);
            set({ resolvedTheme: nextResolved });
          }
        });
      }
    } catch (err) {
      console.error('Erro ao inicializar tema:', err);
    }
  },

  setTheme: async (newTheme: AppSettings['theme']) => {
    const resolved = resolveThemeMode(newTheme);
    applyToDocument(resolved);
    set({ theme: newTheme, resolvedTheme: resolved });

    try {
      const settings = await storage.getSettings();
      await storage.saveSettings({ ...settings, theme: newTheme });
    } catch (err) {
      console.error('Erro ao salvar tema:', err);
    }
  },
}));

