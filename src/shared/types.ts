export interface WorkRecord {
  id: string;
  title: string;
  description?: string;
  startTime: string; // ISO date string
  endTime?: string; // ISO date string
  screenshotPath?: string;
  tags: string[];
  isActive: boolean;
  duration?: number; // milliseconds
}

export interface DayWorkSummary {
  date: string; // YYYY-MM-DD format
  records: WorkRecord[];
  totalDuration: number;
  totalRecords: number;
}

export interface AppConfig {
  screenshotInterval: number; // minutes
  autoSave: boolean;
  dataPath: string;
  theme: 'light' | 'dark' | 'system';
}

export interface ScreenshotData {
  id: string;
  timestamp: string; // ISO date string
  filePath: string;
  workRecordId?: string;
}

// IPC 통신용 타입
export interface IpcMessage<T = any> {
  type: string;
  payload?: T;
}

// Main -> Renderer 이벤트
export type MainToRendererEvents = {
  'screenshot-captured': ScreenshotData;
  'work-record-updated': WorkRecord;
  'error-occurred': { message: string; details?: any };
};

// Renderer -> Main 요청
export type RendererToMainRequests = {
  'capture-screenshot': void;
  'start-work': { title: string; description?: string };
  'stop-work': { id: string };
  'save-work-record': WorkRecord;
  'delete-work-record': { id: string };
  'get-work-records': { date?: string };
  'get-work-record': { id: string };
  'get-active-session': void;
  'get-screenshots': { workRecordId?: string };
  'get-session-screenshots': { sessionId: string };
  'get-work-stats': { timeRange: 'week' | 'month' | 'year' };
  'open-screenshot': { path: string };
  'open-folder-dialog': void;
}; 