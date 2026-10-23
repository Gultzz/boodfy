import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';

const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;

function getDataPath(): string {
  return app.getPath('userData');
}

function ensureDataDir(): void {
  const dataPath = getDataPath();
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
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
  // Read PDF header to get page count - simplified approach
  // The renderer will use pdf.js for accurate count
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

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'BooklyPDF',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
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
}

app.whenReady().then(() => {
  ensureDataDir();
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
