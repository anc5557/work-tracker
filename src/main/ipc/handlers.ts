import { ipcMain, shell, BrowserWindow, dialog } from 'electron';
import { spawn } from 'child_process';
import { existsSync, readFile } from 'fs';
import { promisify } from 'util';
import { ScreenshotService } from '../services/screenshot.service';
import { DataService } from '../services/data.service';
import { SettingsService } from '../services/settings.service';
import type { WorkRecord, AppSettings } from '@/shared/types';
import { v4 as uuidv4 } from 'uuid';

export class IpcHandlers {
  private screenshotService: ScreenshotService;
  private dataService: DataService;
  private settingsService: SettingsService;

  constructor(dataPath: string) {
    this.screenshotService = new ScreenshotService(dataPath);
    this.dataService = new DataService(dataPath);
    this.settingsService = new SettingsService(dataPath);
    this.setupHandlers();
  }

  private setupHandlers(): void {
    // 스크린샷 캡처
    ipcMain.handle('capture-screenshot', async () => {
      try {
        const screenshot = await this.screenshotService.captureFullScreen();
        return { success: true, data: screenshot };
      } catch (error) {
        console.error('Screenshot capture failed:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    // 업무 시작
    ipcMain.handle('start-work', async (_, data: { title: string; description?: string }) => {
      try {
        const record: WorkRecord = {
          id: uuidv4(),
          title: data.title,
          description: data.description,
          startTime: new Date().toISOString(),
          tags: [],
          isActive: true
        };

        await this.dataService.saveWorkRecord(record);
        
        // 스크린샷도 함께 캡처
        const screenshot = await this.screenshotService.captureFullScreen();
        if (screenshot) {
          record.screenshotPath = screenshot.filePath;
          await this.dataService.saveWorkRecord(record); // 스크린샷 경로와 함께 다시 저장
        }

        return { success: true, data: record };
      } catch (error) {
        console.error('Failed to start work:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    // 업무 종료
    ipcMain.handle('stop-work', async (_, data: { id: string }) => {
      try {
        // 기존 기록 찾기
        const today = new Date().toISOString().split('T')[0];
        const dayData = await this.dataService.getWorkRecords(today);
        
        if (!dayData) {
          return { success: false, error: '오늘의 업무 기록을 찾을 수 없습니다.' };
        }

        const record = dayData.records.find(r => r.id === data.id);
        if (!record) {
          return { success: false, error: '해당 업무 기록을 찾을 수 없습니다.' };
        }

        // 업무 종료 처리
        const endTime = new Date();
        record.endTime = endTime.toISOString();
        record.isActive = false;
        record.duration = endTime.getTime() - new Date(record.startTime).getTime();

        await this.dataService.saveWorkRecord(record);

        return { success: true, data: record };
      } catch (error) {
        console.error('Failed to stop work:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    // 업무 기록 저장
    ipcMain.handle('save-work-record', async (_, record: WorkRecord) => {
      try {
        await this.dataService.saveWorkRecord(record);
        return { success: true, data: record };
      } catch (error) {
        console.error('Failed to save work record:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    // 업무 기록 삭제
    ipcMain.handle('delete-work-record', async (_, data: { id: string }) => {
      try {
        // 최근 7일 동안의 기록에서 해당 ID를 찾아서 삭제
        const today = new Date();
        for (let i = 0; i < 7; i++) {
          const date = new Date(today);
          date.setDate(today.getDate() - i);
          const dateString = date.toISOString().split('T')[0];
          
          const dayData = await this.dataService.getWorkRecords(dateString);
          if (dayData) {
            const record = dayData.records.find(r => r.id === data.id);
            if (record) {
              const deleted = await this.dataService.deleteWorkRecord(data.id, dateString);
              if (deleted) {
                return { success: true, data: { id: data.id, date: dateString } };
              } else {
                return { success: false, error: '업무 기록 삭제에 실패했습니다.' };
              }
            }
          }
        }
        
        return { success: false, error: '삭제할 업무 기록을 찾을 수 없습니다.' };
      } catch (error) {
        console.error('Failed to delete work record:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    // 업무 기록 조회
    ipcMain.handle('get-work-records', async (_, data: { date?: string }) => {
      try {
        const date = data.date || new Date().toISOString().split('T')[0];
        const dayData = await this.dataService.getWorkRecords(date);
        
        if (dayData) {
          return { success: true, data: dayData };
        } else {
          // 데이터가 없는 경우 빈 DayWorkSummary 구조 반환
          return { 
            success: true, 
            data: {
              date,
              records: [],
              totalDuration: 0,
              totalRecords: 0
            }
          };
        }
      } catch (error) {
        console.error('Failed to get work records:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    // 단일 업무 기록 조회
    ipcMain.handle('get-work-record', async (_, data: { id: string }) => {
      try {
        // 최근 7일 동안의 기록에서 검색
        const today = new Date();
        for (let i = 0; i < 7; i++) {
          const date = new Date(today);
          date.setDate(today.getDate() - i);
          const dateString = date.toISOString().split('T')[0];
          
          const dayData = await this.dataService.getWorkRecords(dateString);
          if (dayData) {
            const record = dayData.records.find(r => r.id === data.id);
            if (record) {
              return { success: true, data: record };
            }
          }
        }
        
        return { success: false, error: '업무 기록을 찾을 수 없습니다.' };
      } catch (error) {
        console.error('Failed to get work record:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    // 진행 중인 세션 조회
    ipcMain.handle('get-active-session', async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const dayData = await this.dataService.getWorkRecords(today);
        
        if (!dayData) {
          return { success: true, data: null };
        }

        // 활성 상태인 세션 찾기
        const activeSession = dayData.records.find(record => record.isActive);
        
        return { success: true, data: activeSession || null };
      } catch (error) {
        console.error('Failed to get active session:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    // 스크린샷 조회
    ipcMain.handle('get-screenshots', async (_, data: { workRecordId?: string }) => {
      try {
        // TODO: 스크린샷 조회 로직 구현
        return { success: true, data: [] };
      } catch (error) {
        console.error('Failed to get screenshots:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    // 스크린샷 열기
    ipcMain.handle('open-screenshot', async (_, data: { path: string }) => {
      try {
        // 파일 존재 여부 확인
        if (!existsSync(data.path)) {
          return { success: false, error: '스크린샷 파일을 찾을 수 없습니다.' };
        }

        // 파일 열기 시도
        const result = await shell.openPath(data.path);
        
        // openPath는 에러가 있을 때 빈 문자열이 아닌 에러 메시지를 반환함
        if (result) {
          // 에러가 있는 경우, 시스템 기본 이미지 뷰어로 열기 시도
          if (process.platform === 'darwin') {
            spawn('open', [data.path], { detached: true });
          } else if (process.platform === 'win32') {
            spawn('explorer', [data.path], { detached: true });
          } else {
            spawn('xdg-open', [data.path], { detached: true });
          }
        }
        
        return { success: true };
      } catch (error) {
        console.error('Failed to open screenshot:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    // 앱 제어
    ipcMain.handle('app-close', () => {
      const windows = BrowserWindow.getAllWindows();
      windows.forEach(window => window.close());
    });

    ipcMain.handle('app-minimize', () => {
      const focused = BrowserWindow.getFocusedWindow();
      if (focused) {
        focused.minimize();
      }
    });

    // 외부 링크 열기
    ipcMain.handle('open-external', async (_, url: string) => {
      try {
        await shell.openExternal(url);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    // 폴더에서 항목 보기
    ipcMain.handle('show-item-in-folder', async (_, path: string) => {
      try {
        shell.showItemInFolder(path);
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    });

    // 설정 관련
    ipcMain.handle('get-config', async () => {
      try {
        const config = await this.dataService.getConfig();
        return { success: true, data: config };
      } catch (error) {
        console.error('Failed to get config:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('save-config', async (_, config) => {
      try {
        await this.dataService.saveConfig(config);
        return { success: true };
      } catch (error) {
        console.error('Failed to save config:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    // 통계 조회
    ipcMain.handle('get-statistics', async () => {
      try {
        const stats = await this.dataService.getStatistics();
        return { success: true, data: stats };
      } catch (error) {
        console.error('Failed to get statistics:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    // 세션별 스크린샷 조회
    ipcMain.handle('get-session-screenshots', async (_, data: { sessionId: string }) => {
      try {
        const screenshots = await this.dataService.getSessionScreenshots(data.sessionId);
        return { success: true, data: screenshots };
      } catch (error) {
        console.error('Failed to get session screenshots:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    // 업무 통계 조회
    ipcMain.handle('get-work-stats', async (_, data: { timeRange: 'week' | 'month' | 'year' }) => {
      try {
        // 실제 업무 데이터를 기반으로 통계 계산
        const stats = await this.dataService.getWorkStats(data.timeRange);
        return { success: true, data: stats };
      } catch (error) {
        console.error('Failed to get work stats:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    // 월별 통계 조회 (Calendar 페이지용)
    ipcMain.handle('get-month-stats', async (_, data: { year: number; month: number }) => {
      try {
        const stats = await this.dataService.getMonthStats(data.year, data.month);
        return { success: true, data: stats };
      } catch (error) {
        console.error('Failed to get month stats:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    // 폴더 선택 다이얼로그
    ipcMain.handle('open-folder-dialog', async () => {
      try {
        const result = await dialog.showOpenDialog({
          properties: ['openDirectory']
        });
        
        if (result.canceled) {
          return { success: false, error: 'Dialog was canceled' };
        }
        
        return { success: true, data: result.filePaths[0] };
      } catch (error) {
        console.error('Failed to open folder dialog:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    // 자동 캡처 관련 핸들러
    ipcMain.handle('start-auto-capture', async (_, data: { sessionId: string; interval: number }) => {
      try {
        const success = await this.screenshotService.startAutoCapture(data.sessionId, data.interval);
        if (success) {
          return { success: true, data: this.screenshotService.getAutoCaptureStatus() };
        } else {
          return { success: false, error: '자동 캡처 시작에 실패했습니다.' };
        }
      } catch (error) {
        console.error('Failed to start auto capture:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('stop-auto-capture', async () => {
      try {
        this.screenshotService.stopAutoCapture();
        return { success: true, data: this.screenshotService.getAutoCaptureStatus() };
      } catch (error) {
        console.error('Failed to stop auto capture:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('get-auto-capture-status', async () => {
      try {
        const status = this.screenshotService.getAutoCaptureStatus();
        return { success: true, data: status };
      } catch (error) {
        console.error('Failed to get auto capture status:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    // 설정 관련 핸들러
    ipcMain.handle('save-settings', async (_, settings: AppSettings) => {
      try {
        const success = await this.settingsService.saveSettings(settings);
        if (success) {
          return { success: true, data: settings };
        } else {
          return { success: false, error: '설정 저장에 실패했습니다.' };
        }
      } catch (error) {
        console.error('Failed to save settings:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('load-settings', async () => {
      try {
        const settings = await this.settingsService.loadSettings();
        return { success: true, data: settings };
      } catch (error) {
        console.error('Failed to load settings:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('get-default-settings', async () => {
      try {
        const settings = this.settingsService.getDefaultSettings();
        return { success: true, data: settings };
      } catch (error) {
        console.error('Failed to get default settings:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    // 이미지 로드 핸들러
    ipcMain.handle('load-image', async (_, imagePath: string) => {
      try {
        if (!existsSync(imagePath)) {
          return { success: false, error: '이미지 파일을 찾을 수 없습니다.' };
        }

        const readFileAsync = promisify(readFile);
        const buffer = await readFileAsync(imagePath);
        const base64Data = buffer.toString('base64');
        const mimeType = imagePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
        
        return { 
          success: true, 
          data: {
            base64: base64Data,
            mimeType: mimeType,
            dataUrl: `data:${mimeType};base64,${base64Data}`
          }
        };
      } catch (error) {
        console.error('Failed to load image:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    // 데이터 백업/복원 (나중에 구현)
    ipcMain.handle('backup-data', async () => {
      // TODO: 구현 필요
      return { success: false, error: 'Not implemented yet' };
    });

    ipcMain.handle('restore-data', async () => {
      // TODO: 구현 필요
      return { success: false, error: 'Not implemented yet' };
    });
  }

  /**
   * Renderer 프로세스에게 이벤트를 전송합니다.
   */
  public sendToRenderer(event: string, data?: any): void {
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(window => {
      window.webContents.send(event, data);
    });
  }
} 