import { app, BrowserWindow, Menu, Tray, nativeImage, session, Notification } from 'electron';
import { join } from 'path';
import { IpcHandlers } from './ipc/handlers';

class WorkTrackerApp {
  private mainWindow: BrowserWindow | null = null;
  private tray: Tray | null = null;
  private ipcHandlers: IpcHandlers;
  private dataPath: string;
  private trayUpdateInterval: NodeJS.Timeout | null = null;
  private trayMenuUpdateInterval: NodeJS.Timeout | null = null;
  private static instance: WorkTrackerApp | null = null;

  constructor() {
    this.dataPath = join(app.getPath('userData'), 'work-tracker-data');
    this.ipcHandlers = new IpcHandlers(this.dataPath);
    
    // 트레이 업데이트 콜백 설정
    this.ipcHandlers.setTrayUpdateCallback(() => {
      this.updateTrayTitle();
    });
    
    WorkTrackerApp.instance = this;
    this.setupApp();
  }

  public static getInstance(): WorkTrackerApp | null {
    return WorkTrackerApp.instance;
  }

  /**
   * 외부에서 트레이 타이틀을 즉시 업데이트할 수 있는 메서드
   */
  public forceUpdateTrayTitle(): void {
    if (this.tray && !this.tray.isDestroyed()) {
      this.updateTrayTitle().catch(error => {
        console.error('Failed to force update tray title:', error);
      });
    }
  }

  private setupApp(): void {
    // macOS에서 모든 창이 닫혀도 앱을 종료하지 않음
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', () => {
      // macOS에서 독 아이콘 클릭 시 창 다시 열기
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createMainWindow();
      }
    });

    app.whenReady().then(async () => {
      this.setupContentSecurityPolicy();
      this.requestNotificationPermission();
      this.setupMacOSApp();
      this.createMainWindow();
      this.createTray();
      this.createMenu();
      this.startTrayUpdater();
      
      // 자동 휴식 서비스 초기화
      await this.ipcHandlers.initializeAutoRest();
    });

    // 앱 종료 시 정리
    app.on('before-quit', () => {
      // 먼저 인터벌 정리
      if (this.trayUpdateInterval) {
        clearInterval(this.trayUpdateInterval);
        this.trayUpdateInterval = null;
      }
      if (this.trayMenuUpdateInterval) {
        clearInterval(this.trayMenuUpdateInterval);
        this.trayMenuUpdateInterval = null;
      }
      
      // 그 다음 트레이 파괴
      if (this.tray && !this.tray.isDestroyed()) {
        this.tray.destroy();
        this.tray = null;
      }
      
      // 자동 휴식 서비스 정리
      this.ipcHandlers.destroy();
    });
  }

  private setupMacOSApp(): void {
    if (process.platform === 'darwin') {
      // macOS 앱 이름 설정
      app.setName('Work Tracker');
      
      // 독 아이콘 설정
      if (app.dock) {
        const dockIcon = this.getAppIcon();
        app.dock.setIcon(dockIcon);
      }
      
      // 앱 아이콘을 명시적으로 설정
      app.setAppUserModelId('com.worktracker.app');
    }
  }

  private setupContentSecurityPolicy(): void {
    const isDev = process.env.NODE_ENV === 'development';
    
    // 개발 환경에서는 HMR과 eval을 위해 더 완화된 CSP 사용
    const cspHeader = isDev 
      ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:*; script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:*; style-src 'self' 'unsafe-inline' http://localhost:*; img-src 'self' data: file: http://localhost:*; connect-src 'self' http://localhost:* ws://localhost:*;"
      : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: file:; connect-src 'self';";

    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [cspHeader]
        }
      });
    });
  }

  private createMainWindow(): void {
    // 메인 윈도우 생성
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      titleBarStyle: 'hidden', // hiddenInset에서 hidden으로 변경
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, '../preload/preload.js'),
        webSecurity: true,
        // CSP 설정
        experimentalFeatures: false
      },
      show: false, // 로딩 완료 후 보이기
      icon: this.getAppIcon()
    });

    // 개발 환경에서는 webpack-dev-server 주소, 프로덕션에서는 빌드된 파일
    // app.isPackaged는 앱이 패키징되었는지 확인 (개발 시 false, 패키징 시 true)
    // 하지만 여기서는 webpack dev server의 존재로 개발/프로덕션을 구분
    const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');
    const isDevServer = !app.isPackaged && !process.argv.includes('--prod');
    
    if (isDev && isDevServer) {
      this.mainWindow.loadURL('http://localhost:3000');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
    }

    // 윈도우 이벤트
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
      
      // 개발 환경에서는 즉시 포커스
      if (isDev) {
        this.mainWindow?.focus();
      }
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // 윈도우가 최소화될 때의 동작은 기본 동작을 사용

    this.mainWindow.on('close', (event) => {
      if (process.platform === 'darwin') {
        // macOS에서는 창을 숨기기만 함
        event.preventDefault();
        this.mainWindow?.hide();
      }
    });
  }

  private createTray(): void {
    const trayIcon = this.getTrayIcon();
    this.tray = new Tray(trayIcon);
    
    // 초기 트레이 메뉴 설정
    this.updateTrayMenu();

    this.tray.setToolTip('Work Tracker');

    // 트레이 아이콘 클릭 시 메인 윈도우 토글
    this.tray.on('click', () => {
      if (this.mainWindow) {
        if (this.mainWindow.isVisible()) {
          this.mainWindow.hide();
        } else {
          this.mainWindow.show();
          this.mainWindow.focus();
        }
      } else {
        this.createMainWindow();
      }
    });
  }

  /**
   * 트레이 메뉴를 활성 세션 상태에 따라 동적으로 업데이트합니다.
   */
  private async updateTrayMenu(): Promise<void> {
    if (!this.tray || this.tray.isDestroyed()) return;

    try {
      const result = await this.ipcHandlers.getActiveSession();
      const isSessionActive = result.success && result.data && result.data.isActive;
      
      const sessionMenuItems: Electron.MenuItemConstructorOptions[] = [];
      
      if (isSessionActive) {
        // 활성 세션이 있는 경우 - 일시정지 상태에 따라 다른 메뉴 제공
        const activeSession = result.data;
        const isPaused = activeSession.isPaused;
        
        if (isPaused) {
          // 일시정지 상태 - 재개 옵션 제공
          sessionMenuItems.push(
            {
              label: '업무 재개',
              click: () => {
                this.sendToRenderer('resume-current-session');
              }
            },
            {
              label: '현재 세션 중지',
              click: () => {
                this.sendToRenderer('stop-current-session');
              }
            },
            {
              type: 'separator'
            }
          );
        } else {
          // 진행 중 상태 - 일시정지 및 중지 옵션 제공
          sessionMenuItems.push(
            {
              label: '일시정지',
              click: () => {
                this.sendToRenderer('pause-current-session');
              }
            },
            {
              label: '현재 세션 중지',
              click: () => {
                this.sendToRenderer('stop-current-session');
              }
            },
            {
              type: 'separator'
            }
          );
        }
        
        // 새 세션 시작 옵션
        sessionMenuItems.push(
          {
            label: '새 세션 시작',
            click: () => {
              this.sendToRenderer('start-new-session-from-tray');
            }
          },
          {
            type: 'separator'
          }
        );
      } else {
        // 활성 세션이 없는 경우 - 세션 시작 버튼 추가
        sessionMenuItems.push(
          {
            label: '새 세션 시작',
            click: () => {
              this.sendToRenderer('start-new-session-from-tray');
            }
          },
          {
            type: 'separator'
          }
        );
      }

      // 스크린샷 캡처 메뉴 항목 (세션이 진행 중이고 일시정지가 아닐 때만 표시)
      const screenshotMenuItem: Electron.MenuItemConstructorOptions[] = 
        (isSessionActive && result.data && !result.data.isPaused) ? [
        {
          label: '스크린샷 캡처',
          click: () => {
            // IPC를 통해 스크린샷 캡처 실행
            this.ipcHandlers.sendToRenderer('capture-screenshot-request');
          }
        },
        {
          type: 'separator'
        }
      ] : [];

      const contextMenu = Menu.buildFromTemplate([
        {
          label: 'Work Tracker 열기',
          click: () => {
            if (this.mainWindow) {
              this.mainWindow.show();
              this.mainWindow.focus();
            } else {
              this.createMainWindow();
            }
          }
        },
        {
          type: 'separator'
        },
        ...sessionMenuItems,
        ...screenshotMenuItem,
        {
          label: '설정',
          click: () => {
            if (this.mainWindow) {
              this.mainWindow.show();
              this.mainWindow.focus();
              this.mainWindow.webContents.send('navigate-to', '/settings');
            }
          }
        },
        {
          type: 'separator'
        },
        {
          label: '종료',
          click: () => {
            app.quit();
          }
        }
      ]);

      if (!this.tray.isDestroyed()) {
        this.tray.setContextMenu(contextMenu);
      }
    } catch (error) {
      console.error('Failed to update tray menu:', error);
      
      // 오류 발생 시 기본 메뉴 설정 (트레이가 유효한 경우에만)
      if (this.tray && !this.tray.isDestroyed()) {
        const fallbackMenu = Menu.buildFromTemplate([
          {
            label: 'Work Tracker 열기',
            click: () => {
              if (this.mainWindow) {
                this.mainWindow.show();
                this.mainWindow.focus();
              } else {
                this.createMainWindow();
              }
            }
          },
          {
            label: '종료',
            click: () => {
              app.quit();
            }
          }
        ]);
        
        this.tray.setContextMenu(fallbackMenu);
      }
    }
  }

  /**
   * 렌더러 프로세스로 메시지를 보냅니다.
   */
  private sendToRenderer(channel: string, ...args: any[]): void {
    if (this.mainWindow && this.mainWindow.webContents) {
      this.mainWindow.webContents.send(channel, ...args);
    }
  }

  private createMenu(): void {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'Work Tracker',
        submenu: [
          { role: 'about', label: 'Work Tracker 정보' },
          { type: 'separator' },
          { role: 'services', label: '서비스' },
          { type: 'separator' },
          { role: 'hide', label: '숨기기' },
          { role: 'hideOthers', label: '다른 앱 숨기기' },
          { role: 'unhide', label: '모두 보기' },
          { type: 'separator' },
          { role: 'quit', label: '종료' }
        ]
      },
      {
        label: '편집',
        submenu: [
          { role: 'undo', label: '실행 취소' },
          { role: 'redo', label: '다시 실행' },
          { type: 'separator' },
          { role: 'cut', label: '잘라내기' },
          { role: 'copy', label: '복사' },
          { role: 'paste', label: '붙여넣기' },
          { role: 'selectAll', label: '모두 선택' }
        ]
      },
      {
        label: '보기',
        submenu: [
          { role: 'reload', label: '새로고침' },
          { role: 'forceReload', label: '강제 새로고침' },
          { role: 'toggleDevTools', label: '개발자 도구' },
          { type: 'separator' },
          { role: 'resetZoom', label: '실제 크기' },
          { role: 'zoomIn', label: '확대' },
          { role: 'zoomOut', label: '축소' },
          { type: 'separator' },
          { role: 'togglefullscreen', label: '전체 화면' }
        ]
      },
      {
        label: '윈도우',
        submenu: [
          { role: 'minimize', label: '최소화' },
          { role: 'close', label: '닫기' }
        ]
      }
    ];

    // Windows/Linux에서는 다른 메뉴 구조
    if (process.platform !== 'darwin') {
      template.unshift({
        label: '파일',
        submenu: [
          { role: 'quit', label: '종료' }
        ]
      });
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  private getAppIcon(): Electron.NativeImage {
    try {
      const iconPath = join(__dirname, '../../public/icons/app-icon.png');
      return nativeImage.createFromPath(iconPath);
    } catch (error) {
      console.warn('Failed to load app icon:', error);
      // 폴백으로 기본 아이콘 사용
      return nativeImage.createFromNamedImage('NSImageNameComputer');
    }
  }

  private getTrayIcon(): Electron.NativeImage {
    try {
      // Retina 디스플레이 지원을 위해 @2x 이미지도 함께 로드
      const iconPath = join(__dirname, '../../public/icons/tray-icon.png');
      const icon2xPath = join(__dirname, '../../public/icons/tray-icon@2x.png');
      
      let image: Electron.NativeImage;
      
      // @2x 이미지가 있으면 멀티 해상도 이미지로 생성
      if (require('fs').existsSync(icon2xPath)) {
        image = nativeImage.createFromPath(iconPath);
        image.addRepresentation({
          scaleFactor: 2.0,
          buffer: require('fs').readFileSync(icon2xPath)
        });
      } else {
        image = nativeImage.createFromPath(iconPath);
      }
      
      // macOS에서는 트레이 아이콘을 템플릿으로 설정하여 시스템 테마에 맞게 조정
      if (process.platform === 'darwin') {
        image.setTemplateImage(true);
      }
      
      return image;
    } catch (error) {
      console.warn('Failed to load tray icon:', error);
      // 폴백으로 앱 아이콘 사용
      return this.getAppIcon();
    }
  }

  /**
   * macOS 알림 권한을 요청합니다.
   */
  private requestNotificationPermission(): void {
    if (process.platform === 'darwin') {
      // macOS에서 알림 권한 요청
      if (Notification.isSupported()) {
        console.log('Requesting notification permission...');
        
        // 테스트 알림을 통해 권한 요청
        const testNotification = new Notification({
          title: 'Work Tracker',
          body: '알림 권한이 허용되었습니다. 작업 변경 시 알림을 받을 수 있습니다.',
          silent: true
        });
        
        testNotification.show();
        
        // 잠시 후 테스트 알림 닫기
        setTimeout(() => {
          testNotification.close();
        }, 3000);
        
        console.log('Notification permission requested');
      } else {
        console.log('Notifications are not supported on this system');
      }
    }
  }

  /**
   * 트레이 타이틀 업데이트를 시작합니다.
   */
  private startTrayUpdater(): void {
    // 기존 타이머가 있으면 정리
    if (this.trayUpdateInterval) {
      clearInterval(this.trayUpdateInterval);
      this.trayUpdateInterval = null;
    }
    if (this.trayMenuUpdateInterval) {
      clearInterval(this.trayMenuUpdateInterval);
      this.trayMenuUpdateInterval = null;
    }

    this.updateTrayTitle();
    
    // 1초마다 타이틀 업데이트, 30초마다 메뉴 업데이트
    this.trayUpdateInterval = setInterval(() => {
      // 트레이가 유효한지 확인
      if (this.tray && !this.tray.isDestroyed()) {
        this.updateTrayTitle();
      } else {
        // 트레이가 파괴되었으면 인터벌 정리
        if (this.trayUpdateInterval) {
          clearInterval(this.trayUpdateInterval);
          this.trayUpdateInterval = null;
        }
      }
    }, 1000);

    // 30초마다 메뉴 상태 업데이트 (세션 상태 변화 감지)
    this.trayMenuUpdateInterval = setInterval(() => {
      // 트레이가 유효한지 확인
      if (this.tray && !this.tray.isDestroyed()) {
        this.updateTrayMenu().catch(error => {
          console.error('Failed to update tray menu in interval:', error);
        });
      } else {
        // 트레이가 파괴되었으면 인터벌 정리
        if (this.trayMenuUpdateInterval) {
          clearInterval(this.trayMenuUpdateInterval);
          this.trayMenuUpdateInterval = null;
        }
      }
    }, 30000);
  }

  /**
   * 트레이 타이틀을 현재 세션 진행 시간으로 업데이트합니다.
   */
  private async updateTrayTitle(): Promise<void> {
    try {
      if (!this.tray || this.tray.isDestroyed()) return;

      const result = await this.ipcHandlers.getActiveSession();
      
      if (result.success && result.data && result.data.isActive) {
        const activeSession = result.data;
        
        // 중지된 시간을 제외한 실제 업무 시간 계산
        const actualWorkTime = this.calculateActualWorkTime(activeSession);
        
        const elapsedTime = this.formatElapsedTime(actualWorkTime);
        if (!this.tray.isDestroyed()) {
          this.tray.setTitle(`${elapsedTime}`);
          this.tray.setToolTip(`Work Tracker - ${activeSession.title} (${elapsedTime})`);
        }
      } else {
        if (!this.tray.isDestroyed()) {
          this.tray.setTitle('');
          this.tray.setToolTip('Work Tracker');
        }
      }
    } catch (error) {
      console.error('Failed to update tray title:', error);
    }
  }

  /**
   * 중지된 시간을 제외한 실제 업무 시간을 계산합니다.
   */
  private calculateActualWorkTime(record: any): number {
    if (!record) return 0;

    const now = new Date().getTime();
    const startTime = new Date(record.startTime).getTime();
    
    if (!record.timeline || record.timeline.length === 0) {
      // timeline이 없으면 기본 계산
      if (record.isPaused) {
        // 일시정지 상태이지만 timeline이 없으면 정확한 계산 불가
        // 안전하게 0을 반환 (실제로는 pause 시 timeline이 생성됨)
        return 0;
      } else {
        // 진행 중이면 시작부터 현재까지
        return now - startTime;
      }
    }

    // timeline을 활용하여 실제 업무 시간 계산
    let totalWorkingTime = 0;
    let lastWorkTime = startTime;
    let currentlyWorking = true; // 시작할 때는 업무 중

    for (const item of record.timeline) {
      const itemTime = new Date(item.timestamp).getTime();
      
      if (item.type === 'pause' || item.type === 'rest') {
        // 중지/휴식 시작: 현재까지의 업무 시간을 누적
        if (currentlyWorking) {
          totalWorkingTime += itemTime - lastWorkTime;
          currentlyWorking = false;
        }
      } else if (item.type === 'resume') {
        // 재개: 재개 시점을 기록
        if (!currentlyWorking) {
          lastWorkTime = itemTime;
          currentlyWorking = true;
        }
      }
    }

    // 현재 상태에 따라 마지막 구간 처리
    if (currentlyWorking && !record.isPaused) {
      // 현재 업무 중이고 일시정지가 아니면 현재 시간까지 누적
      totalWorkingTime += now - lastWorkTime;
    }

    return totalWorkingTime;
  }

  /**
   * 경과 시간을 사람이 읽기 쉬운 형식으로 포맷합니다.
   */
  private formatElapsedTime(elapsedMs: number): string {
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }
}

// 앱 인스턴스 생성
new WorkTrackerApp(); 