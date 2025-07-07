export interface WorkRecord {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime?: Date;
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
  timestamp: Date;
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
  'get-work-records': { date?: string };
  'get-screenshots': { workRecordId?: string };
  'open-screenshot': { path: string };
}; 