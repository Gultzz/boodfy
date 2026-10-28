import { contextBridge, ipcRenderer } from 'electron';

export interface AiModelOption {
  id: string;
  name: string;
  badge?: string;
}

export interface AiListModelsResult {
  ok: boolean;
  models: AiModelOption[];
  source: 'live' | 'curated';
  error?: string;
}

const api = {
  // Dialogs
  openFileDialog: (): Promise<string[]> => ipcRenderer.invoke('dialog:openFiles'),
  openFolderDialog: (): Promise<string | null> => ipcRenderer.invoke('dialog:openFolder'),

  // Data persistence
  readData: (filename: string): Promise<unknown> => ipcRenderer.invoke('data:read', filename),
  writeData: (filename: string, data: unknown): Promise<boolean> =>
    ipcRenderer.invoke('data:write', filename, data),

  // File operations
  fileExists: (filePath: string): Promise<boolean> => ipcRenderer.invoke('file:exists', filePath),
  readPdf: (filePath: string): Promise<ArrayBuffer> => ipcRenderer.invoke('file:readPdf', filePath),
  getPageCount: (filePath: string): Promise<number> =>
    ipcRenderer.invoke('file:getPageCount', filePath),
  scanFolder: (folderPath: string): Promise<string[]> =>
    ipcRenderer.invoke('file:scanFolder', folderPath),
  getFileName: (filePath: string): Promise<string> =>
    ipcRenderer.invoke('file:getFileName', filePath),
  relocateFile: (): Promise<string | null> => ipcRenderer.invoke('file:relocate'),
  importCopy: (sourcePath: string): Promise<string> =>
    ipcRenderer.invoke('file:importCopy', sourcePath),
  deleteManaged: (filePath: string): Promise<boolean> =>
    ipcRenderer.invoke('file:deleteManaged', filePath),

  // Cover cache
  saveCover: (bookId: string, base64Data: string): Promise<string | null> =>
    ipcRenderer.invoke('cover:save', bookId, base64Data),
  getCover: (bookId: string): Promise<string | null> =>
    ipcRenderer.invoke('cover:get', bookId),
  deleteCover: (bookId: string): Promise<boolean> =>
    ipcRenderer.invoke('cover:delete', bookId),
  readCoverAsDataUrl: (bookId: string): Promise<string | null> =>
    ipcRenderer.invoke('cover:readAsDataUrl', bookId),

  // Provedor de IA opcional (a chave fica no processo principal)
  aiSetKey: (key: string): Promise<boolean> => ipcRenderer.invoke('ai:setKey', key),
  aiHasKey: (): Promise<boolean> => ipcRenderer.invoke('ai:hasKey'),
  aiClearKey: (): Promise<boolean> => ipcRenderer.invoke('ai:clearKey'),
  aiListModels: (payload: {
    provider: string;
    baseUrl: string;
    apiKey?: string;
  }): Promise<AiListModelsResult> => ipcRenderer.invoke('ai:listModels', payload),
  aiTest: (payload: {
    baseUrl: string;
    model: string;
    apiKey?: string;
  }): Promise<{ ok: boolean; error?: string }> => ipcRenderer.invoke('ai:test', payload),
  aiComplete: (payload: {
    baseUrl: string;
    model: string;
    messages: { role: string; content: string }[];
  }): Promise<{ ok: boolean; content?: string; error?: string }> =>
    ipcRenderer.invoke('ai:complete', payload),

  // App info
  getVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion'),
  getDataPath: (): Promise<string> => ipcRenderer.invoke('app:getDataPath'),

  // Window controls
  toggleFullscreen: (): Promise<boolean> => ipcRenderer.invoke('window:toggleFullscreen'),
  isFullscreen: (): Promise<boolean> => ipcRenderer.invoke('window:isFullscreen'),

  // Shell
  openPath: (dirPath: string): Promise<void> => ipcRenderer.invoke('shell:openPath', dirPath),
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('shell:openExternal', url),

  // Atalho de livro na Área de Trabalho e abertura direta pelo ID
  consumeLaunchBook: (): Promise<string | null> => ipcRenderer.invoke('app:consumeLaunchBook'),
  onOpenBookFromShortcut: (callback: (bookId: string) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, bookId: unknown) => {
      if (typeof bookId === 'string' && bookId.trim()) {
        callback(bookId.trim());
      }
    };
    ipcRenderer.on('app:open-book', listener);
    return () => {
      ipcRenderer.removeListener('app:open-book', listener);
    };
  },
  createDesktopShortcut: (payload: {
    bookId: string;
    title: string;
  }): Promise<{ ok: boolean; shortcutPath?: string; error?: string }> =>
    ipcRenderer.invoke('shortcut:createDesktop', payload),
};

contextBridge.exposeInMainWorld('electronAPI', api);

export type ElectronAPI = typeof api;
