import { useState, useEffect, useCallback } from 'react';
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
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { storage } from '@/services/storage';
import { testAiConnection } from '@/services/quiz-ai';
import type { AppSettings } from '@/types';
import type { AiModelOption } from '../../../electron/preload';
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

const DEFAULT_FALLBACK_MODELS: Record<string, AiModelOption[]> = {
  gemini: [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', badge: 'Recomendado · Rápido' },
    { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite', badge: 'Ultrarrápido' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', badge: 'Estável e Veloz' },
    { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash-Lite', badge: 'Leve' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', badge: 'Raciocínio Avançado' },
  ],
  groq: [
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', badge: 'Recomendado · Rápido' },
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', badge: 'Instantâneo' },
    { id: 'meta-llama/llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout 17B', badge: 'Novo' },
    { id: 'meta-llama/llama-4-maverick-17b-128e-instruct', name: 'Llama 4 Maverick 17B' },
    { id: 'qwen-qwq-32b', name: 'Qwen QwQ 32B' },
    { id: 'gemma2-9b-it', name: 'Gemma 2 9B' },
  ],
  openai: [
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', badge: 'Recomendado · Rápido' },
    { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', badge: 'Novo · Veloz' },
    { id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano', badge: 'Ultrarrápido' },
    { id: 'gpt-4o', name: 'GPT-4o', badge: 'Completo' },
    { id: 'gpt-4.1', name: 'GPT-4.1', badge: 'Avançado' },
    { id: 'o4-mini', name: 'o4-mini', badge: 'Raciocínio' },
  ],
  openrouter: [
    { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B Instruct', badge: 'Grátis' },
    { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash', badge: 'Grátis' },
    { id: 'deepseek/deepseek-chat-v3-0324:free', name: 'DeepSeek V3', badge: 'Grátis' },
    { id: 'qwen/qwen-2.5-72b-instruct:free', name: 'Qwen 2.5 72B Instruct', badge: 'Grátis' },
    { id: 'openai/gpt-4o-mini', name: 'OpenAI GPT-4o Mini' },
  ],
  ollama: [
    { id: 'llama3.2', name: 'Llama 3.2 (3B)', badge: 'Recomendado · Local' },
    { id: 'llama3.1', name: 'Llama 3.1 (8B)' },
    { id: 'qwen2.5', name: 'Qwen 2.5' },
    { id: 'mistral', name: 'Mistral 7B' },
    { id: 'gemma2', name: 'Gemma 2' },
    { id: 'deepseek-r1', name: 'DeepSeek R1' },
  ],
};

const AI_PRESETS: ProviderPreset[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    badge: 'Recomendado · Grátis',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-2.5-flash',
    keyUrl: 'https://aistudio.google.com/app/apikey',
    keyHint: 'Crie uma chave gratuita no Google AI Studio e escolha um dos modelos Gemini disponíveis',
  },
  {
    id: 'groq',
    name: 'Groq (Llama / Qwen)',
    badge: 'Ultrarrápido · Grátis',
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile',
    keyUrl: 'https://console.groq.com/keys',
    keyHint: 'Chave gratuita no console da Groq (gsk_...) — velocidade instantânea',
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
    badge: 'Vários Modelos',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'meta-llama/llama-3.3-70b-instruct:free',
    keyUrl: 'https://openrouter.ai/keys',
    keyHint: 'Chave de API do OpenRouter (sk-or-...) com acesso a dezenas de IAs gratuitas e pagas',
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

function formatModelOptionLabel(option: AiModelOption): string {
  const parts: string[] = [];
  if (option.name && option.name.toLowerCase() !== option.id.toLowerCase()) {
    parts.push(`${option.name} (${option.id})`);
  } else {
    parts.push(option.id);
  }
  if (option.badge) {
    parts.push(`— ${option.badge}`);
  }
  return parts.join(' ');
}

export function AiConfigModal({ isOpen, onClose, onSaved }: AiConfigModalProps) {
  const [enabled, setEnabled] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>('gemini');
  const [baseUrl, setBaseUrl] = useState('https://generativelanguage.googleapis.com/v1beta/openai');
  const [model, setModel] = useState('gemini-2.5-flash');
  const [customModelMode, setCustomModelMode] = useState(false);
  const [showAdvancedUrl, setShowAdvancedUrl] = useState(false);

  const [apiKey, setApiKey] = useState('');
  const [hasStoredKey, setHasStoredKey] = useState(false);

  const [availableModels, setAvailableModels] = useState<AiModelOption[]>(
    DEFAULT_FALLBACK_MODELS.gemini ?? [],
  );
  const [modelsSource, setModelsSource] = useState<'live' | 'curated'>('curated');
  const [loadingModels, setLoadingModels] = useState(false);

  const [testing, setTesting] = useState(false);
  const [verified, setVerified] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const fetchModels = useCallback(
    async (providerId: string, targetUrl: string, keyOverride?: string, preferredModel?: string) => {
      const fallback = DEFAULT_FALLBACK_MODELS[providerId] ?? [];
      if (!window.electronAPI?.aiListModels) {
        setAvailableModels(fallback);
        setModelsSource('curated');
        return;
      }

      setLoadingModels(true);
      try {
        const res = await window.electronAPI.aiListModels({
          provider: providerId,
          baseUrl: targetUrl,
          apiKey: keyOverride,
        });
        const list = res.models && res.models.length > 0 ? res.models : fallback;
        setAvailableModels(list);
        setModelsSource(res.source ?? 'curated');

        if (list.length > 0 && providerId !== 'custom') {
          setModel((currentModel) => {
            const target = preferredModel ?? currentModel;
            if (target && list.some((m) => m.id === target)) {
              return target;
            }
            return list[0]?.id ?? target;
          });
        }
      } catch {
        setAvailableModels(fallback);
        setModelsSource('curated');
      } finally {
        setLoadingModels(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!isOpen) return;

    Promise.all([
      storage.getSettings(),
      window.electronAPI.aiHasKey().catch(() => false),
    ]).then(([s, hasKey]) => {
      setSettings(s);
      setEnabled(s.ai.enabled);
      const savedUrl = s.ai.baseUrl || 'https://generativelanguage.googleapis.com/v1beta/openai';
      const savedModel = s.ai.model || 'gemini-2.5-flash';
      setBaseUrl(savedUrl);
      setModel(savedModel);
      setHasStoredKey(hasKey);
      setCustomModelMode(false);
      setShowAdvancedUrl(false);

      const isLocal = /localhost|127\.0\.0\.1/i.test(savedUrl);
      const previouslyVerified = Boolean(s.ai.verified && (hasKey || isLocal));
      setVerified(previouslyVerified);
      setTestResult(
        previouslyVerified
          ? {
              ok: true,
              message: `Conexão já verificada e pronta com o modelo "${savedModel}".`,
            }
          : null,
      );

      let providerId = 'gemini';
      if (s.ai.provider && AI_PRESETS.some((p) => p.id === s.ai.provider)) {
        providerId = s.ai.provider;
      } else {
        const matching = AI_PRESETS.find(
          (p) => p.baseUrl && savedUrl.includes(p.baseUrl.split('/')[2] || ''),
        );
        providerId = matching?.id ?? 'gemini';
      }
      setSelectedProvider(providerId);
      setAvailableModels(DEFAULT_FALLBACK_MODELS[providerId] ?? []);
      void fetchModels(providerId, savedUrl, undefined, savedModel);
    });

    setApiKey('');
  }, [isOpen, fetchModels]);

  // Quando o usuário cola/digita uma nova chave de API, busca automaticamente os modelos atualizados na API do provedor
  useEffect(() => {
    if (!isOpen || !enabled) return;
    const trimmedKey = apiKey.trim();
    if (trimmedKey.length < 10) return;

    const timer = setTimeout(() => {
      void fetchModels(selectedProvider, baseUrl, trimmedKey);
    }, 450);

    return () => clearTimeout(timer);
  }, [apiKey, isOpen, enabled, selectedProvider, baseUrl, fetchModels]);

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
    setCustomModelMode(preset.id === 'custom');
    setShowAdvancedUrl(preset.id === 'custom' || Boolean(preset.isLocal));
    markUnverified();

    if (preset.id !== 'custom') {
      setBaseUrl(preset.baseUrl);
      setModel(preset.model);
      setAvailableModels(DEFAULT_FALLBACK_MODELS[preset.id] ?? []);
      void fetchModels(preset.id, preset.baseUrl, apiKey.trim() || undefined, preset.model);
    } else {
      setAvailableModels([]);
      setModelsSource('curated');
    }
  };

  const handleTestConnection = async () => {
    if (!baseUrl.trim() || !model.trim()) {
      setVerified(false);
      setTestResult({
        ok: false,
        message: 'Selecione um Provedor e um Modelo antes de testar.',
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
      const trimmedKey = apiKey.trim();
      if (trimmedKey) {
        await window.electronAPI.aiSetKey(trimmedKey);
        setHasStoredKey(true);
        setApiKey('');
      }

      const [res] = await Promise.all([
        testAiConnection({
          baseUrl: baseUrl.trim(),
          model: model.trim(),
          apiKey: trimmedKey || undefined,
        }),
        fetchModels(selectedProvider, baseUrl.trim(), trimmedKey || undefined, model.trim()),
      ]);

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
    setModelsSource('curated');
    setAvailableModels(DEFAULT_FALLBACK_MODELS[selectedProvider] ?? []);
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

  const isModelInList = availableModels.some((m) => m.id === model);
  const showCustomModelInput =
    customModelMode || selectedProvider === 'custom' || availableModels.length === 0;

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
                  ? 'A IA analisa o capítulo e cria perguntas profundas de contexto e entendimento em poucos segundos.'
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
                  interpretado como um professor faria: você recebe perguntas de{' '}
                  <strong>
                    contexto geral, entendimento profundo da ideia do autor, relação entre conceitos e
                    interpretação crítica
                  </strong>
                  , com alternativas mais inteligentes e explicações diretas.
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
                    <p>Selecione o provedor para carregar automaticamente os modelos disponíveis</p>
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
                        ? 'Escolha o modelo local instalado'
                        : `Coloque sua chave de API e escolha o modelo (${currentPreset?.name ?? 'IA'})`}
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
                      Provedor local selecionado. Certifique-se de que o Ollama está rodando em{' '}
                      <code>{baseUrl}</code>.
                    </span>
                  </div>
                )}

                {/* Seleção de Modelo via Dropdown atualizado pela API */}
                <div className="ai-model-section">
                  <div className="ai-model-header">
                    <span className="ai-field-label">Modelo de IA</span>
                    <div className="ai-model-header-actions">
                      {loadingModels ? (
                        <span className="ai-models-status loading">
                          <Loader2 size={12} className="spin" /> Buscando modelos na API...
                        </span>
                      ) : modelsSource === 'live' ? (
                        <span className="ai-models-status live" title="Lista carregada em tempo real da API oficial do provedor">
                          ● Lista atualizada via API ({availableModels.length} modelos)
                        </span>
                      ) : (
                        <span className="ai-models-status curated">
                          Modelos recomendados ({availableModels.length})
                        </span>
                      )}

                      <button
                        type="button"
                        className="ai-refresh-models-btn"
                        onClick={() =>
                          void fetchModels(
                            selectedProvider,
                            baseUrl.trim(),
                            apiKey.trim() || undefined,
                            model,
                          )
                        }
                        disabled={loadingModels}
                        title="Atualizar lista de modelos disponíveis direto da API"
                      >
                        <RefreshCw size={12} className={loadingModels ? 'spin' : ''} />
                        <span>Atualizar</span>
                      </button>

                      {selectedProvider !== 'custom' && (
                        <button
                          type="button"
                          className="ai-advanced-url-btn"
                          onClick={() => setShowAdvancedUrl((prev) => !prev)}
                          title="Ver/editar URL base da API"
                        >
                          <SlidersHorizontal size={12} />
                          <span>URL</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {!showCustomModelInput ? (
                    <select
                      className="input ai-model-select"
                      value={isModelInList ? model : availableModels[0]?.id ?? model}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '__custom__') {
                          setCustomModelMode(true);
                          return;
                        }
                        setModel(val);
                        markUnverified();
                      }}
                    >
                      {!isModelInList && model && (
                        <option value={model}>{model} (Selecionado atualmente)</option>
                      )}
                      {availableModels.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {formatModelOptionLabel(opt)}
                        </option>
                      ))}
                      <option value="__custom__">✍️ Digitar outro código de modelo manualmente...</option>
                    </select>
                  ) : (
                    <div className="ai-custom-model-row">
                      <input
                        className="input"
                        value={model}
                        placeholder="Digite o ID exato do modelo (ex: gemini-2.5-flash, gpt-4o-mini)..."
                        onChange={(e) => {
                          setModel(e.target.value);
                          markUnverified();
                        }}
                      />
                      {availableModels.length > 0 && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setCustomModelMode(false);
                            if (!model && availableModels[0]) {
                              setModel(availableModels[0].id);
                            }
                          }}
                        >
                          Voltar para lista
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Campo URL Base (sempre visível no modo Custom/Ollama ou quando o botão URL é clicado) */}
                {(showAdvancedUrl || selectedProvider === 'custom' || isLocalProvider) && (
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
                )}
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
                      Verificação instantânea para confirmar que sua chave e o modelo escolhido estão prontos
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
                        <Loader2 size={16} className="spin" /> Verificando conexão com a IA...
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
