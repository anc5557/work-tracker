import { desktopCapturer, nativeImage, systemPreferences, BrowserWindow, Notification } from 'electron';
import { writeFile, mkdir, readdir, stat } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { ScreenshotData, AutoCaptureStatus } from '@/shared/types';

export class ScreenshotService {
  private dataPath: string;
  private screenshotDir: string;
  private autoCaptureTimer: NodeJS.Timeout | null = null;
  private autoCaptureStatus: AutoCaptureStatus = {
    isActive: false,
    interval: 5, // 기본 5분
    totalCaptured: 0
  };

  constructor(dataPath: string) {
    this.dataPath = dataPath;
    this.screenshotDir = join(dataPath, 'screenshots');
    this.ensureDirectoryExists();
  }

  private async ensureDirectoryExists(): Promise<void> {
    try {
      await mkdir(this.screenshotDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create screenshot directory:', error);
    }
  }

  /**
   * macOS에서 화면 녹화 권한을 확인합니다.
   */
  async checkPermissions(): Promise<boolean> {
    if (process.platform === 'darwin') {
      // Electron 24+ 에서는 desktopCapturer 사용 시 자동으로 권한 요청
      // 실제 캡처를 시도해서 권한 상태를 확인
      try {
        await desktopCapturer.getSources({
          types: ['screen'],
          thumbnailSize: { width: 1, height: 1 }
        });
        return true;
      } catch (error) {
        return false;
      }
    }
    return true; // macOS가 아닌 경우 권한 확인 생략
  }

  /**
   * macOS에서 화면 녹화 권한을 요청합니다.
   */
  async requestPermissions(): Promise<boolean> {
    if (process.platform === 'darwin') {
      try {
        // desktopCapturer 호출 시 자동으로 권한 요청됨
        await desktopCapturer.getSources({
          types: ['screen'],
          thumbnailSize: { width: 1, height: 1 }
        });
        return true;
      } catch (error) {
        console.error('Failed to request screen permission:', error);
        return false;
      }
    }
    return true;
  }

  /**
   * 전체 화면 스크린샷을 캡처합니다.
   */
  async captureFullScreen(): Promise<ScreenshotData | null> {
    try {
      // 권한 확인
      const hasPermission = await this.checkPermissions();
      if (!hasPermission) {
        const granted = await this.requestPermissions();
        if (!granted) {
          throw new Error('화면 캡처 권한이 필요합니다. 시스템 환경설정에서 권한을 허용해주세요.');
        }
      }

      // 화면 소스 가져오기 - 실제 화면 해상도로 캡처
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 2560, height: 1600 }, // 더 큰 해상도로 설정
        fetchWindowIcons: false
      });

      if (sources.length === 0) {
        throw new Error('캡처할 화면을 찾을 수 없습니다.');
      }

      // 첫 번째 화면을 캡처 (기본 모니터)
      const source = sources[0];
      const image = source.thumbnail;

      // 이미지가 실제로 캡처되었는지 확인
      if (!image || image.isEmpty()) {
        throw new Error('스크린샷 캡처에 실패했습니다. 화면 녹화 권한을 확인해주세요.');
      }

      // 파일명과 경로 생성
      const timestamp = new Date();
      const filename = `screenshot_${timestamp.toISOString().replace(/[:.]/g, '-')}.png`;
      const filePath = join(this.screenshotDir, filename);

      // PNG 파일로 저장
      const buffer = image.toPNG();
      
      // 버퍼가 실제로 데이터를 포함하는지 확인
      if (buffer.length === 0) {
        throw new Error('스크린샷 데이터가 비어있습니다.');
      }

      await writeFile(filePath, buffer);

      const screenshotData: ScreenshotData = {
        id: uuidv4(),
        timestamp: timestamp.toISOString(),
        filePath,
      };

      console.log(`Screenshot captured: ${filePath} (${buffer.length} bytes)`);
      return screenshotData;

    } catch (error) {
      console.error('Failed to capture screenshot:', error);
      throw error;
    }
  }

  /**
   * 특정 영역의 스크린샷을 캡처합니다.
   */
  async captureRegion(x: number, y: number, width: number, height: number): Promise<ScreenshotData | null> {
    try {
      const fullScreenshot = await this.captureFullScreen();
      if (!fullScreenshot) {
        return null;
      }

      // 전체 스크린샷에서 특정 영역 자르기
      const fullImage = nativeImage.createFromPath(fullScreenshot.filePath);
      const croppedImage = fullImage.crop({ x, y, width, height });

      // 새 파일명 생성
      const timestamp = new Date();
      const filename = `screenshot_region_${timestamp.toISOString().replace(/[:.]/g, '-')}.png`;
      const filePath = join(this.screenshotDir, filename);

      // 자른 이미지 저장
      const buffer = croppedImage.toPNG();
      await writeFile(filePath, buffer);

      return {
        id: uuidv4(),
        timestamp: timestamp.toISOString(),
        filePath,
      };

    } catch (error) {
      console.error('Failed to capture region screenshot:', error);
      throw error;
    }
  }

  /**
   * 스크린샷 파일들을 정리합니다 (오래된 파일 삭제 등)
   */
  async cleanupOldScreenshots(olderThanDays: number = 30): Promise<void> {
    // TODO: 구현 필요 (나중에 추가)
  }

  /**
   * 자동 캡처를 시작합니다.
   */
  async startAutoCapture(sessionId: string, intervalMinutes: number = 5, existingCount: number = 0): Promise<boolean> {
    try {
      // 이미 실행 중인 자동 캡처가 있다면 정지
      if (this.autoCaptureTimer) {
        this.stopAutoCapture();
      }

      // 권한 확인
      const hasPermission = await this.checkPermissions();
      if (!hasPermission) {
        const granted = await this.requestPermissions();
        if (!granted) {
          throw new Error('화면 캡처 권한이 필요합니다.');
        }
      }

      const intervalMs = intervalMinutes * 60 * 1000; // 분을 밀리초로 변환
      
      // 상태 업데이트 - 기존 스크린샷 수를 포함
      this.autoCaptureStatus = {
        isActive: true,
        sessionId,
        interval: intervalMinutes,
        nextCaptureTime: new Date(Date.now() + intervalMs).toISOString(),
        totalCaptured: existingCount
      };

      // 자동 캡처 타이머 시작
      this.autoCaptureTimer = setInterval(async () => {
        try {
          await this.performAutoCapture(sessionId);
        } catch (error) {
          console.error('Auto capture failed:', error);
          // 에러가 발생해도 타이머는 계속 실행
        }
      }, intervalMs);

      console.log(`Auto capture started for session ${sessionId}, interval: ${intervalMinutes} minutes, existing screenshots: ${existingCount}`);
      
      // 상태 변경을 렌더러에 알림
      this.notifyStatusChange();
      
      return true;
    } catch (error) {
      console.error('Failed to start auto capture:', error);
      this.autoCaptureStatus.isActive = false;
      return false;
    }
  }

  /**
   * 자동 캡처를 정지합니다.
   */
  stopAutoCapture(): void {
    if (this.autoCaptureTimer) {
      clearInterval(this.autoCaptureTimer);
      this.autoCaptureTimer = null;
    }

    this.autoCaptureStatus = {
      isActive: false,
      interval: this.autoCaptureStatus.interval,
      totalCaptured: this.autoCaptureStatus.totalCaptured
    };

    console.log('Auto capture stopped');
    
    // 상태 변경을 렌더러에 알림
    this.notifyStatusChange();
  }

  /**
   * 자동 캡처 상태를 반환합니다.
   */
  getAutoCaptureStatus(): AutoCaptureStatus {
    return { ...this.autoCaptureStatus };
  }

  /**
   * 실제 자동 캡처를 수행합니다.
   */
  private async performAutoCapture(sessionId: string): Promise<ScreenshotData | null> {
    try {
      const screenshot = await this.captureFullScreen();
      if (screenshot) {
        // 자동 캡처임을 표시
        screenshot.isAutoCapture = true;
        screenshot.workRecordId = sessionId;
        
        this.autoCaptureStatus.totalCaptured++;
        this.autoCaptureStatus.nextCaptureTime = new Date(
          Date.now() + this.autoCaptureStatus.interval * 60 * 1000
        ).toISOString();

        // 상태 변경을 렌더러에 알림
        this.notifyStatusChange();
        
        // 스크린샷 캡처 이벤트를 렌더러에 전송
        this.sendToRenderer('screenshot-captured', screenshot);
        
        // 작업 변경 알림 전송
        this.sendWorkChangeNotification(screenshot);
        
        console.log(`Auto screenshot captured: ${screenshot.filePath}`);
        return screenshot;
      }
      return null;
    } catch (error) {
      console.error('Auto capture failed:', error);
      throw error;
    }
  }

  /**
   * 작업 변경 알림을 macOS 시스템 알림으로 전송합니다.
   */
  private sendWorkChangeNotification(screenshot: ScreenshotData): void {
    this.showDesktopNotification(screenshot);
  }

  /**
   * macOS 데스크톱 알림을 표시합니다.
   */
  private showDesktopNotification(screenshot: ScreenshotData): void {
    // 알림 권한 확인
    if (!Notification.isSupported()) {
      console.log('시스템 알림이 지원되지 않습니다.');
      return;
    }

    // macOS에서 코드 서명된 앱인지 확인 (프로덕션에서는 버튼 표시 가능)
    const isSignedApp = process.platform === 'darwin' && process.env.NODE_ENV === 'production';
    
    const notificationOptions = {
      title: '🔄 작업 변경 확인',
      body: isSignedApp 
        ? '현재 작업이 변경되었습니까?\n아래 버튼을 클릭하여 선택하세요.'
        : '현재 작업이 변경되었습니까?\n• 알림 클릭 → 새 작업 시작\n• 무시 → 계속 진행',
      icon: process.platform === 'darwin' ? undefined : undefined,
      sound: 'Ping',
      urgency: 'normal' as const,
      actions: isSignedApp ? [
        { type: 'button' as const, text: '새 작업 시작' },
        { type: 'button' as const, text: '계속 진행' }
      ] : [],
      hasReply: false,
      timeoutType: 'default' as const
    };

    const notification = new Notification(notificationOptions);

    // 알림 클릭 이벤트 (버튼이 없는 경우에만 새 작업 시작)
    notification.on('click', () => {
      console.log('Notification clicked');
      if (!isSignedApp) {
        // 버튼이 없는 개발 환경에서는 클릭 시 새 작업 시작
        console.log('Starting new work (no buttons available)');
        this.handleNotificationResponse('new-work', screenshot);
      } else {
        // 버튼이 있는 환경에서는 단순히 앱을 포그라운드로
        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (mainWindow && !mainWindow.isDestroyed()) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.focus();
          mainWindow.show();
        }
      }
    });

    // 액션 버튼 클릭 이벤트 (서명된 앱에서만 동작)
    notification.on('action', (event, index) => {
      console.log('Notification action clicked:', index);
      if (index === 0) {
        // "새 작업 시작" 클릭
        this.handleNotificationResponse('new-work', screenshot);
      } else if (index === 1) {
        // "계속 진행" 클릭
        this.handleNotificationResponse('continue', screenshot);
      }
    });

    // 알림 닫힘 이벤트
    notification.on('close', () => {
      console.log('Notification closed - continuing current work');
      // 닫힘은 "계속 진행"으로 처리
      this.handleNotificationResponse('continue', screenshot);
    });

    notification.show();
    console.log('Desktop notification shown');
  }

  /**
   * 알림 응답을 처리합니다.
   */
  private handleNotificationResponse(action: 'new-work' | 'continue' | 'stop', screenshot: ScreenshotData): void {
    console.log('Handling notification response:', action);
    
    // 응답을 렌더러에 전송
    this.sendToRenderer('notification-response', {
      action,
      screenshot,
      timestamp: new Date().toISOString()
    });

    // 앱을 포그라운드로 가져오기 (새 작업 시작 시)
    if (action === 'new-work') {
      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isMinimized()) {
          mainWindow.restore();
        }
        mainWindow.focus();
        mainWindow.show();
      }
    }
  }

  /**
   * 수동 스크린샷 캡처 시 카운트를 증가시킵니다.
   */
  incrementCaptureCount(): void {
    console.log('incrementCaptureCount called, current status:', this.autoCaptureStatus);
    if (this.autoCaptureStatus.isActive) {
      this.autoCaptureStatus.totalCaptured++;
      console.log('Manual capture count incremented to:', this.autoCaptureStatus.totalCaptured);
      this.notifyStatusChange();
    } else {
      console.log('Auto capture not active, not incrementing count');
    }
  }

  /**
   * 상태 변경을 렌더러에 알립니다.
   */
  private notifyStatusChange(): void {
    this.sendToRenderer('auto-capture-status-changed', this.autoCaptureStatus);
  }

  /**
   * 렌더러에 이벤트를 전송합니다.
   */
  private sendToRenderer(event: string, data: any): void {
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(event, data);
    }
  }
} 