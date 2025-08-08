// 활동 타임라인 항목
export interface ActivityTimelineItem {
  id: string;
  type: 'work' | 'rest' | 'resume' | 'pause'; // 업무, 휴식 시작, 업무 재개, 업무 중지
  timestamp: string; // ISO date string
  duration?: number; // 해당 활동의 지속 시간 (밀리초, rest일 때만 사용)
  description?: string; // 활동 설명
}

export interface WorkRecord {
  id: string;
  title: string;
  description?: string;
  startTime: string; // ISO date string
  endTime?: string; // ISO date string
  screenshotPath?: string;
  tags: string[];
  isActive: boolean;
  isPaused?: boolean; // 중지 상태 여부
  duration?: number; // milliseconds
  timeline?: ActivityTimelineItem[]; // 활동 타임라인
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
  recentTagsLimit: number; // 최근 태그 기억 개수 (기본: 10, 최소: 3, 최대: 50)
  // 자동 휴식 감지 설정
  autoRestEnabled: boolean; // 자동 휴식 감지 활성화 여부 (기본: true)
  autoRestIdleTime: number; // 휴식 상태로 전환되는 대기 시간(분) (기본: 5)
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

// 자동 휴식 감지 상태 정보
export interface AutoRestStatus {
  enabled: boolean; // 자동 휴식 감지 활성화 여부
  isResting: boolean; // 현재 휴식 중인지 여부
  idleTime: number; // 설정된 대기 시간 (분)
  lastActivityTime?: string; // 마지막 활동 시간 (ISO date string)
  restStartTime?: string; // 휴식 시작 시간 (ISO date string)
  timeUntilRest?: number; // 휴식까지 남은 시간 (초)
}

// 자동 휴식 이벤트 타입
export type AutoRestEventType = 'rest-started' | 'rest-ended' | 'activity-detected';

// 자동 휴식 이벤트 정보
export interface AutoRestEvent {
  type: AutoRestEventType;
  timestamp: string; // ISO date string
  duration?: number; // 휴식 기간 (밀리초, rest-ended일 때만)
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
  'work-change-notification': { 
    screenshot: ScreenshotData; 
    timestamp: string; 
  };
  'notification-response': {
    action: 'new-work' | 'continue' | 'stop';
    screenshot: ScreenshotData;
    timestamp: string;
  };
  'notification-clicked': {
    screenshot: ScreenshotData;
    timestamp: string;
  };
  'stop-current-session': void;
  'pause-current-session': void;
  'resume-current-session': void;
  'start-new-session-from-tray': void;
  // 자동 휴식 관련 이벤트
  'auto-rest-status-changed': AutoRestStatus;
  'auto-rest-event': AutoRestEvent;
  // 앱 업데이트 관련 이벤트
  'update-available': { version: string; releaseNotes?: string | null };
  'update-not-available': { version: string };
  'update-error': { message: string };
  'update-progress': { percent: number; transferred: number; total: number };
  'update-downloaded': { version: string };
};

// Renderer -> Main 요청
export type RendererToMainRequests = {
  'capture-screenshot': { sessionId?: string };
  'start-work': { title: string; description?: string; tags?: string[] };
  'stop-work': { id: string };
  'pause-work': { id: string }; // 업무 중지
  'resume-work': { id: string }; // 업무 재개
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
  'load-image': string;
  // 자동 캡처 관련
  'start-auto-capture': { sessionId: string; interval: number };
  'stop-auto-capture': void;
  'get-auto-capture-status': void;
  // 설정 관련
  'save-settings': AppSettings;
  'load-settings': void;
  'get-default-settings': void;
  // 트레이 업데이트 관련
  'session-status-changed': void;
  // 최근 태그 조회
  'get-recent-tags': { limit?: number };
  // 태그별 레포트 조회
  'get-tag-reports': { 
    timeRange: 'today' | 'week' | 'month' | 'custom'; 
    startDate?: string; 
    endDate?: string; 
  };
  // 자동 휴식 관련 요청
  'get-auto-rest-status': void;
  'update-auto-rest-settings': { enabled: boolean; idleTime: number };
  'reset-activity-timer': void; // 활동 타이머 리셋 (수동으로 활동 상태로 변경)
  // 앱 업데이트 관련 요청
  'check-for-updates': void;
  'download-update': void;
  'quit-and-install': void;
};

// 태그별 레포트 관련 타입
export interface TagStats {
  tag: string;
  totalDuration: number; // milliseconds
  recordCount: number;
  percentage: number; // 전체 대비 비율 (0-100)
  records: WorkRecord[]; // 해당 태그가 포함된 업무 기록들
}

export interface TagReportData {
  totalDuration: number; // 전체 기간 총 시간
  totalRecords: number; // 전체 기록 수
  tagStats: TagStats[]; // 태그별 통계
  timeRange: 'today' | 'week' | 'month' | 'custom';
  startDate: string;
  endDate: string;
}

export interface TagFilterOptions {
  searchQuery: string;
  selectedTags: string[];
  sortBy: 'duration' | 'count' | 'name';
  sortOrder: 'asc' | 'desc';
} 