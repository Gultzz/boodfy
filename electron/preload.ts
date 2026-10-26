import { contextBridge, ipcRenderer } from 'electron';

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

  // App info
  getVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion'),
  getDataPath: (): Promise<string> => ipcRenderer.invoke('app:getDataPath'),

  // Window controls
  toggleFullscreen: (): Promise<boolean> => ipcRenderer.invoke('window:toggleFullscreen'),
  isFullscreen: (): Promise<boolean> => ipcRenderer.invoke('window:isFullscreen'),

  // Shell
  openPath: (dirPath: string): Promise<void> => ipcRenderer.invoke('shell:openPath', dirPath),
};

contextBridge.exposeInMainWorld('electronAPI', api);

export type ElectronAPI = typeof api;
