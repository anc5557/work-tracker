import { ipcMain, shell, BrowserWindow, dialog } from 'electron';
import { spawn } from 'child_process';
import { existsSync, readFile } from 'fs';
import { promisify } from 'util';
import { ScreenshotService } from '../services/screenshot.service';
import { DataService } from '../services/data.service';
import { SettingsService } from '../services/settings.service';
import { AutoRestService } from '../services/auto-rest.service';
import type { WorkRecord, AppSettings, AutoRestEvent, ActivityTimelineItem } from '@/shared/types';
import { v4 as uuidv4 } from 'uuid';

export class IpcHandlers {
  private screenshotService: ScreenshotService;
  private dataService: DataService;
  private settingsService: SettingsService;
  private autoRestService: AutoRestService;
  private trayUpdateCallback?: () => void;

  constructor(dataPath: string) {
    this.screenshotService = new ScreenshotService(dataPath);
    this.dataService = new DataService(dataPath);
    this.settingsService = new SettingsService(dataPath);
    this.autoRestService = new AutoRestService();
    this.setupHandlers();
    this.setupAutoRestEventHandlers();
  }

  /**
   * 트레이 업데이트 콜백을 설정합니다.
   */
  public setTrayUpdateCallback(callback: () => void): void {
    this.trayUpdateCallback = callback;
  }

  private setupHandlers(): void {
    // 스크린샷 캡처
    ipcMain.handle('capture-screenshot', async (_, data?: { sessionId?: string }) => {
      try {
        console.log('Manual screenshot capture requested, data:', data);
        const screenshot = await this.screenshotService.captureFullScreen();
        
        // 세션 ID가 제공된 경우 수동 캡처임을 표시하고 세션과 연결
        if (screenshot && data?.sessionId) {
          console.log('Setting up manual capture with sessionId:', data.sessionId);
          screenshot.workRecordId = data.sessionId;
          screenshot.isAutoCapture = false; // 수동 캡처임을 명시
          
          // 자동 캡처가 활성화된 상태에서 수동 캡처가 이루어진 경우 카운트 증가
          const autoCaptureStatus = this.screenshotService.getAutoCaptureStatus();
          console.log('Current auto capture status:', autoCaptureStatus);
          
          if (autoCaptureStatus.isActive && autoCaptureStatus.sessionId === data.sessionId) {
            console.log('Incrementing manual capture count');
            this.screenshotService.incrementCaptureCount();
          } else {
            console.log('Auto capture not active or session mismatch, not incrementing count');
          }
        } else {
          console.log('No sessionId provided or screenshot failed');
        }
        
        return { success: true, data: screenshot };
      } catch (error) {
        console.error('Screenshot capture failed:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    // 업무 시작
    ipcMain.handle('start-work', async (_, data: { title: string; description?: string; tags?: string[] }) => {
      try {
        const startTime = new Date().toISOString();
        const record: WorkRecord = {
          id: uuidv4(),
          title: data.title,
          description: data.description,
          startTime,
          tags: data.tags || [],
          isActive: true,
          timeline: [{
            id: uuidv4(),
            type: 'work',
            timestamp: startTime,
            description: '업무 시작'
          }]
        };

        await this.dataService.saveWorkRecord(record);
        
        // 스크린샷도 함께 캡처
        const screenshot = await this.screenshotService.captureFullScreen();
        if (screenshot) {
          record.screenshotPath = screenshot.filePath;
          await this.dataService.saveWorkRecord(record); // 스크린샷 경로와 함께 다시 저장
        }

        // 트레이 타이틀 즉시 업데이트
        this.updateTrayTitle();

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
        record.isPaused = false;
        record.duration = endTime.getTime() - new Date(record.startTime).getTime();

        await this.dataService.saveWorkRecord(record);

        // 트레이 타이틀 즉시 업데이트
        this.updateTrayTitle();

        return { success: true, data: record };
      } catch (error) {
        console.error('Failed to stop work:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    // 업무 중지
    ipcMain.handle('pause-work', async (_, data: { id: string }) => {
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

        if (!record.isActive || record.isPaused) {
          return { success: false, error: '중지할 수 없는 상태입니다.' };
        }

        // 업무 중지 처리
        const pauseTime = new Date();
        record.isPaused = true;

        // 타임라인에 중지 기록 추가
        if (!record.timeline) {
          record.timeline = [];
        }

        const pauseTimelineItem: ActivityTimelineItem = {
          id: uuidv4(),
          type: 'pause',
          timestamp: pauseTime.toISOString(),
          description: '업무 중지'
        };

        record.timeline.push(pauseTimelineItem);
        
        await this.dataService.saveWorkRecord(record);
        this.sendToRenderer('work-record-updated', record);

        // 트레이 타이틀 즉시 업데이트
        this.updateTrayTitle();

        return { success: true, data: record };
      } catch (error) {
        console.error('Failed to pause work:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    // 업무 재개
    ipcMain.handle('resume-work', async (_, data: { id: string }) => {
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

        if (!record.isActive || !record.isPaused) {
          return { success: false, error: '재개할 수 없는 상태입니다.' };
        }

        // 업무 재개 처리
        const resumeTime = new Date();
        record.isPaused = false;

        // 타임라인에서 마지막 중지 기록 찾아서 지속 시간 계산
        if (record.timeline) {
          const lastPauseItem = record.timeline
            .slice()
            .reverse()
            .find(item => item.type === 'pause' && !item.duration);
          
          if (lastPauseItem) {
            lastPauseItem.duration = resumeTime.getTime() - new Date(lastPauseItem.timestamp).getTime();
          }
        }

        // 타임라인에 재개 기록 추가
        if (!record.timeline) {
          record.timeline = [];
        }

        const resumeTimelineItem: ActivityTimelineItem = {
          id: uuidv4(),
          type: 'resume',
          timestamp: resumeTime.toISOString(),
          description: '업무 재개'
        };

        record.timeline.push(resumeTimelineItem);
        
        await this.dataService.saveWorkRecord(record);
        this.sendToRenderer('work-record-updated', record);

        // 트레이 타이틀 즉시 업데이트
        this.updateTrayTitle();

        return { success: true, data: record };
      } catch (error) {
        console.error('Failed to resume work:', error);
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
        // 기존 스크린샷 수 계산
        const existingScreenshots = await this.dataService.getSessionScreenshots(data.sessionId);
        const existingCount = existingScreenshots.length;
        
        const success = await this.screenshotService.startAutoCapture(data.sessionId, data.interval, existingCount);
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
          // 자동 휴식 설정이 포함된 경우 즉시 적용
          if (settings.autoRestEnabled !== undefined && settings.autoRestIdleTime !== undefined) {
            this.autoRestService.updateSettings(settings.autoRestEnabled, settings.autoRestIdleTime);
          }
          
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

    // 세션 상태 변경 알림 (트레이 업데이트용)
    ipcMain.handle('session-status-changed', async () => {
      try {
        // 트레이 업데이트를 위해 세션 상태 변경을 알림
        this.sendToRenderer('tray-update-requested');
        return { success: true };
      } catch (error) {
        console.error('Failed to handle session status change:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    // 최근 태그 조회
    ipcMain.handle('get-recent-tags', async (_, data?: { limit?: number }) => {
      try {
        let limit = data?.limit;
        
        // limit이 지정되지 않은 경우 설정값 사용
        if (!limit) {
          const settings = await this.settingsService.loadSettings();
          limit = settings.recentTagsLimit;
        }
        
        const recentTags = await this.dataService.getRecentTags(limit);
        return { success: true, data: recentTags };
      } catch (error) {
        console.error('Failed to get recent tags:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    // 태그별 레포트 조회
    ipcMain.handle('get-tag-reports', async (_, data: { 
      timeRange: 'today' | 'week' | 'month' | 'custom'; 
      startDate?: string; 
      endDate?: string; 
    }) => {
      try {
        const tagReports = await this.dataService.getTagReports(
          data.timeRange,
          data.startDate,
          data.endDate
        );
        return { success: true, data: tagReports };
      } catch (error) {
        console.error('Failed to get tag reports:', error);
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

    // 자동 휴식 관련 핸들러
    ipcMain.handle('get-auto-rest-status', async () => {
      try {
        const status = this.autoRestService.getStatus();
        return { success: true, data: status };
      } catch (error) {
        console.error('Failed to get auto rest status:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('update-auto-rest-settings', async (_, data: { enabled: boolean; idleTime: number }) => {
      try {
        this.autoRestService.updateSettings(data.enabled, data.idleTime);
        
        // 설정 파일에도 저장
        const currentSettings = await this.settingsService.loadSettings();
        const updatedSettings = {
          ...currentSettings,
          autoRestEnabled: data.enabled,
          autoRestIdleTime: data.idleTime
        };
        await this.settingsService.saveSettings(updatedSettings);

        const status = this.autoRestService.getStatus();
        return { success: true, data: status };
      } catch (error) {
        console.error('Failed to update auto rest settings:', error);
        return { success: false, error: (error as Error).message };
      }
    });

    ipcMain.handle('reset-activity-timer', async () => {
      try {
        this.autoRestService.resetActivityTimer();
        const status = this.autoRestService.getStatus();
        return { success: true, data: status };
      } catch (error) {
        console.error('Failed to reset activity timer:', error);
        return { success: false, error: (error as Error).message };
      }
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

  /**
   * 활성 세션을 가져옵니다 (메인 프로세스에서 직접 사용).
   */
  public async getActiveSession(): Promise<{ success: boolean; data?: any; error?: string }> {
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
  }

  /**
   * 트레이 타이틀을 업데이트합니다.
   */
  public updateTrayTitle(): void {
    if (this.trayUpdateCallback) {
      this.trayUpdateCallback();
    }
  }

  /**
   * 자동 휴식 이벤트 핸들러를 설정합니다.
   */
  private setupAutoRestEventHandlers(): void {
    // 세션 상태 확인 콜백 설정
    this.autoRestService.setSessionStateCallback(async () => {
      const result = await this.getActiveSession();
      return result.success && result.data && result.data.isActive;
    });

    this.autoRestService.onEvent(async (event: AutoRestEvent) => {
      try {
        // 렌더러 프로세스에 이벤트 전송
        this.sendToRenderer('auto-rest-event', event);

        // 휴식 시작/종료 시 업무 기록에 자동으로 추가
        await this.handleAutoRestWorkRecord(event);
      } catch (error) {
        console.error('Error handling auto rest event:', error);
      }
    });
  }

  /**
   * 자동 휴식 이벤트에 따른 업무 기록을 처리합니다.
   */
  private async handleAutoRestWorkRecord(event: AutoRestEvent): Promise<void> {
    try {
      const activeSessionResult = await this.getActiveSession();
      
      if (!activeSessionResult.success || !activeSessionResult.data) {
        // 진행 중인 세션이 없으면 휴식 기록하지 않음
        return;
      }

      const activeSession = activeSessionResult.data;
      
      // 세션의 타임라인이 없으면 초기화
      if (!activeSession.timeline) {
        activeSession.timeline = [];
      }

      if (event.type === 'rest-started') {
        // 휴식 시작을 타임라인에 추가
        const restTimelineItem = {
          id: uuidv4(),
          type: 'rest' as const,
          timestamp: event.timestamp,
          description: '자동으로 감지된 휴식 시작'
        };

        activeSession.timeline.push(restTimelineItem);
        await this.dataService.saveWorkRecord(activeSession);
        this.sendToRenderer('work-record-updated', activeSession);
        
      } else if (event.type === 'rest-ended' && event.duration) {
        // 마지막 휴식 항목에 지속 시간 추가
        const lastRestItem = activeSession.timeline
          .slice()
          .reverse()
          .find((item: ActivityTimelineItem) => item.type === 'rest' && !item.duration);
        
        if (lastRestItem) {
          lastRestItem.duration = event.duration;
        }

        // 업무 재개를 타임라인에 추가
        const resumeTimelineItem = {
          id: uuidv4(),
          type: 'resume' as const,
          timestamp: event.timestamp,
          description: `${Math.floor(event.duration / (1000 * 60))}분간 휴식 후 업무 재개`
        };

        activeSession.timeline.push(resumeTimelineItem);
        await this.dataService.saveWorkRecord(activeSession);
        this.sendToRenderer('work-record-updated', activeSession);
      }
    } catch (error) {
      console.error('Failed to handle auto rest work record:', error);
    }
  }

  /**
   * 자동 휴식 서비스를 초기화합니다.
   */
  public async initializeAutoRest(): Promise<void> {
    try {
      // 저장된 설정 로드
      const settings = await this.settingsService.loadSettings();
      this.autoRestService.updateSettings(
        settings.autoRestEnabled ?? true,
        settings.autoRestIdleTime ?? 5
      );
      
      console.log('Auto rest service initialized');
    } catch (error) {
      console.error('Failed to initialize auto rest service:', error);
    }
  }

  /**
   * 리소스를 정리합니다.
   */
  public destroy(): void {
    this.autoRestService.destroy();
  }
} 