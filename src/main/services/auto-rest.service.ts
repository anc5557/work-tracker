import { BrowserWindow, globalShortcut, powerMonitor, Notification } from 'electron';
import type { AutoRestStatus, AutoRestEvent, AutoRestEventType } from '@/shared/types';

export class AutoRestService {
  private status: AutoRestStatus = {
    enabled: true,
    isResting: false,
    idleTime: 5, // 기본 5분
  };

  private idleTimer: NodeJS.Timeout | null = null;
  private activityCheckInterval: NodeJS.Timeout | null = null;
  private lastActivityTime: number = Date.now();
  private eventCallbacks: ((event: AutoRestEvent) => void)[] = [];

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    // 시스템 유휴 시간 감지를 지원하는지 확인하고 활동 모니터링 시작
    try {
      // powerMonitor.getSystemIdleTime()이 작동하는지 테스트
      powerMonitor.getSystemIdleTime();
      this.startActivityMonitoring();
    } catch (error) {
      console.warn('System idle time monitoring not supported, falling back to periodic check:', error);
      // 대안: 주기적으로 시스템 상태 확인
      this.startPeriodicCheck();
    }

    // 앱 포커스 이벤트 감지 (간접적인 활동 감지)
    this.registerAppEvents();
  }

  /**
   * 활동 모니터링을 시작합니다.
   */
  private startActivityMonitoring(): void {
    // 10초마다 시스템 유휴 시간 확인
    this.activityCheckInterval = setInterval(() => {
      if (!this.status.enabled) return;

      try {
        // macOS에서 시스템 유휴 시간 확인 (초 단위)
        const idleTimeSeconds = powerMonitor.getSystemIdleTime();
        const idleThresholdSeconds = this.status.idleTime * 60; // 분을 초로 변환

        if (idleTimeSeconds >= idleThresholdSeconds && !this.status.isResting) {
          // 휴식 상태로 전환
          this.startRest();
        } else if (idleTimeSeconds < 30 && this.status.isResting) {
          // 30초 이내 활동이 감지되면 휴식 종료
          this.endRest();
        }

        // 상태 업데이트
        this.updateActivityTime(idleTimeSeconds);
      } catch (error) {
        console.error('Failed to check system idle time:', error);
        
        // macOS 권한 관련 에러인 경우 안내
        if (process.platform === 'darwin') {
          console.warn('macOS system access permission may be required for activity monitoring. Please check System Preferences > Security & Privacy > Privacy > Accessibility and allow Work Tracker.');
        }
        
        // 시스템 유휴 시간 확인 실패 시 대안 방법 사용
        this.fallbackToManualTracking();
      }
    }, 10000); // 10초마다 확인
  }

  /**
   * 주기적 체크 (시스템 유휴 시간 API를 사용할 수 없는 경우)
   */
  private startPeriodicCheck(): void {
    this.activityCheckInterval = setInterval(() => {
      if (!this.status.enabled) return;

      const now = Date.now();
      const timeSinceLastActivity = now - this.lastActivityTime;
      const idleThresholdMs = this.status.idleTime * 60 * 1000;

      if (timeSinceLastActivity >= idleThresholdMs && !this.status.isResting) {
        this.startRest();
      }

      this.updateTimeUntilRest();
    }, 10000); // 10초마다 확인
  }

  /**
   * 앱 이벤트 등록 (간접적인 활동 감지)
   */
  private registerAppEvents(): void {
    // 앱 포커스 이벤트 감지
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(window => {
      window.on('focus', () => {
        this.recordActivity();
      });

      window.on('blur', () => {
        // 창이 포커스를 잃었을 때는 특별한 처리 없음
      });

      // 웹 컨텐츠에서의 활동 감지
      window.webContents.on('before-input-event', () => {
        this.recordActivity();
      });
    });

    // 글로벌 단축키를 사용한 활동 감지 (제한적)
    try {
      // 일반적으로 사용되는 키들을 감지
      const commonKeys = ['CommandOrControl+C', 'CommandOrControl+V', 'CommandOrControl+X', 'CommandOrControl+Z'];
      commonKeys.forEach(key => {
        globalShortcut.register(key, () => {
          this.recordActivity();
        });
      });
    } catch (error) {
      console.warn('Failed to register global shortcuts for activity detection:', error);
    }
  }

  /**
   * 시스템 유휴 시간 API 실패 시 수동 추적으로 전환
   */
  private fallbackToManualTracking(): void {
    console.log('Falling back to manual activity tracking');
    if (this.activityCheckInterval) {
      clearInterval(this.activityCheckInterval);
    }
    this.startPeriodicCheck();
  }

  /**
   * 활동을 기록합니다.
   */
  private recordActivity(): void {
    const now = Date.now();
    this.lastActivityTime = now;

    if (this.status.isResting) {
      this.endRest();
    }

    this.status.lastActivityTime = new Date(now).toISOString();
    this.updateTimeUntilRest();
    this.notifyStatusChange();

    // 활동 감지 이벤트 발생
    this.emitEvent({
      type: 'activity-detected',
      timestamp: new Date(now).toISOString()
    });
  }

  /**
   * 활동 시간을 업데이트합니다.
   */
  private updateActivityTime(systemIdleSeconds: number): void {
    const now = Date.now();
    this.lastActivityTime = now - (systemIdleSeconds * 1000);
    this.status.lastActivityTime = new Date(this.lastActivityTime).toISOString();
    this.updateTimeUntilRest();
  }

  /**
   * 휴식까지 남은 시간을 업데이트합니다.
   */
  private updateTimeUntilRest(): void {
    if (!this.status.enabled || this.status.isResting) {
      this.status.timeUntilRest = undefined;
      return;
    }

    const now = Date.now();
    const timeSinceLastActivity = now - this.lastActivityTime;
    const idleThresholdMs = this.status.idleTime * 60 * 1000;
    const timeUntilRestMs = idleThresholdMs - timeSinceLastActivity;

    if (timeUntilRestMs > 0) {
      this.status.timeUntilRest = Math.floor(timeUntilRestMs / 1000);
    } else {
      this.status.timeUntilRest = 0;
    }
  }

  /**
   * 휴식을 시작합니다.
   */
  private startRest(): void {
    if (this.status.isResting) return;

    const now = new Date();
    this.status.isResting = true;
    this.status.restStartTime = now.toISOString();
    this.status.timeUntilRest = undefined;

    console.log('Auto rest started');

    // macOS 알림 표시
    this.showNotification(
      '휴식 시작',
      '일정 시간 활동이 감지되지 않아 휴식 상태로 전환되었습니다.',
      'rest-started'
    );

    // 휴식 시작 이벤트 발생
    this.emitEvent({
      type: 'rest-started',
      timestamp: now.toISOString()
    });

    this.notifyStatusChange();
  }

  /**
   * 휴식을 종료합니다.
   */
  private endRest(): void {
    if (!this.status.isResting) return;

    const now = new Date();
    const restStartTime = this.status.restStartTime ? new Date(this.status.restStartTime) : now;
    const restDuration = now.getTime() - restStartTime.getTime();

    this.status.isResting = false;
    this.status.restStartTime = undefined;
    this.status.timeUntilRest = undefined;

    console.log(`Auto rest ended, duration: ${Math.floor(restDuration / 1000)}s`);

    // macOS 알림 표시
    const durationMinutes = Math.floor(restDuration / (1000 * 60));
    this.showNotification(
      '업무 재개',
      `${durationMinutes}분간 휴식 후 업무를 재개합니다.`,
      'rest-ended'
    );

    // 휴식 종료 이벤트 발생
    this.emitEvent({
      type: 'rest-ended',
      timestamp: now.toISOString(),
      duration: restDuration
    });

    this.notifyStatusChange();
  }

  /**
   * macOS 알림을 표시합니다.
   */
  private showNotification(title: string, body: string, type: AutoRestEventType): void {
    try {
      if (!Notification.isSupported()) {
        console.warn('Notifications are not supported on this system');
        return;
      }

      const notification = new Notification({
        title,
        body,
        silent: false,
        urgency: 'normal'
      });

      notification.show();

      notification.on('click', () => {
        // 알림 클릭 시 앱 창을 포커스
        const windows = BrowserWindow.getAllWindows();
        if (windows.length > 0) {
          const window = windows[0];
          if (window.isMinimized()) {
            window.restore();
          }
          window.focus();
        }
      });
    } catch (error) {
      console.error('Failed to show notification:', error);
      
      // macOS 권한 관련 에러인 경우 더 구체적인 안내
      if (process.platform === 'darwin') {
        console.warn('macOS notification permission may be required. Please check System Preferences > Security & Privacy > Privacy > Notifications and allow Work Tracker.');
      }
    }
  }

  /**
   * 이벤트를 발생시킵니다.
   */
  private emitEvent(event: AutoRestEvent): void {
    this.eventCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in auto rest event callback:', error);
      }
    });
  }

  /**
   * 상태 변경을 알립니다.
   */
  private notifyStatusChange(): void {
    // 상태가 변경되었을 때 렌더러 프로세스에 알림
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(window => {
      window.webContents.send('auto-rest-status-changed', this.status);
    });
  }

  /**
   * 이벤트 콜백을 등록합니다.
   */
  public onEvent(callback: (event: AutoRestEvent) => void): void {
    this.eventCallbacks.push(callback);
  }

  /**
   * 이벤트 콜백을 제거합니다.
   */
  public removeEventCallback(callback: (event: AutoRestEvent) => void): void {
    const index = this.eventCallbacks.indexOf(callback);
    if (index > -1) {
      this.eventCallbacks.splice(index, 1);
    }
  }

  /**
   * 현재 상태를 반환합니다.
   */
  public getStatus(): AutoRestStatus {
    this.updateTimeUntilRest();
    return { ...this.status };
  }

  /**
   * 설정을 업데이트합니다.
   */
  public updateSettings(enabled: boolean, idleTime: number): void {
    const wasEnabled = this.status.enabled;
    
    this.status.enabled = enabled;
    this.status.idleTime = idleTime;

    if (enabled && !wasEnabled) {
      // 활성화된 경우
      this.lastActivityTime = Date.now();
      this.status.lastActivityTime = new Date().toISOString();
    } else if (!enabled && this.status.isResting) {
      // 비활성화된 경우 휴식 상태 해제
      this.endRest();
    }

    this.notifyStatusChange();
    console.log(`Auto rest settings updated: enabled=${enabled}, idleTime=${idleTime}min`);
  }

  /**
   * 활동 타이머를 수동으로 리셋합니다.
   */
  public resetActivityTimer(): void {
    this.recordActivity();
  }

  /**
   * 서비스를 종료합니다.
   */
  public destroy(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }

    if (this.activityCheckInterval) {
      clearInterval(this.activityCheckInterval);
      this.activityCheckInterval = null;
    }

    // 글로벌 단축키 해제
    try {
      globalShortcut.unregisterAll();
    } catch (error) {
      console.error('Failed to unregister global shortcuts:', error);
    }

    this.eventCallbacks = [];
    console.log('Auto rest service destroyed');
  }
}