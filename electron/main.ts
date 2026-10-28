import { app, BrowserWindow, ipcMain, dialog, shell, protocol, net, safeStorage, Menu } from 'electron';
import path from 'path';
import fs from 'fs';
import dns from 'dns';
import { pathToFileURL } from 'url';

// Evita atrasos de 10-20s de resolução DNS IPv6 no Windows ao conectar em APIs externas
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {
  // ignore
}

// Register custom protocol for local cover cache before app is ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'bookly-cover',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      bypassCSP: false,
    },
  },
]);

const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;

const BOOK_ARG_PREFIX = '--open-book=';

function extractBookIdFromArgv(argv: string[]): string | null {
  for (const arg of argv) {
    if (typeof arg === 'string' && arg.startsWith(BOOK_ARG_PREFIX)) {
      const value = arg
        .slice(BOOK_ARG_PREFIX.length)
        .replace(/^["']+|["']+$/g, '')
        .trim();
      if (value && /^[\w-]+$/.test(value)) {
        return value;
      }
    }
  }
  return null;
}

let pendingLaunchBookId: string | null = extractBookIdFromArgv(process.argv);

function sanitizeShortcutName(title: string): string {
  const cleaned = title
    .replace(/[<>:"/\\|?*\p{Cc}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/g, '')
    .trim();
  return (cleaned || 'Livro Boodfy').slice(0, 80);
}

function getShortcutIconPath(): string {
  try {
    const icoPath = path.join(getDataPath(), 'boodfy-book.ico');
    if (fs.existsSync(icoPath)) return icoPath;
    const pngCandidates = [
      path.join(__dirname, '../public/icon.png'),
      path.join(__dirname, '../dist/icon.png'),
      path.join(process.resourcesPath || '', 'public/icon.png'),
    ];
    const pngPath = pngCandidates.find((p) => fs.existsSync(p));
    if (pngPath) {
      const pngBuffer = fs.readFileSync(pngPath);
      const header = Buffer.alloc(22);
      header.writeUInt16LE(0, 0);
      header.writeUInt16LE(1, 2);
      header.writeUInt16LE(1, 4);
      header.writeUInt8(0, 6);
      header.writeUInt8(0, 7);
      header.writeUInt8(0, 8);
      header.writeUInt8(0, 9);
      header.writeUInt16LE(1, 10);
      header.writeUInt16LE(32, 12);
      header.writeUInt32LE(pngBuffer.length, 14);
      header.writeUInt32LE(22, 18);
      fs.writeFileSync(icoPath, Buffer.concat([header, pngBuffer]));
      return icoPath;
    }
  } catch {
    // fallback to execPath
  }
  return process.execPath;
}

function createBookShortcutIcon(
  bookId: string,
  pngDataUrl: string
): { icoPath: string; pngPath: string } | null {
  try {
    const shortcutsDir = path.join(getDataPath(), 'shortcuts');
    if (!fs.existsSync(shortcutsDir)) {
      fs.mkdirSync(shortcutsDir, { recursive: true });
    }

    const base64Data = pngDataUrl.replace(/^data:image\/png;base64,/, '');
    const pngBuffer = Buffer.from(base64Data, 'base64');
    if (pngBuffer.length === 0) return null;

    const pngPath = path.join(shortcutsDir, `${bookId}.png`);
    fs.writeFileSync(pngPath, pngBuffer);

    const icoPath = path.join(shortcutsDir, `${bookId}.ico`);
    const header = Buffer.alloc(22);
    header.writeUInt16LE(0, 0);
    header.writeUInt16LE(1, 2);
    header.writeUInt16LE(1, 4);
    header.writeUInt8(0, 6);
    header.writeUInt8(0, 7);
    header.writeUInt8(0, 8);
    header.writeUInt8(0, 9);
    header.writeUInt16LE(1, 10);
    header.writeUInt16LE(32, 12);
    header.writeUInt32LE(pngBuffer.length, 14);
    header.writeUInt32LE(22, 18);
    fs.writeFileSync(icoPath, Buffer.concat([header, pngBuffer]));

    return { icoPath, pngPath };
  } catch (err) {
    console.error('Erro ao gerar ícone customizado de atalho:', err);
    return null;
  }
}

function getDataPath(): string {
  return app.getPath('userData');
}

function getCoversDir(): string {
  const coversPath = path.join(getDataPath(), 'covers');
  if (!fs.existsSync(coversPath)) {
    fs.mkdirSync(coversPath, { recursive: true });
  }
  return coversPath;
}

function ensureDataDir(): void {
  const dataPath = getDataPath();
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
  }
  getCoversDir();
}

const AI_KEY_FILE = 'ai-key.bin';

function getAiKeyPath(): string {
  return path.join(getDataPath(), AI_KEY_FILE);
}

function writeAiKey(key: string): void {
  const trimmed = key.trim();
  if (!trimmed) {
    fs.rmSync(getAiKeyPath(), { force: true });
    return;
  }
  const payload = safeStorage.isEncryptionAvailable()
    ? safeStorage.encryptString(trimmed)
    : Buffer.from(trimmed, 'utf-8');
  fs.writeFileSync(getAiKeyPath(), payload);
}

function readAiKey(): string | null {
  try {
    const keyPath = getAiKeyPath();
    if (!fs.existsSync(keyPath)) return null;
    const raw = fs.readFileSync(keyPath);
    if (raw.length === 0) return null;
    const value = safeStorage.isEncryptionAvailable()
      ? safeStorage.decryptString(raw)
      : raw.toString('utf-8');
    return value.trim() || null;
  } catch {
    return null;
  }
}

export interface AiModelOption {
  id: string;
  name: string;
  badge?: string;
}

const CURATED_MODELS: Record<string, AiModelOption[]> = {
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

function normalizeBaseUrl(rawUrl: string): string {
  let baseUrl = rawUrl.trim().replace(/\/+$/, '');
  if (baseUrl.endsWith('/chat/completions')) {
    baseUrl = baseUrl.slice(0, -'/chat/completions'.length);
  }
  if (baseUrl.includes('generativelanguage.googleapis.com') && !baseUrl.includes('/openai')) {
    baseUrl = `${baseUrl}/openai`;
  }
  if (baseUrl.includes('api.groq.com') && !baseUrl.includes('/openai/v1')) {
    baseUrl = `${baseUrl}/openai/v1`;
  }
  return baseUrl;
}

function normalizeModelName(rawModel: string): string {
  const trimmed = rawModel.trim().replace(/^models\//, '');
  if (
    trimmed === 'gemini-3.8-flash' ||
    trimmed === 'gemini-3.6-flash' ||
    trimmed === 'gemini-3.5-flash-lite'
  ) {
    return 'gemini-2.5-flash';
  }
  return trimmed;
}

function prioritizeModels(liveModels: AiModelOption[], curated: AiModelOption[]): AiModelOption[] {
  const curatedMap = new Map(curated.map((c, idx) => [c.id, { ...c, rank: idx }]));
  const seen = new Set<string>();
  const merged: (AiModelOption & { rank: number })[] = [];

  for (const item of liveModels) {
    if (!item.id || seen.has(item.id)) continue;
    seen.add(item.id);
    const match = curatedMap.get(item.id);
    merged.push({
      id: item.id,
      name: match?.name || item.name || item.id,
      badge: match?.badge || item.badge,
      rank: match ? match.rank : 100,
    });
  }

  merged.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return a.id.localeCompare(b.id);
  });

  return merged.map(({ id, name, badge }) => ({ id, name, badge }));
}

async function fetchGeminiLiveModels(apiKey: string): Promise<AiModelOption[] | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}&pageSize=100`,
      { signal: controller.signal },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      models?: {
        name?: string;
        displayName?: string;
        supportedGenerationMethods?: string[];
      }[];
    };
    if (!Array.isArray(data.models)) return null;

    const filtered: AiModelOption[] = [];
    for (const m of data.models) {
      if (!m.name || !Array.isArray(m.supportedGenerationMethods)) continue;
      if (!m.supportedGenerationMethods.includes('generateContent')) continue;
      const id = m.name.replace(/^models\//, '');
      if (!/^gemini-/i.test(id)) continue;
      if (/embedding|imagen|veo|aqa|tts|audio|robotics|computer-use|learnlm|vision|thinking-exp/i.test(id)) {
        continue;
      }
      filtered.push({
        id,
        name: m.displayName || id,
      });
    }

    return filtered.length > 0
      ? prioritizeModels(filtered, CURATED_MODELS.gemini ?? [])
      : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchOpenAiCompatibleModels(
  provider: string,
  baseUrl: string,
  apiKey: string | null,
): Promise<AiModelOption[] | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    // Caso especial para Ollama nativo (/api/tags)
    if (provider === 'ollama' || /localhost:11434|127\.0\.0\.1:11434/i.test(baseUrl)) {
      const origin = baseUrl.replace(/\/v1$/i, '');
      const tagsRes = await fetch(`${origin}/api/tags`, { signal: controller.signal }).catch(
        () => null,
      );
      if (tagsRes && tagsRes.ok) {
        const tagsData = (await tagsRes.json()) as { models?: { name?: string }[] };
        if (Array.isArray(tagsData.models) && tagsData.models.length > 0) {
          return tagsData.models
            .filter((m) => typeof m.name === 'string' && m.name.length > 0)
            .map((m) => ({
              id: m.name as string,
              name: m.name as string,
              badge: 'Instalado no PC',
            }));
        }
      }
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const res = await fetch(`${baseUrl}/models`, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });
    if (!res.ok) return null;

    const json = (await res.json()) as {
      data?: {
        id?: string;
        name?: string;
        pricing?: { prompt?: string; completion?: string };
      }[];
    };
    if (!Array.isArray(json.data) || json.data.length === 0) return null;

    const rawList = json.data.filter((item) => typeof item.id === 'string' && item.id.length > 0);

    if (provider === 'openai' || /api\.openai\.com/i.test(baseUrl)) {
      const chatOnly = rawList
        .map((item) => item.id as string)
        .filter(
          (id) =>
            /^(gpt-4|gpt-5|o1|o3|o4|gpt-3\.5-turbo)/i.test(id) &&
            !/realtime|audio|tts|whisper|transcribe|search|dall-e|embedding|moderation|instruct|vision|\d{4}-\d{2}-\d{2}/i.test(
              id,
            ),
        )
        .map((id) => ({ id, name: id }));
      return chatOnly.length > 0
        ? prioritizeModels(chatOnly, CURATED_MODELS.openai ?? [])
        : null;
    }

    if (provider === 'groq' || /api\.groq\.com/i.test(baseUrl)) {
      const chatOnly = rawList
        .map((item) => item.id as string)
        .filter((id) => !/whisper|guard|tts|playai|orpheus|allam/i.test(id))
        .map((id) => ({ id, name: id }));
      return chatOnly.length > 0
        ? prioritizeModels(chatOnly, CURATED_MODELS.groq ?? [])
        : null;
    }

    if (provider === 'openrouter' || /openrouter\.ai/i.test(baseUrl)) {
      const freeModels: AiModelOption[] = [];
      const paidModels: AiModelOption[] = [];

      for (const item of rawList) {
        const id = item.id as string;
        if (/guard|moderation|embed|whisper|tts|auto/i.test(id)) continue;
        const isFree =
          id.endsWith(':free') ||
          (item.pricing?.prompt === '0' && item.pricing?.completion === '0');
        const entry: AiModelOption = {
          id,
          name: item.name || id,
          badge: isFree ? 'Grátis' : undefined,
        };
        if (isFree) {
          freeModels.push(entry);
        } else if (/^(google\/gemini|openai\/gpt-4o|anthropic\/claude-3\.5|deepseek\/deepseek|meta-llama\/llama-3\.3)/i.test(id)) {
          paidModels.push(entry);
        }
      }

      const combined = [
        ...prioritizeModels(freeModels, CURATED_MODELS.openrouter ?? []).slice(0, 35),
        ...paidModels.slice(0, 25),
      ];
      return combined.length > 0 ? combined : null;
    }

    return rawList.slice(0, 80).map((item) => ({
      id: item.id as string,
      name: item.name || (item.id as string),
    }));
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Chamada nativa ultrarrápida para a API do Google Gemini com desativação de "thinking"
 * nos modelos 2.5 Flash para evitar atrasos de 15-30s.
 */
async function callGeminiNative(params: {
  apiKey: string;
  model: string;
  messages: { role: string; content: string }[];
  isTest: boolean;
  signal: AbortSignal;
}): Promise<{ ok: boolean; status: number; content?: string; errorDetail?: string }> {
  const { apiKey, model, messages, isTest, signal } = params;
  const systemMsgs = messages.filter((m) => m.role === 'system').map((m) => m.content);
  const userMsgs = messages.filter((m) => m.role !== 'system').map((m) => m.content);

  const buildPayload = (includeFastConfig: boolean) => {
    const generationConfig: Record<string, unknown> = {
      temperature: isTest ? 0 : 0.3,
      maxOutputTokens: isTest ? 10 : 2048,
    };

    if (includeFastConfig) {
      if (!isTest) {
        generationConfig.responseMimeType = 'application/json';
      }
      if (/^gemini-2\.5-flash/i.test(model)) {
        generationConfig.thinkingConfig = { thinkingBudget: 0 };
      }
    }

    const body: Record<string, unknown> = {
      contents: [
        {
          role: 'user',
          parts: [{ text: userMsgs.join('\n\n') || 'Oi' }],
        },
      ],
      generationConfig,
    };

    if (systemMsgs.length > 0 && !isTest) {
      body.systemInstruction = {
        parts: [{ text: systemMsgs.join('\n') }],
      };
    }

    return body;
  };

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  let res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildPayload(true)),
    signal,
  });

  // Se o modelo não aceitar thinkingConfig ou responseMimeType (400), tenta imediatamente com config básica
  if (res.status === 400) {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload(false)),
      signal,
    });
  }

  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 300);
    return { ok: false, status: res.status, errorDetail: detail };
  }

  const json = (await res.json()) as {
    candidates?: {
      content?: {
        parts?: { text?: string; thought?: boolean }[];
      };
    }[];
  };

  const parts = json.candidates?.[0]?.content?.parts ?? [];
  const nonThoughtParts = parts.filter((p) => !p.thought && typeof p.text === 'string');
  const text = (nonThoughtParts.length > 0 ? nonThoughtParts : parts)
    .map((p) => p.text ?? '')
    .join('\n')
    .trim();

  if (!text) {
    return { ok: false, status: 200, errorDetail: 'Resposta vazia do modelo Gemini.' };
  }

  return { ok: true, status: 200, content: text };
}

function formatHttpError(status: number, rawDetail?: string): string {
  const known: Record<number, string> = {
    400: 'O provedor recusou o pedido (verifique o modelo selecionado).',
    401: 'Chave de API inválida ou sem permissão.',
    403: 'A chave de API não tem permissão para acessar este modelo.',
    404: 'Modelo não encontrado na plataforma. Escolha outro modelo na lista.',
    429: 'Limite gratuito de requisições/tokens por minuto atingido. Aguarde alguns segundos ou troque o modelo.',
    503: 'O modelo escolhido está com alta demanda no momento (503). Tente outro modelo da lista (ex: Flash-Lite ou 2.0 Flash).',
  };
  const message = known[status] ?? `O provedor respondeu com código ${status}.`;
  return rawDetail ? `${message} (${rawDetail})` : message;
}

function readJsonFile<T>(filename: string, defaultValue: T): T {
  const filePath = path.join(getDataPath(), filename);
  try {
    if (!fs.existsSync(filePath)) return defaultValue;
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return data as T;
  } catch {
    // Try backup
    const backupPath = filePath + '.backup';
    try {
      if (fs.existsSync(backupPath)) {
        const raw = fs.readFileSync(backupPath, 'utf-8');
        const data = JSON.parse(raw);
        return data as T;
      }
    } catch {
      // backup also corrupt
    }
    return defaultValue;
  }
}

function writeJsonFile(filename: string, data: unknown): void {
  const filePath = path.join(getDataPath(), filename);
  const tempPath = filePath + '.tmp';
  const backupPath = filePath + '.backup';
  try {
    const json = JSON.stringify(data, null, 2);
    fs.writeFileSync(tempPath, json, 'utf-8');
    // Backup existing file
    if (fs.existsSync(filePath)) {
      try {
        fs.copyFileSync(filePath, backupPath);
      } catch {
        // non-critical
      }
    }
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    // Clean up temp file
    try {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    } catch {
      // ignore
    }
    throw err;
  }
}

function fileExists(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function getPdfPageCount(filePath: string): Promise<number> {
  return new Promise((resolve) => {
    try {
      fs.accessSync(filePath, fs.constants.R_OK);
      resolve(0); // Will be updated by renderer
    } catch {
      resolve(0);
    }
  });
}

function scanDirectory(dirPath: string): string[] {
  const pdfFiles: string[] = [];
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        pdfFiles.push(...scanDirectory(fullPath));
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.pdf')) {
        pdfFiles.push(fullPath);
      }
    }
  } catch {
    // Permission denied or other error
  }
  return pdfFiles;
}

function setupProtocol(): void {
  protocol.handle('bookly-cover', async (request) => {
    try {
      const url = new URL(request.url);
      const fileName = path.basename(url.pathname);
      if (!fileName) {
        return new Response('Not found', { status: 404 });
      }
      const filePath = path.join(getCoversDir(), fileName);
      if (fs.existsSync(filePath)) {
        return net.fetch(pathToFileURL(filePath).toString());
      }
      return new Response('Cover not found', { status: 404 });
    } catch (err) {
      console.error('Error handling cover protocol:', err);
      return new Response('Internal error', { status: 500 });
    }
  });
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Boodfy',
    icon: path.join(__dirname, '../public/logo-square.png'),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      devTools: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Desabilita menu da janela e atalhos do DevTools (F12, Ctrl+Shift+I, etc.)
  Menu.setApplicationMenu(null);

  mainWindow.webContents.on('before-input-event', (event, input) => {
    const key = input.key.toLowerCase();
    const isCtrlOrCmd = input.control || input.meta;
    if (
      key === 'f12' ||
      (isCtrlOrCmd && input.shift && (key === 'i' || key === 'j' || key === 'c'))
    ) {
      event.preventDefault();
    }
  });

  mainWindow.webContents.on('devtools-opened', () => {
    mainWindow?.webContents.closeDevTools();
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
function setupIpcHandlers(): void {
  // File dialogs
  ipcMain.handle('dialog:openFiles', async () => {
    if (!mainWindow) return [];
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });
    return result.canceled ? [] : result.filePaths;
  });

  ipcMain.handle('dialog:openFolder', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  // Data persistence
  ipcMain.handle('data:read', (_event, filename: string) => {
    if (typeof filename !== 'string' || !/^[\w.-]+\.json$/.test(filename)) {
      throw new Error('Nome de arquivo inválido');
    }
    return readJsonFile(filename, null);
  });

  ipcMain.handle('data:write', (_event, filename: string, data: unknown) => {
    if (typeof filename !== 'string' || !/^[\w.-]+\.json$/.test(filename)) {
      throw new Error('Nome de arquivo inválido');
    }
    writeJsonFile(filename, data);
    return true;
  });

  // File operations
  ipcMain.handle('file:exists', (_event, filePath: string) => {
    if (typeof filePath !== 'string') return false;
    return fileExists(filePath);
  });

  ipcMain.handle('file:readPdf', (_event, filePath: string) => {
    if (typeof filePath !== 'string') throw new Error('Caminho inválido');
    if (!filePath.toLowerCase().endsWith('.pdf')) throw new Error('Não é um arquivo PDF');
    if (!fileExists(filePath)) throw new Error('Arquivo não encontrado');
    const buffer = fs.readFileSync(filePath);
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  });

  ipcMain.handle('file:getPageCount', async (_event, filePath: string) => {
    return getPdfPageCount(filePath);
  });

  ipcMain.handle('file:scanFolder', (_event, folderPath: string) => {
    if (typeof folderPath !== 'string') return [];
    return scanDirectory(folderPath);
  });

  ipcMain.handle('file:getFileName', (_event, filePath: string) => {
    if (typeof filePath !== 'string') return '';
    return path.basename(filePath, '.pdf');
  });

  ipcMain.handle('file:relocate', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  // Provedor de IA opcional (chave criptografada no processo principal)
  ipcMain.handle('ai:setKey', (_event, key: unknown) => {
    if (typeof key !== 'string' || key.trim().length === 0) {
      writeAiKey('');
      return true;
    }
    writeAiKey(key);
    return true;
  });

  ipcMain.handle('ai:hasKey', () => readAiKey() !== null);

  ipcMain.handle('ai:clearKey', () => {
    writeAiKey('');
    return true;
  });

  // Lista dinâmica de modelos disponíveis para cada provedor
  ipcMain.handle('ai:listModels', async (_event, payload: unknown) => {
    const data = (payload ?? {}) as {
      provider?: unknown;
      baseUrl?: unknown;
      apiKey?: unknown;
    };
    const provider = typeof data.provider === 'string' ? data.provider : 'gemini';
    const baseUrl = normalizeBaseUrl(typeof data.baseUrl === 'string' ? data.baseUrl : '');
    const inlineKey = typeof data.apiKey === 'string' && data.apiKey.trim() ? data.apiKey.trim() : null;
    const effectiveKey = inlineKey || readAiKey();

    const curated = CURATED_MODELS[provider] ?? CURATED_MODELS.gemini ?? [];

    // 1. Google Gemini
    if (provider === 'gemini' || /generativelanguage\.googleapis\.com/i.test(baseUrl)) {
      if (effectiveKey) {
        const live = await fetchGeminiLiveModels(effectiveKey);
        if (live && live.length > 0) {
          return { ok: true, models: live, source: 'live' as const };
        }
      }
      return { ok: true, models: curated, source: 'curated' as const };
    }

    // 2. OpenRouter ou Ollama (funcionam mesmo sem chave) ou OpenAI/Groq/Custom (com chave)
    const isKeylessProvider =
      provider === 'openrouter' ||
      provider === 'ollama' ||
      /openrouter\.ai|localhost|127\.0\.0\.1/i.test(baseUrl);

    if (baseUrl && (effectiveKey || isKeylessProvider)) {
      const live = await fetchOpenAiCompatibleModels(provider, baseUrl, effectiveKey);
      if (live && live.length > 0) {
        return { ok: true, models: live, source: 'live' as const };
      }
    }

    return { ok: true, models: curated, source: 'curated' as const };
  });

  // Teste ultrarrápido de conexão com o modelo de IA (< 1s)
  ipcMain.handle('ai:test', async (_event, payload: unknown) => {
    try {
      const data = (payload ?? {}) as {
        baseUrl?: unknown;
        model?: unknown;
        apiKey?: unknown;
      };
      const baseUrl = normalizeBaseUrl(typeof data.baseUrl === 'string' ? data.baseUrl : '');
      const model = normalizeModelName(typeof data.model === 'string' ? data.model : '');

      if (!/^https?:\/\//i.test(baseUrl)) {
        return { ok: false, error: 'URL base inválida.' };
      }
      if (!model) {
        return { ok: false, error: 'Selecione um modelo de IA antes de testar.' };
      }

      const inlineKey =
        typeof data.apiKey === 'string' && data.apiKey.trim() ? data.apiKey.trim() : null;
      if (inlineKey) {
        writeAiKey(inlineKey);
      }

      const isLocal = /localhost|127\.0\.0\.1/i.test(baseUrl);
      const apiKey = inlineKey || readAiKey();
      if (!apiKey && !isLocal) {
        return { ok: false, error: 'Nenhuma chave de API informada.' };
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      try {
        // Se for Google Gemini, usa o endpoint nativo direto com thinkingBudget: 0 (responde em ~400ms)
        if (/generativelanguage\.googleapis\.com/i.test(baseUrl) && apiKey) {
          const geminiRes = await callGeminiNative({
            apiKey,
            model,
            messages: [{ role: 'user', content: 'Oi' }],
            isTest: true,
            signal: controller.signal,
          });
          if (geminiRes.ok) {
            return { ok: true };
          }
          return {
            ok: false,
            error: formatHttpError(geminiRes.status, geminiRes.errorDetail),
          };
        }

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://boodfy.local',
          'X-Title': 'Boodfy',
        };
        if (apiKey) {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }

        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: 'Oi' }],
            max_tokens: 6,
            temperature: 0,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const detail = (await response.text().catch(() => '')).slice(0, 300);
          return { ok: false, error: formatHttpError(response.status, detail) };
        }

        return { ok: true };
      } finally {
        clearTimeout(timeout);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return {
          ok: false,
          error: 'Tempo limite esgotado (12s). Verifique sua conexão ou escolha um modelo mais rápido.',
        };
      }
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Falha ao testar conexão com o provedor.',
      };
    }
  });

  // Geração de Quiz otimizada com IA
  ipcMain.handle('ai:complete', async (_event, payload: unknown) => {
    try {
      const data = payload as { baseUrl?: unknown; model?: unknown; messages?: unknown };
      const baseUrl = normalizeBaseUrl(typeof data.baseUrl === 'string' ? data.baseUrl : '');
      const model = normalizeModelName(typeof data.model === 'string' ? data.model : '');

      if (!/^https?:\/\//i.test(baseUrl)) {
        return {
          ok: false,
          error:
            'URL base inválida. Use algo como https://generativelanguage.googleapis.com/v1beta/openai ou https://api.openai.com/v1',
        };
      }
      if (!model) {
        return { ok: false, error: 'Informe o modelo de IA na configuração.' };
      }
      if (!Array.isArray(data.messages) || data.messages.length === 0) {
        return { ok: false, error: 'Nenhuma mensagem para enviar ao provedor.' };
      }

      const messages = (data.messages as unknown[])
        .slice(0, 10)
        .map((message) => {
          const item = message as { role?: unknown; content?: unknown };
          return {
            role: typeof item.role === 'string' ? item.role : 'user',
            content: typeof item.content === 'string' ? item.content.slice(0, 30000) : '',
          };
        })
        .filter((message) => message.content.length > 0);

      const isLocal = /localhost|127\.0\.0\.1/i.test(baseUrl);
      const apiKey = readAiKey();
      if (!apiKey && !isLocal) {
        return {
          ok: false,
          error: 'Nenhuma chave de API salva. Cole sua chave de API e teste a conexão.',
        };
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 35000);

      try {
        // Caminho nativo ultrarrápido para Google Gemini (JSON direto + sem atraso de thinking)
        if (/generativelanguage\.googleapis\.com/i.test(baseUrl) && apiKey) {
          let geminiRes = await callGeminiNative({
            apiKey,
            model,
            messages,
            isTest: false,
            signal: controller.signal,
          });

          // Em caso de pico temporário (503 / 429), tenta fallback imediato para modelos leves reais
          if (!geminiRes.ok && (geminiRes.status === 503 || geminiRes.status === 429)) {
            await new Promise((resolve) => setTimeout(resolve, 600));
            const fallbacks = ['gemini-2.5-flash-lite', 'gemini-2.0-flash'].filter(
              (m) => m !== model,
            );
            for (const fb of fallbacks) {
              const fbRes = await callGeminiNative({
                apiKey,
                model: fb,
                messages,
                isTest: false,
                signal: controller.signal,
              });
              if (fbRes.ok) {
                geminiRes = fbRes;
                break;
              }
            }
          }

          if (!geminiRes.ok || !geminiRes.content) {
            return {
              ok: false,
              error: formatHttpError(geminiRes.status, geminiRes.errorDetail),
            };
          }

          return { ok: true, content: geminiRes.content };
        }

        // Caminho OpenAI / Groq / OpenRouter / Ollama
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://boodfy.local',
          'X-Title': 'Boodfy',
        };
        if (apiKey) {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }

        const doRequest = async (targetModel: string): Promise<Response> => {
          return await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              model: targetModel,
              messages,
              temperature: 0.3,
              max_tokens: 2048,
            }),
            signal: controller.signal,
          });
        };

        let response = await doRequest(model);

        if (response.status === 503 || response.status === 429) {
          await new Promise((resolve) => setTimeout(resolve, 800));
          response = await doRequest(model);
        }

        if (!response.ok) {
          const rawDetail = (await response.text().catch(() => '')).slice(0, 300);
          return { ok: false, error: formatHttpError(response.status, rawDetail) };
        }

        const json = (await response.json()) as {
          choices?: { message?: { content?: unknown } }[];
        };
        const content = json.choices?.[0]?.message?.content;
        if (typeof content !== 'string' || content.trim().length === 0) {
          return { ok: false, error: 'O provedor devolveu uma resposta vazia.' };
        }
        return { ok: true, content };
      } finally {
        clearTimeout(timeout);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return {
          ok: false,
          error:
            'A geração demorou mais que o esperado (35s). Tente um modelo mais rápido (como Flash-Lite, 2.0 Flash ou Groq).',
        };
      }
      const message = err instanceof Error ? err.message : 'Falha ao chamar o provedor de IA.';
      return { ok: false, error: message };
    }
  });

  // App info
  ipcMain.handle('app:getVersion', () => app.getVersion());
  ipcMain.handle('app:getDataPath', () => getDataPath());

  // Window controls
  ipcMain.handle('window:toggleFullscreen', () => {
    if (!mainWindow) return false;
    const isFullScreen = mainWindow.isFullScreen();
    mainWindow.setFullScreen(!isFullScreen);
    return !isFullScreen;
  });

  ipcMain.handle('window:isFullscreen', () => {
    return mainWindow?.isFullScreen() ?? false;
  });

  // Shell
  ipcMain.handle('shell:openPath', (_event, dirPath: string) => {
    if (typeof dirPath !== 'string') return;
    shell.openPath(dirPath);
  });

  ipcMain.handle('shell:openExternal', (_event, url: string) => {
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return;
    shell.openExternal(url);
  });

  // Copy PDF to managed folder
  ipcMain.handle('file:importCopy', (_event, sourcePath: string) => {
    if (typeof sourcePath !== 'string') throw new Error('Caminho inválido');
    if (!fileExists(sourcePath)) throw new Error('Arquivo não encontrado');
    const managedDir = path.join(getDataPath(), 'managed-books');
    if (!fs.existsSync(managedDir)) {
      fs.mkdirSync(managedDir, { recursive: true });
    }
    const fileName = path.basename(sourcePath);
    let destPath = path.join(managedDir, fileName);
    // Avoid overwrite
    let counter = 1;
    while (fs.existsSync(destPath)) {
      const ext = path.extname(fileName);
      const base = path.basename(fileName, ext);
      destPath = path.join(managedDir, `${base} (${counter})${ext}`);
      counter++;
    }
    fs.copyFileSync(sourcePath, destPath);
    return destPath;
  });

  ipcMain.handle('file:deleteManaged', (_event, filePath: string) => {
    if (typeof filePath !== 'string') return false;
    const managedDir = path.join(getDataPath(), 'managed-books');
    // Only delete if it's in the managed directory
    if (!filePath.startsWith(managedDir)) return false;
    try {
      fs.unlinkSync(filePath);
      return true;
    } catch {
      return false;
    }
  });

  // Cover cache handlers
  ipcMain.handle('cover:save', (_event, bookId: string, base64Data: string) => {
    if (typeof bookId !== 'string' || typeof base64Data !== 'string') return null;
    const coversDir = getCoversDir();

    const match = base64Data.match(/^data:image\/([\w+]+);base64,(.+)$/);
    if (!match) return null;

    let ext = match[1].toLowerCase();
    if (ext === 'jpeg') ext = 'jpg';
    if (ext !== 'webp' && ext !== 'png' && ext !== 'jpg') ext = 'webp';

    const buffer = Buffer.from(match[2], 'base64');
    const fileName = `${bookId}.${ext}`;
    const filePath = path.join(coversDir, fileName);

    fs.writeFileSync(filePath, buffer);
    return `bookly-cover://app/${fileName}`;
  });

  ipcMain.handle('cover:get', (_event, bookId: string) => {
    if (typeof bookId !== 'string') return null;
    const coversDir = getCoversDir();
    for (const ext of ['webp', 'png', 'jpg']) {
      const fileName = `${bookId}.${ext}`;
      const filePath = path.join(coversDir, fileName);
      if (fs.existsSync(filePath)) {
        return `bookly-cover://app/${fileName}`;
      }
    }
    return null;
  });

  ipcMain.handle('cover:delete', (_event, bookId: string) => {
    if (typeof bookId !== 'string') return false;
    const coversDir = getCoversDir();
    for (const ext of ['webp', 'png', 'jpg']) {
      const fileName = `${bookId}.${ext}`;
      const filePath = path.join(coversDir, fileName);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch {
          // ignore
        }
      }
    }
    try {
      const shortcutsDir = path.join(getDataPath(), 'shortcuts');
      for (const ext of ['ico', 'png']) {
        const iconFile = path.join(shortcutsDir, `${bookId}.${ext}`);
        if (fs.existsSync(iconFile)) {
          fs.unlinkSync(iconFile);
        }
      }
    } catch {
      // ignore
    }
    return true;
  });

  ipcMain.handle('cover:readAsDataUrl', (_event, bookId: string) => {
    if (typeof bookId !== 'string') return null;
    const coversDir = getCoversDir();
    for (const ext of ['webp', 'png', 'jpg']) {
      const fileName = `${bookId}.${ext}`;
      const filePath = path.join(coversDir, fileName);
      if (fs.existsSync(filePath)) {
        try {
          const buffer = fs.readFileSync(filePath);
          const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
          return `data:${mime};base64,${buffer.toString('base64')}`;
        } catch {
          return null;
        }
      }
    }
    return null;
  });

  // Atalho de livro na Área de Trabalho e abertura direta pelo ID
  ipcMain.handle('app:consumeLaunchBook', () => {
    const id = pendingLaunchBookId;
    pendingLaunchBookId = null;
    return id;
  });

  ipcMain.handle('shortcut:createDesktop', (_event, payload: unknown) => {
    try {
      const data = (payload ?? {}) as {
        bookId?: unknown;
        title?: unknown;
        iconDataUrl?: unknown;
      };
      const bookId = typeof data.bookId === 'string' ? data.bookId.trim() : '';
      const rawTitle = typeof data.title === 'string' ? data.title.trim() : 'Livro';
      const iconDataUrl =
        typeof data.iconDataUrl === 'string' && data.iconDataUrl.startsWith('data:image/png;base64,')
          ? data.iconDataUrl
          : null;

      if (!bookId || !/^[\w-]+$/.test(bookId)) {
        return { ok: false, error: 'Identificador do livro inválido.' };
      }

      const desktopDir = app.getPath('desktop');
      const safeTitle = sanitizeShortcutName(rawTitle);

      let customIcons: { icoPath: string; pngPath: string } | null = null;
      if (iconDataUrl) {
        customIcons = createBookShortcutIcon(bookId, iconDataUrl);
      }

      if (process.platform === 'win32') {
        const shortcutPath = path.join(desktopDir, `${safeTitle}.lnk`);
        const target = process.execPath;
        const args = app.isPackaged
          ? `--open-book=${bookId}`
          : `"${app.getAppPath()}" --open-book=${bookId}`;

        let icon = app.isPackaged ? process.execPath : getShortcutIconPath();
        if (customIcons?.icoPath && fs.existsSync(customIcons.icoPath)) {
          icon = customIcons.icoPath;
        }

        const operation = fs.existsSync(shortcutPath) ? 'replace' : 'create';

        const created = shell.writeShortcutLink(shortcutPath, operation, {
          target,
          args,
          cwd: path.dirname(process.execPath),
          description: `Abrir "${rawTitle}" no Boodfy na última página lida`,
          icon,
          iconIndex: 0,
        });

        if (!created) {
          return {
            ok: false,
            error: 'O Windows não permitiu criar o atalho na Área de Trabalho.',
          };
        }

        return { ok: true, shortcutPath };
      }

      if (process.platform === 'linux') {
        const shortcutPath = path.join(desktopDir, `${safeTitle}.desktop`);
        const execCmd = app.isPackaged
          ? `"${process.execPath}" --open-book=${bookId}`
          : `"${process.execPath}" "${app.getAppPath()}" --open-book=${bookId}`;

        let iconPath = path.join(__dirname, '../public/icon.png');
        if (customIcons?.pngPath && fs.existsSync(customIcons.pngPath)) {
          iconPath = customIcons.pngPath;
        }

        const content = [
          '[Desktop Entry]',
          'Version=1.0',
          'Type=Application',
          `Name=${safeTitle}`,
          `Comment=Abrir "${rawTitle}" no Boodfy`,
          `Exec=${execCmd}`,
          `Icon=${iconPath}`,
          'Terminal=false',
          'Categories=Education;Office;Viewer;',
          '',
        ].join('\n');

        fs.writeFileSync(shortcutPath, content, { encoding: 'utf-8', mode: 0o755 });
        fs.chmodSync(shortcutPath, 0o755);
        return { ok: true, shortcutPath };
      }

      if (process.platform === 'darwin') {
        const shortcutPath = path.join(desktopDir, `${safeTitle}.command`);
        const cmd = app.isPackaged
          ? `open -a "${process.execPath}" --args --open-book=${bookId}`
          : `"${process.execPath}" "${app.getAppPath()}" --open-book=${bookId} &`;
        const content = `#!/bin/bash\n${cmd}\n`;
        fs.writeFileSync(shortcutPath, content, { encoding: 'utf-8', mode: 0o755 });
        fs.chmodSync(shortcutPath, 0o755);
        return { ok: true, shortcutPath };
      }

      return { ok: false, error: 'Sistema operacional não suportado para criação de atalho.' };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Erro ao criar atalho na Área de Trabalho.',
      };
    }
  });
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine) => {
    const bookId = extractBookIdFromArgv(commandLine);
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
      if (bookId) {
        pendingLaunchBookId = null;
        mainWindow.webContents.send('app:open-book', bookId);
      }
    } else if (bookId) {
      pendingLaunchBookId = bookId;
    }
  });

  app.whenReady().then(() => {
    ensureDataDir();
    setupProtocol();
    setupIpcHandlers();
    createWindow();
  });
}

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
