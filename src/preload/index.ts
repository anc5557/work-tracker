import { contextBridge, ipcRenderer } from 'electron';
import type { RendererToMainRequests, MainToRendererEvents } from '@/shared/types';

// Renderer에서 사용할 API 정의
export interface ElectronAPI {
  // Main Process와의 통신
  invoke<K extends keyof RendererToMainRequests>(
    channel: K,
    data?: RendererToMainRequests[K]
  ): Promise<any>;

  // Main Process에서 오는 이벤트 리스너
  on<K extends keyof MainToRendererEvents>(
    channel: K,
    callback: (data: MainToRendererEvents[K]) => void
  ): void;

  // 이벤트 리스너 제거
  removeAllListeners(channel: string): void;

  // 앱 제어
  closeApp(): void;
  minimizeApp(): void;
  
  // 파일 시스템
  openExternal(url: string): Promise<void>;
  showItemInFolder(path: string): Promise<any>;
  // 업데이트
  checkForUpdates(): Promise<any>;
  downloadUpdate(): Promise<any>;
  quitAndInstall(): Promise<any>;
}

// Context Bridge로 API 노출
const electronAPI: ElectronAPI = {
  invoke: (channel, data) => ipcRenderer.invoke(channel, data),
  on: (channel, callback) => {
    ipcRenderer.on(channel, (_, data) => callback(data));
  },
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
  closeApp: () => ipcRenderer.invoke('app-close'),
  minimizeApp: () => ipcRenderer.invoke('app-minimize'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  showItemInFolder: (path) => ipcRenderer.invoke('show-item-in-folder', path),
  // 업데이트
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
};

// Context Bridge 등록
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// TypeScript용 전역 타입 확장
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
} 