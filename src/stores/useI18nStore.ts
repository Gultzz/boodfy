import { useCallback } from 'react';
import { create } from 'zustand';
import { storage } from '@/services/storage';
import {
  getLanguageMeta,
  translate,
  type TranslationKey,
} from '@/i18n/translations';
import type { AppLanguage } from '@/types';

interface I18nState {
  language: AppLanguage;
  initialized: boolean;
  initializeLanguage: () => Promise<void>;
  setLanguage: (language: AppLanguage) => Promise<void>;
}

export const useI18nStore = create<I18nState>((set) => ({
  language: 'pt',
  initialized: false,

  initializeLanguage: async () => {
    try {
      const settings = await storage.getSettings();
      const lang = settings.language || 'pt';
      if (typeof document !== 'undefined') {
        document.documentElement.lang = getLanguageMeta(lang).locale;
      }
      set({ language: lang, initialized: true });
    } catch {
      set({ initialized: true });
    }
  },

  setLanguage: async (language: AppLanguage) => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = getLanguageMeta(language).locale;
    }
    set({ language });
    try {
      const settings = await storage.getSettings();
      await storage.saveSettings({ ...settings, language });
    } catch (err) {
      console.error('Erro ao salvar idioma:', err);
    }
  },
}));

export function useTranslation() {
  const language = useI18nStore((s) => s.language);
  const setLanguage = useI18nStore((s) => s.setLanguage);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) =>
      translate(language, key, params),
    [language],
  );

  const locale = getLanguageMeta(language).locale;

  return { language, locale, t, setLanguage };
}
