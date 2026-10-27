import { useState, useEffect } from 'react';
import {
  Sparkles,
  KeyRound,
  Check,
  ExternalLink,
  Loader2,
  X,
  AlertCircle,
  Cpu,
  WifiOff,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { storage } from '@/services/storage';
import { testAiConnection } from '@/services/quiz-ai';
import type { AppSettings } from '@/types';
import './AiConfigModal.css';

interface AiConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (settings: AppSettings) => void;
}

export interface ProviderPreset {
  id: string;
  name: string;
  badge?: string;
  baseUrl: string;
  model: string;
  keyUrl?: string;
  keyHint: string;
  isLocal?: boolean;
}

const AI_PRESETS: ProviderPreset[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    badge: 'Recomendado · Grátis',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-3.8-flash',
    keyUrl: 'https://aistudio.google.com/app/apikey',
    keyHint: 'Crie uma chave gratuita no Google AI Studio (suporta gemini-3.8-flash e gemini-3.5-flash-lite)',
  },
  {
    id: 'groq',
    name: 'Groq (Llama 3.3)',
    badge: 'Ultrarrápido · Grátis',
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile',
    keyUrl: 'https://console.groq.com/keys',
    keyHint: 'Chave gratuita no console da Groq (gsk_...) - não sobrecarrega e responde instantaneamente',
  },
  {
    id: 'openai',
    name: 'OpenAI (ChatGPT)',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    keyUrl: 'https://platform.openai.com/api-keys',
    keyHint: 'Chave de API da OpenAI (começa com sk-...)',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'meta-llama/llama-3.3-70b-instruct:free',
    keyUrl: 'https://openrouter.ai/keys',
    keyHint: 'Chave de API do OpenRouter (sk-or-...)',
  },
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    badge: 'No seu PC',
    baseUrl: 'http://localhost:11434/v1',
    model: 'llama3.2',
    keyHint: 'Roda localmente no seu computador (não exige chave de API)',
    isLocal: true,
  },
  {
    id: 'custom',
    name: 'Outro (Compatível OpenAI)',
    baseUrl: '',
    model: '',
    keyHint: 'Qualquer servidor compatível com a rota /v1/chat/completions',
  },
];

export function AiConfigModal({ isOpen, onClose, onSaved }: AiConfigModalProps) {
  const [enabled, setEnabled] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>('gemini');
  const [baseUrl, setBaseUrl] = useState('https://generativelanguage.googleapis.com/v1beta/openai');
  const [model, setModel] = useState('gemini-3.8-flash');
  const [apiKey, setApiKey] = useState('');
  const [hasStoredKey, setHasStoredKey] = useState(false);

  const [testing, setTesting] = useState(false);
  const [verified, setVerified] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    Promise.all([
      storage.getSettings(),
      window.electronAPI.aiHasKey().catch(() => false),
    ]).then(([s, hasKey]) => {
      setSettings(s);
      setEnabled(s.ai.enabled);
      setBaseUrl(s.ai.baseUrl || 'https://generativelanguage.googleapis.com/v1beta/openai');
      setModel(s.ai.model || 'gemini-2.0-flash');
      setHasStoredKey(hasKey);

      const isLocal = /localhost|127\.0\.0\.1/i.test(s.ai.baseUrl || '');
      const previouslyVerified = Boolean(s.ai.verified && (hasKey || isLocal));
      setVerified(previouslyVerified);
      setTestResult(
        previouslyVerified
          ? {
              ok: true,
              message: `Conexão já verificada e pronta com o modelo "${s.ai.model}".`,
            }
          : null,
      );

      if (s.ai.provider && AI_PRESETS.some((p) => p.id === s.ai.provider)) {
        setSelectedProvider(s.ai.provider);
      } else {
        const matching = AI_PRESETS.find(
          (p) => p.baseUrl && s.ai.baseUrl && s.ai.baseUrl.includes(p.baseUrl.split('/')[2] || ''),
        );
        setSelectedProvider(matching?.id ?? 'gemini');
      }
    });

    setApiKey('');
  }, [isOpen]);

  if (!isOpen) return null;

  const currentPreset = AI_PRESETS.find((p) => p.id === selectedProvider);
  const isLocalProvider = Boolean(
    currentPreset?.isLocal || /localhost|127\.0\.0\.1/i.test(baseUrl),
  );
  const hasKeyReady = isLocalProvider || hasStoredKey || apiKey.trim().length > 0;

  const markUnverified = () => {
    setVerified(false);
    setTestResult(null);
  };

  const handleToggleEnabled = (nextEnabled: boolean) => {
    setEnabled(nextEnabled);
  };

  const handleSelectPreset = (preset: ProviderPreset) => {
    setSelectedProvider(preset.id);
    markUnverified();
    if (preset.id !== 'custom') {
      setBaseUrl(preset.baseUrl);
      setModel(preset.model);
    }
  };

  const handleTestConnection = async () => {
    if (!baseUrl.trim() || !model.trim()) {
      setVerified(false);
      setTestResult({
        ok: false,
        message: 'Preencha a URL Base e o nome do Modelo antes de testar.',
      });
      return;
    }

    if (!isLocalProvider && !hasStoredKey && !apiKey.trim()) {
      setVerified(false);
      setTestResult({
        ok: false,
        message: 'Cole sua chave de API no Passo 2 antes de testar a conexão.',
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      if (apiKey.trim()) {
        await window.electronAPI.aiSetKey(apiKey.trim());
        setHasStoredKey(true);
        setApiKey('');
      }

      const res = await testAiConnection({
        baseUrl: baseUrl.trim(),
        model: model.trim(),
      });

      setVerified(res.ok);
      setTestResult(res);
    } catch (err) {
      setVerified(false);
      setTestResult({
        ok: false,
        message: err instanceof Error ? err.message : 'Erro ao testar a conexão.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleClearKey = async () => {
    await window.electronAPI.aiClearKey();
    setHasStoredKey(false);
    setApiKey('');
    markUnverified();
  };

  const handleSave = async () => {
    if (!settings) return;
    if (enabled && !verified) return;

    setSaving(true);
    try {
      if (enabled && apiKey.trim()) {
        await window.electronAPI.aiSetKey(apiKey.trim());
        setHasStoredKey(true);
      }

      const updated: AppSettings = {
        ...settings,
        ai: {
          enabled,
          baseUrl: baseUrl.trim(),
          model: model.trim(),
          provider: selectedProvider,
          verified: enabled ? true : settings.ai.verified,
        },
      };
      await storage.saveSettings(updated);
      onSaved?.(updated);
      onClose();
    } catch (err) {
      console.error('Erro ao salvar configurações de IA:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ai-modal-overlay" onClick={onClose}>
      <div
        className="ai-modal-card card"
        role="dialog"
        aria-modal="true"
        aria-label="Configuração do Modo de Geração de Quizzes"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="ai-modal-header">
          <div className="ai-modal-title">
            <Sparkles size={20} className="ai-modal-sparkle" />
            <div>
              <h3>Como gerar as perguntas do Quiz?</h3>
              <p>Escolha entre usar Inteligência Artificial ou o gerador local Offline</p>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} title="Fechar">
            <X size={18} />
          </button>
        </header>

        <div className="ai-modal-body">
          {/* Switch Principal */}
          <div
            className={`ai-switch-card ${enabled ? 'active' : ''}`}
            onClick={() => handleToggleEnabled(!enabled)}
            role="switch"
            aria-checked={enabled}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleToggleEnabled(!enabled);
              }
            }}
          >
            <div className="ai-switch-info">
              <div className="ai-switch-heading">
                {enabled ? <Sparkles size={18} /> : <WifiOff size={18} />}
                <strong>
                  {enabled
                    ? 'Modo com Inteligência Artificial (Ativado)'
                    : 'Modo Offline sem IA (Ativado)'}
                </strong>
              </div>
              <span>
                {enabled
                  ? 'A IA analisa o capítulo inteiro e cria perguntas profundas de contexto e entendimento.'
                  : 'As perguntas são criadas localmente no computador sem usar Inteligência Artificial.'}
              </span>
            </div>

            <div className={`ai-toggle-pill ${enabled ? 'on' : 'off'}`}>
              <div className="ai-toggle-thumb" />
            </div>
          </div>

          {/* FLUXO MODO OFFLINE (SEM IA) */}
          {!enabled && (
            <div className="ai-offline-explainer">
              <div className="ai-explainer-block">
                <h4>
                  <WifiOff size={16} /> Como funcionam as perguntas no Modo Offline (Sem IA)?
                </h4>
                <p>
                  No modo sem IA, o aplicativo lê o texto das páginas do capítulo diretamente no seu
                  computador (100% offline) e usa regras automáticas para identificar{' '}
                  <strong>
                    definições explícitas, frases de causa e efeito, afirmações diretas e palavras-chave
                  </strong>{' '}
                  para montar as alternativas.
                </p>
              </div>

              <div className="ai-explainer-block highlight">
                <h4>
                  <Sparkles size={16} /> Por que usar o Modo com IA é muito melhor?
                </h4>
                <p>
                  Com a <strong>Inteligência Artificial ativada</strong>, o capítulo inteiro é
                  interpretado como um professor faria: você recebe perguntas mais complexas de{' '}
                  <strong>
                    contexto geral, entendimento profundo da ideia do autor, relação entre conceitos e
                    interpretação crítica
                  </strong>
                  , com alternativas mais inteligentes e explicações detalhadas.
                </p>
                <p className="ai-explainer-cta">
                  💡 <strong>Dica:</strong> Você pode usar o <strong>Google Gemini</strong> ou{' '}
                  <strong>Groq</strong> gratuitamente! Basta ativar a chave acima para configurar.
                </p>
              </div>
            </div>
          )}

          {/* FLUXO CONTÍNUO COM IA */}
          {enabled && (
            <div className="ai-flow-steps">
              {/* PASSO 1 */}
              <div className="ai-step">
                <div className="ai-step-header">
                  <span className="ai-step-num">1</span>
                  <div>
                    <h4>Escolha qual IA você quer usar</h4>
                    <p>Selecione o provedor para preencher o endereço e modelo recomendados</p>
                  </div>
                </div>

                <div className="ai-provider-grid">
                  {AI_PRESETS.map((preset) => {
                    const isSelected = selectedProvider === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        className={`ai-provider-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleSelectPreset(preset)}
                      >
                        <div className="ai-provider-top">
                          <span className="ai-provider-name">{preset.name}</span>
                          {preset.badge && <span className="ai-badge">{preset.badge}</span>}
                        </div>
                        {isSelected && <Check size={15} className="ai-provider-check" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* PASSO 2 */}
              <div className="ai-step">
                <div className="ai-step-header">
                  <span className="ai-step-num">2</span>
                  <div>
                    <h4>
                      {isLocalProvider
                        ? 'Confira o endereço e modelo local'
                        : `Coloque sua chave de API (${currentPreset?.name ?? 'IA'})`}
                    </h4>
                    <p>{currentPreset?.keyHint}</p>
                  </div>
                </div>

                {!isLocalProvider ? (
                  <div className="ai-key-section">
                    <div className="ai-key-header">
                      <span className="ai-field-label">Chave da API</span>
                      {currentPreset?.keyUrl && (
                        <button
                          type="button"
                          className="ai-key-link"
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPreset?.keyUrl) {
                              if (window.electronAPI?.openExternal) {
                                void window.electronAPI.openExternal(currentPreset.keyUrl);
                              } else {
                                window.open(currentPreset.keyUrl, '_blank', 'noopener,noreferrer');
                              }
                            }
                          }}
                        >
                          Obter chave de API aqui <ExternalLink size={12} />
                        </button>
                      )}
                    </div>

                    <div className="ai-key-input-wrapper">
                      <KeyRound size={16} className="ai-key-icon" />
                      <input
                        className="input ai-key-input"
                        type="password"
                        autoComplete="off"
                        placeholder={
                          hasStoredKey
                            ? '•••••••• Chave já salva (digite outra se quiser substituir)'
                            : 'Cole sua chave de API aqui...'
                        }
                        value={apiKey}
                        onChange={(e) => {
                          setApiKey(e.target.value);
                          markUnverified();
                        }}
                      />
                      {hasStoredKey && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => void handleClearKey()}
                          title="Remover chave salva"
                        >
                          Limpar chave
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="ai-local-info">
                    <Cpu size={16} />
                    <span>
                      Provedor local selecionado. Certifique-se de que o servidor local está rodando
                      em <code>{baseUrl}</code>.
                    </span>
                  </div>
                )}

                <div className="ai-field-row">
                  <label className="ai-field">
                    <span className="ai-field-label">URL Base da API</span>
                    <input
                      className="input"
                      value={baseUrl}
                      placeholder="https://..."
                      onChange={(e) => {
                        setBaseUrl(e.target.value);
                        markUnverified();
                      }}
                    />
                  </label>

                  <label className="ai-field">
                    <span className="ai-field-label">Modelo</span>
                    <input
                      className="input"
                      value={model}
                      placeholder={
                        selectedProvider === 'gemini'
                          ? 'gemini-3.8-flash ou gemini-3.5-flash-lite'
                          : 'ex: llama-3.3-70b-versatile'
                      }
                      onChange={(e) => {
                        setModel(e.target.value);
                        markUnverified();
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* PASSO 3 */}
              <div className="ai-step">
                <div className="ai-step-header">
                  <span className={`ai-step-num ${verified ? 'done' : ''}`}>
                    {verified ? <Check size={14} /> : '3'}
                  </span>
                  <div>
                    <h4>Teste e valide a conexão para liberar o salvamento</h4>
                    <p>
                      Fazemos um teste real agora para você ter certeza absoluta de que a IA está
                      funcionando
                    </p>
                  </div>
                </div>

                <div className="ai-verify-row">
                  <button
                    type="button"
                    className={`btn ${verified ? 'btn-secondary' : 'btn-primary'} ai-test-btn`}
                    onClick={() => void handleTestConnection()}
                    disabled={testing || !hasKeyReady}
                  >
                    {testing ? (
                      <>
                        <Loader2 size={16} className="spin" /> Testando comunicação com a IA...
                      </>
                    ) : verified ? (
                      <>
                        <ShieldCheck size={16} /> Testar Novamente
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} /> Testar e Validar Conexão
                      </>
                    )}
                  </button>
                </div>

                {testResult && (
                  <div className={`ai-test-result ${testResult.ok ? 'success' : 'error'}`}>
                    {testResult.ok ? <ShieldCheck size={18} /> : <AlertCircle size={18} />}
                    <div>
                      <strong>
                        {testResult.ok
                          ? 'IA verificada e funcionando!'
                          : 'A conexão com a IA não funcionou'}
                      </strong>
                      <p>{testResult.message}</p>
                    </div>
                  </div>
                )}

                {!testResult && (
                  <div className="ai-test-result pending">
                    <Info size={16} />
                    <span>
                      Clique em <strong>Testar e Validar Conexão</strong> acima. O botão de salvar
                      será liberado assim que a IA responder com sucesso.
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <footer className="ai-modal-footer">
          <span className="ai-footer-status">
            {!enabled
              ? 'Modo selecionado: Perguntas Offline (Sem IA)'
              : verified
                ? '✅ IA testada e pronta para uso'
                : '⚠️ Teste a conexão no Passo 3 para continuar'}
          </span>

          <div className="ai-modal-footer-right">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void handleSave()}
              disabled={saving || (enabled && !verified)}
              title={
                enabled && !verified
                  ? 'Teste e valide a conexão no Passo 3 antes de salvar'
                  : undefined
              }
            >
              {saving
                ? 'Salvando...'
                : enabled
                  ? 'Salvar e Ativar IA'
                  : 'Usar Modo Offline (Sem IA)'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
