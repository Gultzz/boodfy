import { create } from 'zustand';
import { DEFAULT_READER_SETTINGS, storage } from '@/services/storage';
import type {
  LineSpacing,
  ReaderTypographySettings,
  ReaderViewMode,
  ReadingTheme,
} from '@/types';

interface ReaderSettingsState {
  settings: ReaderTypographySettings;
  loaded: boolean;
  initialize: () => Promise<void>;
  updateReaderSettings: (partial: Partial<ReaderTypographySettings>) => Promise<void>;
  setFontSize: (size: number) => Promise<void>;
  setLineSpacing: (spacing: LineSpacing) => Promise<void>;
  setDefaultViewMode: (mode: ReaderViewMode) => Promise<void>;
  setReadingTheme: (readingTheme: ReadingTheme) => Promise<void>;
}

let persistChain: Promise<void> = Promise.resolve();

export const useReaderSettingsStore = create<ReaderSettingsState>((set, get) => {
  const persist = (nextReader: ReaderTypographySettings): Promise<void> => {
    persistChain = persistChain
      .catch(() => undefined)
      .then(async () => {
        const current = await storage.getSettings();
        await storage.saveSettings({ ...current, reader: nextReader });
      })
      .catch((err) => console.error('Erro ao salvar preferências do leitor:', err));
    return persistChain;
  };

  return {
    settings: DEFAULT_READER_SETTINGS,
    loaded: false,

    initialize: async () => {
      if (get().loaded) return;
      try {
        const appSettings = await storage.getSettings();
        set({
          settings: {
            ...DEFAULT_READER_SETTINGS,
            ...appSettings.reader,
            readingTheme: appSettings.reader?.readingTheme ?? 'original',
          },
          loaded: true,
        });
      } catch {
        set({ loaded: true });
      }
    },

    updateReaderSettings: async (partial) => {
      const next: ReaderTypographySettings = {
        ...get().settings,
        ...partial,
        fontSize: Math.min(28, Math.max(14, partial.fontSize ?? get().settings.fontSize)),
      };
      set({ settings: next });
      await persist(next);
    },

    setFontSize: async (size) => {
      await get().updateReaderSettings({ fontSize: size });
    },

    setLineSpacing: async (lineSpacing) => {
      await get().updateReaderSettings({ lineSpacing });
    },

    setDefaultViewMode: async (defaultViewMode) => {
      await get().updateReaderSettings({ defaultViewMode });
    },

    setReadingTheme: async (readingTheme) => {
      await get().updateReaderSettings({ readingTheme });
    },
  };
});
