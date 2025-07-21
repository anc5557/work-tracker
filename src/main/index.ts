import { app, BrowserWindow, Menu, Tray, nativeImage, session, Notification } from 'electron';
import { join } from 'path';
import { IpcHandlers } from './ipc/handlers';

class WorkTrackerApp {
  private mainWindow: BrowserWindow | null = null;
  private tray: Tray | null = null;
  private ipcHandlers: IpcHandlers;
  private dataPath: string;
  private trayUpdateInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.dataPath = join(app.getPath('userData'), 'work-tracker-data');
    this.ipcHandlers = new IpcHandlers(this.dataPath);
    this.setupApp();
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

    app.whenReady().then(() => {
      this.setupContentSecurityPolicy();
      this.requestNotificationPermission();
      this.createMainWindow();
      this.createTray();
      this.createMenu();
      this.startTrayUpdater();
    });

    // 앱 종료 시 정리
    app.on('before-quit', () => {
      if (this.tray) {
        this.tray.destroy();
      }
      if (this.trayUpdateInterval) {
        clearInterval(this.trayUpdateInterval);
      }
    });
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
        label: '스크린샷 캡처',
        click: () => {
          // IPC를 통해 스크린샷 캡처 실행
          this.ipcHandlers.sendToRenderer('capture-screenshot-request');
        }
      },
      {
        type: 'separator'
      },
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

    this.tray.setToolTip('Work Tracker');
    this.tray.setContextMenu(contextMenu);

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
      const iconPath = join(__dirname, '../../public/icons/tray-icon.png');
      const image = nativeImage.createFromPath(iconPath);
      
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
    this.updateTrayTitle();
    
    // 1초마다 업데이트
    this.trayUpdateInterval = setInterval(() => {
      this.updateTrayTitle();
    }, 1000);
  }

  /**
   * 트레이 타이틀을 현재 세션 진행 시간으로 업데이트합니다.
   */
  private async updateTrayTitle(): Promise<void> {
    try {
      if (!this.tray) return;

      const result = await this.ipcHandlers.getActiveSession();
      
      if (result.success && result.data && result.data.isActive) {
        const activeSession = result.data;
        const now = new Date();
        const startTime = new Date(activeSession.startTime);
        const elapsedMs = now.getTime() - startTime.getTime();
        
        const elapsedTime = this.formatElapsedTime(elapsedMs);
        this.tray.setTitle(`⏱ ${elapsedTime}`);
        this.tray.setToolTip(`Work Tracker - ${activeSession.title} (${elapsedTime})`);
      } else {
        this.tray.setTitle('');
        this.tray.setToolTip('Work Tracker');
      }
    } catch (error) {
      console.error('Failed to update tray title:', error);
    }
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