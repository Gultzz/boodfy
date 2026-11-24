import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Coffee,
  Folder,
  Globe,
  HardDrive,
  Sun,
  Moon,
  Monitor,
  Sparkles,
  Type,
  WifiOff,
  Settings2,
} from 'lucide-react';
import { storage } from '@/services/storage';
import { useThemeStore } from '@/stores/useThemeStore';
import { useAppStore } from '@/stores/useAppStore';
import { useReaderSettingsStore } from '@/stores/useReaderSettingsStore';
import { useTranslation } from '@/stores/useI18nStore';
import { SUPPORTED_LANGUAGES } from '@/i18n/translations';
import { AiConfigModal } from '@/components/Study/AiConfigModal';
import type { AppSettings, FitMode, LineSpacing } from '@/types';
import './SettingsPage.css';

interface SettingsPageProps {
  onBack?: () => void;
}

const LINE_HEIGHT_PREVIEW: Record<LineSpacing, number> = {
  compact: 1.48,
  comfortable: 1.78,
  wide: 2.12,
};

export function SettingsPage({ onBack }: SettingsPageProps) {
  const { t, language, setLanguage } = useTranslation();
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const readerSettings = useReaderSettingsStore((s) => s.settings);
  const setFontSize = useReaderSettingsStore((s) => s.setFontSize);
  const setLineSpacing = useReaderSettingsStore((s) => s.setLineSpacing);
  const setDefaultViewMode = useReaderSettingsStore((s) => s.setDefaultViewMode);
  const setReadingTheme = useReaderSettingsStore((s) => s.setReadingTheme);
  const backToLibrary = useAppStore((s) => s.backToLibrary);
  const handleBack = onBack || backToLibrary;

  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [dataPath, setDataPath] = useState<string>('');
  const [version, setVersion] = useState<string>('');
  const [showAiConfig, setShowAiConfig] = useState(false);

  useEffect(() => {
    storage.getSettings().then(setSettings);
    window.electronAPI.getDataPath().then(setDataPath);
    window.electronAPI.getVersion().then(setVersion);
  }, []);

  const handleSelectFolder = async () => {
    if (!settings) return;
    const folder = await window.electronAPI.openFolderDialog();
    if (folder) {
      const updated = { ...settings, watchFolder: folder };
      setSettings(updated);
      await storage.saveSettings(updated);
    }
  };

  const handleClearFolder = async () => {
    if (!settings) return;
    const updated = { ...settings, watchFolder: null };
    setSettings(updated);
    await storage.saveSettings(updated);
  };

  const handleFitModeChange = async (mode: FitMode) => {
    if (!settings) return;
    const updated = { ...settings, defaultFitMode: mode };
    setSettings(updated);
    await storage.saveSettings(updated);
  };

  const handleOpenDataFolder = () => {
    if (dataPath) {
      window.electronAPI.openPath(dataPath);
    }
  };

  const spacingOptions: { key: LineSpacing; label: string }[] = [
    { key: 'compact', label: t('reader.spacing.compact') },
    { key: 'comfortable', label: t('reader.spacing.comfortable') },
    { key: 'wide', label: t('reader.spacing.wide') },
  ];

  return (
    <div className="settings-page">
      <header className="settings-header">
        <div className="settings-header-left">
          <button className="btn btn-ghost btn-icon" onClick={handleBack} title={t('common.back')}>
            <ArrowLeft size={18} />
          </button>
          <h2>{t('settings.title')}</h2>
        </div>
      </header>

      <div className="settings-content">
        <div className="settings-container">
          {/* 6 Idiomas Nativos com Troca Instantânea */}
          <section className="settings-section card">
            <h3 className="settings-heading-icon">
              <Globe size={17} /> {t('settings.language')}
            </h3>
            <p className="settings-desc">{t('settings.languageDesc')}</p>
            <div className="language-grid">
              {SUPPORTED_LANGUAGES.map((lang) => {
                const active = language === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    className={`lang-btn ${active ? 'active' : ''}`}
                    onClick={() => void setLanguage(lang.code)}
                  >
                    <span>{lang.nativeName}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Aparência do Aplicativo (Menus, Estante e Janelas) */}
          <section className="settings-section card">
            <h3>{t('reader.theme')}</h3>
            <p className="settings-desc">{t('settings.appearanceDesc')}</p>
            <div className="theme-options">
              <button
                type="button"
                className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => void setTheme('dark')}
              >
                <Moon size={20} />
                <span>{t('settings.theme.dark')}</span>
              </button>
              <button
                type="button"
                className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
                onClick={() => void setTheme('light')}
              >
                <Sun size={20} />
                <span>{t('settings.theme.light')}</span>
              </button>
              <button
                type="button"
                className={`theme-btn ${theme === 'sepia' ? 'active' : ''}`}
                onClick={() => void setTheme('sepia')}
              >
                <Coffee size={20} />
                <span>{t('settings.theme.sepia')}</span>
              </button>
              <button
                type="button"
                className={`theme-btn ${theme === 'system' ? 'active' : ''}`}
                onClick={() => void setTheme('system')}
              >
                <Monitor size={20} />
                <span>{t('settings.theme.system')}</span>
              </button>
            </div>
          </section>

          {/* Tema da Leitura (PDF e Texto — independente do aplicativo) */}
          <section className="settings-section card">
            <h3>{t('reader.readingTheme')}</h3>
            <p className="settings-desc">{t('reader.readingThemeDesc')}</p>
            <div className="theme-options reading-theme-options">
              <button
                type="button"
                className={`theme-btn ${readerSettings.readingTheme === 'original' ? 'active' : ''}`}
                onClick={() => void setReadingTheme('original')}
              >
                <Sun size={20} />
                <span>{t('reader.readingTheme.original')}</span>
              </button>
              <button
                type="button"
                className={`theme-btn ${readerSettings.readingTheme === 'sepia' ? 'active' : ''}`}
                onClick={() => void setReadingTheme('sepia')}
              >
                <Coffee size={20} />
                <span>{t('reader.readingTheme.sepia')}</span>
              </button>
              <button
                type="button"
                className={`theme-btn ${readerSettings.readingTheme === 'dark' ? 'active' : ''}`}
                onClick={() => void setReadingTheme('dark')}
              >
                <Moon size={20} />
                <span>{t('reader.readingTheme.dark')}</span>
              </button>
            </div>
          </section>

          {/* Tipografia Padrão de Leitura com Prévia ao Vivo */}
          <section className="settings-section card">
            <h3 className="settings-heading-icon">
              <Type size={17} /> {t('settings.typography')}
            </h3>
            <p className="settings-desc">{t('settings.typographyDesc')}</p>

            <div className="typography-controls-row">
              <div className="typography-control">
                <span className="typography-control-label">
                  {t('reader.fontSize')}: <strong>{readerSettings.fontSize}px</strong>
                </span>
                <div className="typography-stepper">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => void setFontSize(readerSettings.fontSize - 1)}
                    disabled={readerSettings.fontSize <= 14}
                  >
                    A-
                  </button>
                  <input
                    type="range"
                    min={14}
                    max={28}
                    value={readerSettings.fontSize}
                    onChange={(e) => void setFontSize(Number(e.target.value))}
                    className="typography-range"
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => void setFontSize(readerSettings.fontSize + 1)}
                    disabled={readerSettings.fontSize >= 28}
                  >
                    A+
                  </button>
                </div>
              </div>

              <div className="typography-control">
                <span className="typography-control-label">{t('reader.lineSpacing')}</span>
                <div className="typography-spacing-pills">
                  {spacingOptions.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      className={`btn btn-sm ${
                        readerSettings.lineSpacing === opt.key ? 'btn-primary' : 'btn-secondary'
                      }`}
                      onClick={() => void setLineSpacing(opt.key)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div
              className="typography-live-preview"
              data-reading-theme={readerSettings.readingTheme}
              style={{
                fontSize: `${readerSettings.fontSize}px`,
                lineHeight: LINE_HEIGHT_PREVIEW[readerSettings.lineSpacing],
              }}
            >
              {t('settings.typographyPreview')}
            </div>
          </section>

          {/* Modo Estudante e IA */}
          <section className="settings-section card">
            <h3>{t('settings.aiSection')}</h3>
            <p className="settings-desc">{t('settings.aiDesc')}</p>
            <div className="folder-setting">
              <div className="folder-path truncate">
                {settings?.ai.enabled ? (
                  <>
                    <Sparkles size={18} />
                    <span>
                      <strong>{t('study.aiActive')}:</strong> {settings.ai.model} (
                      {settings.ai.baseUrl})
                    </span>
                  </>
                ) : (
                  <>
                    <WifiOff size={18} />
                    <span>
                      <strong>{t('study.offlineActive')}</strong>
                    </span>
                  </>
                )}
              </div>
              <div className="folder-actions">
                <button className="btn btn-primary" onClick={() => setShowAiConfig(true)}>
                  <Settings2 size={16} />
                  {t('study.configureAi')}
                </button>
              </div>
            </div>
          </section>

          {/* Comportamento do Leitor */}
          <section className="settings-section card">
            <h3>{t('settings.readerDefault')}</h3>
            <p className="settings-desc">{t('settings.readerDefaultDesc')}</p>
            <div className="fit-options">
              <button
                type="button"
                className={`btn btn-secondary ${readerSettings.defaultViewMode === 'pdf' ? 'btn-primary' : ''}`}
                onClick={() => void setDefaultViewMode('pdf')}
              >
                {t('reader.modePdf')}
              </button>
              <button
                type="button"
                className={`btn btn-secondary ${readerSettings.defaultViewMode === 'fluid' ? 'btn-primary' : ''}`}
                onClick={() => void setDefaultViewMode('fluid')}
              >
                {t('reader.modeFluid')}
              </button>
            </div>
            <div className="fit-options">
              <button
                type="button"
                className={`btn btn-secondary ${settings?.defaultFitMode === 'height' ? 'btn-primary' : ''}`}
                onClick={() => void handleFitModeChange('height')}
              >
                {t('reader.fitHeight')}
              </button>
              <button
                type="button"
                className={`btn btn-secondary ${settings?.defaultFitMode === 'width' ? 'btn-primary' : ''}`}
                onClick={() => void handleFitModeChange('width')}
              >
                {t('reader.fitWidth')}
              </button>
            </div>
          </section>

          {/* Pasta Monitorada */}
          <section className="settings-section card">
            <h3>{t('settings.watchFolder')}</h3>
            <div className="folder-setting">
              <div className="folder-path truncate">
                <Folder size={18} />
                <span>{settings?.watchFolder || 'Nenhuma pasta configurada'}</span>
              </div>
              <div className="folder-actions">
                <button className="btn btn-secondary" onClick={() => void handleSelectFolder()}>
                  {t('library.addFolder')}
                </button>
                {settings?.watchFolder && (
                  <button className="btn btn-ghost" onClick={() => void handleClearFolder()}>
                    {t('common.remove')}
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Armazenamento Local e Privacidade */}
          <section className="settings-section card">
            <h3>{t('settings.localStorage')}</h3>
            <p className="settings-desc">{t('settings.localStorageDesc')}</p>
            <div className="data-path-box">
              <HardDrive size={18} />
              <span className="truncate">{dataPath}</span>
              <button className="btn btn-secondary btn-sm" onClick={handleOpenDataFolder}>
                Abrir Pasta
              </button>
            </div>
          </section>

          {/* Sobre */}
          <section className="settings-section card">
            <h3>{t('settings.about')}</h3>
            <div className="about-info">
              <p>
                <strong>Versão:</strong> {version || '1.0.7'}
              </p>
            </div>
          </section>
        </div>
      </div>

      <AiConfigModal
        isOpen={showAiConfig}
        onClose={() => setShowAiConfig(false)}
        onSaved={(updated) => setSettings(updated)}
      />
    </div>
  );
}
