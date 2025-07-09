import { ipcMain, shell, BrowserWindow, dialog } from 'electron';
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
        return { success: true, data: dayData?.records || [] };
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
        // TODO: 실제 통계 계산 로직 구현
        // 현재는 더미 데이터 반환
        const stats = {
          totalSessions: 47,
          totalHours: 156.5,
          averageSessionLength: 3.3,
          mostProductiveDay: 'Tuesday',
          weeklyHours: [8, 7.5, 9, 6, 8.5, 4, 2],
          dailyAverages: {
            Monday: 7.2,
            Tuesday: 8.1,
            Wednesday: 6.8,
            Thursday: 7.5,
            Friday: 6.2,
            Saturday: 3.1,
            Sunday: 2.4
          }
        };
        return { success: true, data: stats };
      } catch (error) {
        console.error('Failed to get work stats:', error);
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