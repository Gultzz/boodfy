import { useState, useEffect, useCallback } from 'react';
import { storage } from '@/services/storage';
import type { AppSettings } from '@/types';

export function useTheme() {
  const [theme, setThemeState] = useState<AppSettings['theme']>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');

  const applyTheme = useCallback((t: AppSettings['theme']) => {
    let resolved: 'light' | 'dark';
    if (t === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      resolved = t;
    }
    setResolvedTheme(resolved);
    document.documentElement.setAttribute('data-theme', resolved);
  }, []);

  useEffect(() => {
    storage.getSettings().then((settings) => {
      setThemeState(settings.theme);
      applyTheme(settings.theme);
    });
  }, [applyTheme]);

  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme, applyTheme]);

  const setTheme = useCallback(
    async (t: AppSettings['theme']) => {
      setThemeState(t);
      applyTheme(t);
      const settings = await storage.getSettings();
      await storage.saveSettings({ ...settings, theme: t });
    },
    [applyTheme],
  );

  return { theme, resolvedTheme, setTheme };
}
