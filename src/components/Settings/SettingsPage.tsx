import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Folder,
  HardDrive,
  Sun,
  Moon,
  Monitor,
  Sparkles,
  WifiOff,
  Settings2,
} from 'lucide-react';
import { storage } from '@/services/storage';
import { useThemeStore } from '@/stores/useThemeStore';
import { useAppStore } from '@/stores/useAppStore';
import { AiConfigModal } from '@/components/Study/AiConfigModal';
import type { AppSettings, FitMode } from '@/types';
import './SettingsPage.css';

interface SettingsPageProps {
  onBack?: () => void;
}

export function SettingsPage({ onBack }: SettingsPageProps) {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const backToLibrary = useAppStore((s) => s.backToLibrary);
  const handleBack = onBack || backToLibrary;

  const [settings, setSettings] = useState<AppSettings>({
    theme: 'system',
    defaultFitMode: 'height',
    watchFolder: null,
    ai: {
      enabled: false,
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
      model: 'gemini-2.0-flash',
      provider: 'gemini',
      verified: false,
    },
  });
  const [dataPath, setDataPath] = useState<string>('');
  const [version, setVersion] = useState<string>('');
  const [showAiConfig, setShowAiConfig] = useState(false);

  useEffect(() => {
    storage.getSettings().then(setSettings);
    window.electronAPI.getDataPath().then(setDataPath);
    window.electronAPI.getVersion().then(setVersion);
  }, []);

  const handleSelectFolder = async () => {
    const folder = await window.electronAPI.openFolderDialog();
    if (folder) {
      const updated = { ...settings, watchFolder: folder };
      setSettings(updated);
      await storage.saveSettings(updated);
    }
  };

  const handleClearFolder = async () => {
    const updated = { ...settings, watchFolder: null };
    setSettings(updated);
    await storage.saveSettings(updated);
  };

  const handleFitModeChange = async (mode: FitMode) => {
    const updated = { ...settings, defaultFitMode: mode };
    setSettings(updated);
    await storage.saveSettings(updated);
  };

  const handleOpenDataFolder = () => {
    if (dataPath) {
      window.electronAPI.openPath(dataPath);
    }
  };

  return (
    <div className="settings-page">
      <header className="settings-header">
        <div className="settings-header-left">
          <button className="btn btn-ghost btn-icon" onClick={handleBack} title="Voltar">
            <ArrowLeft size={18} />
          </button>
          <h2>Configurações</h2>
        </div>
      </header>

      <div className="settings-content">
        <div className="settings-container">
          {/* Aparência */}
          <section className="settings-section card">
            <h3>Aparência e Tema</h3>
            <p className="settings-desc">Escolha a preferência visual do aplicativo.</p>
            <div className="theme-options">
              <button
                className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
                onClick={() => setTheme('light')}
              >
                <Sun size={20} />
                <span>Claro</span>
              </button>
              <button
                className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => setTheme('dark')}
              >
                <Moon size={20} />
                <span>Escuro</span>
              </button>
              <button
                className={`theme-btn ${theme === 'system' ? 'active' : ''}`}
                onClick={() => setTheme('system')}
              >
                <Monitor size={20} />
                <span>Sistema</span>
              </button>
            </div>
          </section>

          {/* Modo Estudante e IA */}
          <section className="settings-section card">
            <h3>Modo Estudante e Inteligência Artificial</h3>
            <p className="settings-desc">
              Configure se os quizzes dos capítulos serão gerados com Inteligência Artificial
              (perguntas de contexto e compreensão) ou no Modo Offline (Sem IA).
            </p>
            <div className="folder-setting">
              <div className="folder-path truncate">
                {settings.ai.enabled ? (
                  <>
                    <Sparkles size={18} />
                    <span>
                      <strong>Modo Com IA Ativo:</strong> {settings.ai.model} (
                      {settings.ai.baseUrl})
                    </span>
                  </>
                ) : (
                  <>
                    <WifiOff size={18} />
                    <span>
                      <strong>Modo Offline (Sem IA) Ativo:</strong> Perguntas geradas localmente
                    </span>
                  </>
                )}
              </div>
              <div className="folder-actions">
                <button className="btn btn-primary" onClick={() => setShowAiConfig(true)}>
                  <Settings2 size={16} />
                  Configurar IA / Modo de Quiz
                </button>
              </div>
            </div>
          </section>

          {/* Comportamento do Leitor */}
          <section className="settings-section card">
            <h3>Padrão de Exibição do Leitor</h3>
            <p className="settings-desc">
              Define como o documento será ajustado inicialmente ao ser aberto.
            </p>
            <div className="fit-options">
              <button
                className={`btn btn-secondary ${settings.defaultFitMode === 'height' ? 'btn-primary' : ''}`}
                onClick={() => handleFitModeChange('height')}
              >
                Ajustar à Altura (Recomendado)
              </button>
              <button
                className={`btn btn-secondary ${settings.defaultFitMode === 'width' ? 'btn-primary' : ''}`}
                onClick={() => handleFitModeChange('width')}
              >
                Ajustar à Largura
              </button>
            </div>
          </section>

          {/* Pasta Monitorada */}
          <section className="settings-section card">
            <h3>Pasta Monitorada de PDFs</h3>
            <p className="settings-desc">
              Selecione um diretório que o aplicativo poderá sincronizar para buscar novos livros e
              subpastas.
            </p>
            <div className="folder-setting">
              <div className="folder-path truncate">
                <Folder size={18} />
                <span>{settings.watchFolder || 'Nenhuma pasta configurada'}</span>
              </div>
              <div className="folder-actions">
                <button className="btn btn-secondary" onClick={handleSelectFolder}>
                  Escolher Pasta
                </button>
                {settings.watchFolder && (
                  <button className="btn btn-ghost" onClick={handleClearFolder}>
                    Remover
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Armazenamento Local e Dados */}
          <section className="settings-section card">
            <h3>Armazenamento Local</h3>
            <p className="settings-desc">
              Todos os metadados, progresso de leitura e histórico ficam armazenados de forma 100%
              local no seu computador em formato JSON seguro.
            </p>
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
            <h3>Sobre o Boodfy</h3>
            <div className="about-info">
              <p>
                <strong>Versão:</strong> {version || '1.0.0'}
              </p>
              <p>
                <strong>Privacidade:</strong> Sem banco de dados externo, sem conexão com nuvem e
                sem envio de dados (exceto o texto do capítulo quando você optar por usar IA).
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
