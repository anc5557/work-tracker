import { ipcMain, shell, BrowserWindow } from 'electron';
import { ScreenshotService } from '../services/screenshot.service';
import { DataService } from '../services/data.service';
import type { WorkRecord } from '@/shared/types';
import { v4 as uuidv4 } from 'uuid';

export class IpcHandlers {
  private screenshotService: ScreenshotService;
  private dataService: DataService;

  constructor(dataPath: string) {
    this.screenshotService = new ScreenshotService(dataPath);
    this.dataService = new DataService(dataPath);
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
          startTime: new Date(),
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
        record.endTime = new Date();
        record.isActive = false;
        record.duration = record.endTime.getTime() - record.startTime.getTime();

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

    // 업무 기록 조회
    ipcMain.handle('get-work-records', async (_, data: { date?: string }) => {
      try {
        const date = data.date || new Date().toISOString().split('T')[0];
        const dayData = await this.dataService.getWorkRecords(date);
        return { success: true, data: dayData };
      } catch (error) {
        console.error('Failed to get work records:', error);
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
        await shell.openPath(data.path);
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