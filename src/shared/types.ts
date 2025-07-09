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

// 사용자 설정 인터페이스
export interface AppSettings {
  captureInterval: number; // minutes (1, 5, 10, 15, 30)
  autoCapture: boolean; // 자동 캡처 활성화 여부
  storagePath: string; // 저장 경로
  theme: 'light' | 'dark'; // 테마
  maxScreenshots: number; // 세션당 최대 스크린샷 수 (기본: 100)
  screenshotQuality: 'high' | 'medium' | 'low'; // 스크린샷 품질
}

// 자동 캡처 상태 정보
export interface AutoCaptureStatus {
  isActive: boolean;
  sessionId?: string;
  interval: number; // minutes
  nextCaptureTime?: string; // ISO date string
  totalCaptured: number;
}

export interface ScreenshotData {
  id: string;
  timestamp: string; // ISO date string
  filePath: string;
  workRecordId?: string;
  isAutoCapture?: boolean; // 자동 캡처인지 수동 캡처인지 구분
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
  'auto-capture-status-changed': AutoCaptureStatus;
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
  'get-month-stats': { year: number; month: number };
  'open-screenshot': { path: string };
  'open-folder-dialog': void;
  // 자동 캡처 관련
  'start-auto-capture': { sessionId: string; interval: number };
  'stop-auto-capture': void;
  'get-auto-capture-status': void;
  // 설정 관련
  'save-settings': AppSettings;
  'load-settings': void;
  'get-default-settings': void;
}; 