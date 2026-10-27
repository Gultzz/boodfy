import { app, BrowserWindow, ipcMain, dialog, shell, protocol, net, safeStorage, Menu } from 'electron';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';

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

  ipcMain.handle('ai:complete', async (_event, payload: unknown) => {
    try {
      const data = payload as { baseUrl?: unknown; model?: unknown; messages?: unknown };
      let baseUrl =
        typeof data.baseUrl === 'string' ? data.baseUrl.trim().replace(/\/+$/, '') : '';
      const model = typeof data.model === 'string' ? data.model.trim() : '';

      if (baseUrl.endsWith('/chat/completions')) {
        baseUrl = baseUrl.slice(0, -'/chat/completions'.length);
      }
      if (baseUrl.includes('generativelanguage.googleapis.com') && !baseUrl.includes('/openai')) {
        baseUrl = `${baseUrl}/openai`;
      }
      if (baseUrl.includes('api.groq.com') && !baseUrl.includes('/openai/v1')) {
        baseUrl = `${baseUrl}/openai/v1`;
      }

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
        .slice(0, 20)
        .map((message) => {
          const item = message as { role?: unknown; content?: unknown };
          return {
            role: typeof item.role === 'string' ? item.role : 'user',
            content: typeof item.content === 'string' ? item.content.slice(0, 60000) : '',
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
      const timeout = setTimeout(() => controller.abort(), 90000);

      try {
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
            body: JSON.stringify({ model: targetModel, messages, temperature: 0.3 }),
            signal: controller.signal,
          });
        };

        let response = await doRequest(model);

        // Se der 503 (servidores sobrecarregados) ou 429 temporário, faz retry rápido com backoff
        if (response.status === 503 || response.status === 429) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          response = await doRequest(model);
          if (response.status === 503 || response.status === 429) {
            await new Promise((resolve) => setTimeout(resolve, 2500));
            response = await doRequest(model);
          }
        }

        // Se ainda falhar com 503 no Gemini (alta demanda), tenta fallback para variantes flash mais leves
        if (response.status === 503 && /generativelanguage\.googleapis\.com/i.test(baseUrl)) {
          const fallbacks = ['gemini-3.5-flash-lite', 'gemini-3.6-flash'].filter((m) => m !== model);
          for (const fb of fallbacks) {
            try {
              const fbResp = await doRequest(fb);
              if (fbResp.ok) {
                response = fbResp;
                break;
              }
            } catch {
              // segue para o próximo ou resposta original
            }
          }
        }

        if (!response.ok) {
          const rawDetail = (await response.text().catch(() => '')).slice(0, 300);
          const known: Record<number, string> = {
            400: 'O provedor recusou o pedido (formato ou parâmetros inválidos).',
            401: 'Chave de API inválida ou sem permissão.',
            403: 'A chave não tem permissão para este modelo.',
            404: 'Modelo não encontrado ou descontinuado pela plataforma.',
            429: 'Limite de uso/requisições atingido no provedor. Aguarde um instante.',
            503: 'Os servidores da IA estão temporariamente em alta demanda (503). Tente novamente em instantes ou utilize Groq (Llama 3.3).',
          };
          const message = known[response.status] ?? `O provedor respondeu ${response.status}.`;
          return { ok: false, error: rawDetail ? `${message} (${rawDetail})` : message };
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
}

app.whenReady().then(() => {
  ensureDataDir();
  setupProtocol();
  setupIpcHandlers();
  createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
