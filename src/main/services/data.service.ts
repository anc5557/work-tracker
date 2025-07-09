import { writeFile, readFile, mkdir, readdir, stat } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import type { WorkRecord, DayWorkSummary, AppConfig } from '@/shared/types';

export class DataService {
  private dataPath: string;
  private recordsDir: string;
  private configPath: string;
  private defaultConfig: AppConfig;

  constructor(dataPath: string) {
    this.dataPath = dataPath;
    this.recordsDir = join(dataPath, 'records');
    this.configPath = join(dataPath, 'config.json');
    this.defaultConfig = {
      screenshotInterval: 30, // 30분
      autoSave: true,
      dataPath,
      theme: 'system'
    };
    this.ensureDirectoryExists();
  }

  private async ensureDirectoryExists(): Promise<void> {
    try {
      await mkdir(this.recordsDir, { recursive: true });
      await mkdir(dirname(this.configPath), { recursive: true });
    } catch (error) {
      console.error('Failed to create data directories:', error);
    }
  }

  /**
   * 날짜별 파일 경로를 생성합니다.
   */
  private getDateFilePath(date: string): string {
    return join(this.recordsDir, `${date}.json`);
  }

  /**
   * 업무 기록을 저장합니다.
   */
  async saveWorkRecord(record: WorkRecord): Promise<void> {
    try {
      const date = new Date(record.startTime).toISOString().split('T')[0];
      const filePath = this.getDateFilePath(date);
      
      // 기존 기록 읽기
      let dayData: DayWorkSummary;
      if (existsSync(filePath)) {
        const content = await readFile(filePath, 'utf-8');
        dayData = JSON.parse(content);
      } else {
        dayData = {
          date,
          records: [],
          totalDuration: 0,
          totalRecords: 0
        };
      }

      // 기존 기록 업데이트 또는 새 기록 추가
      const existingIndex = dayData.records.findIndex(r => r.id === record.id);
      if (existingIndex >= 0) {
        dayData.records[existingIndex] = record;
      } else {
        dayData.records.push(record);
      }

      // 통계 업데이트
      dayData.totalRecords = dayData.records.length;
      dayData.totalDuration = dayData.records.reduce((total, r) => {
        return total + (r.duration || 0);
      }, 0);

      // 시간순 정렬
      dayData.records.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

      // 파일 저장
      await writeFile(filePath, JSON.stringify(dayData, null, 2), 'utf-8');
      console.log(`Work record saved to ${filePath}`);

    } catch (error) {
      console.error('Failed to save work record:', error);
      throw error;
    }
  }

  /**
   * 특정 날짜의 업무 기록을 가져옵니다.
   */
  async getWorkRecords(date: string): Promise<DayWorkSummary | null> {
    try {
      const filePath = this.getDateFilePath(date);
      if (!existsSync(filePath)) {
        return null;
      }

      const content = await readFile(filePath, 'utf-8');
      return JSON.parse(content);

    } catch (error) {
      console.error('Failed to read work records:', error);
      return null;
    }
  }

  /**
   * 모든 업무 기록 날짜 목록을 가져옵니다.
   */
  async getAvailableDates(): Promise<string[]> {
    try {
      const files = await readdir(this.recordsDir);
      const dates = files
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''))
        .sort((a, b) => b.localeCompare(a)); // 최신순 정렬

      return dates;

    } catch (error) {
      console.error('Failed to get available dates:', error);
      return [];
    }
  }

  /**
   * 특정 기간의 업무 기록을 가져옵니다.
   */
  async getWorkRecordsInRange(startDate: string, endDate: string): Promise<DayWorkSummary[]> {
    try {
      const availableDates = await this.getAvailableDates();
      const filteredDates = availableDates.filter(date => date >= startDate && date <= endDate);
      
      const results: DayWorkSummary[] = [];
      for (const date of filteredDates) {
        const dayData = await this.getWorkRecords(date);
        if (dayData) {
          results.push(dayData);
        }
      }

      return results;

    } catch (error) {
      console.error('Failed to get work records in range:', error);
      return [];
    }
  }

  /**
   * 업무 기록을 삭제합니다.
   */
  async deleteWorkRecord(recordId: string, date: string): Promise<boolean> {
    try {
      const dayData = await this.getWorkRecords(date);
      if (!dayData) {
        return false;
      }

      const initialLength = dayData.records.length;
      dayData.records = dayData.records.filter(r => r.id !== recordId);
      
      if (dayData.records.length === initialLength) {
        return false; // 삭제할 기록이 없었음
      }

      // 통계 업데이트
      dayData.totalRecords = dayData.records.length;
      dayData.totalDuration = dayData.records.reduce((total, r) => {
        return total + (r.duration || 0);
      }, 0);

      // 파일 저장
      const filePath = this.getDateFilePath(date);
      await writeFile(filePath, JSON.stringify(dayData, null, 2), 'utf-8');
      
      return true;

    } catch (error) {
      console.error('Failed to delete work record:', error);
      return false;
    }
  }

  /**
   * 앱 설정을 저장합니다.
   */
  async saveConfig(config: AppConfig): Promise<void> {
    try {
      await writeFile(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save config:', error);
      throw error;
    }
  }

  /**
   * 앱 설정을 가져옵니다.
   */
  async getConfig(): Promise<AppConfig> {
    try {
      if (existsSync(this.configPath)) {
        const content = await readFile(this.configPath, 'utf-8');
        return { ...this.defaultConfig, ...JSON.parse(content) };
      }
      
      // 기본 설정 저장
      await this.saveConfig(this.defaultConfig);
      return this.defaultConfig;

    } catch (error) {
      console.error('Failed to read config:', error);
      return this.defaultConfig;
    }
  }

  /**
   * 데이터 통계를 가져옵니다.
   */
  async getStatistics(): Promise<{
    totalDays: number;
    totalRecords: number;
    totalDuration: number;
    averageDailyRecords: number;
    averageDailyDuration: number;
  }> {
    try {
      const dates = await this.getAvailableDates();
      let totalRecords = 0;
      let totalDuration = 0;

      for (const date of dates) {
        const dayData = await this.getWorkRecords(date);
        if (dayData) {
          totalRecords += dayData.totalRecords;
          totalDuration += dayData.totalDuration;
        }
      }

      const totalDays = dates.length;
      
      return {
        totalDays,
        totalRecords,
        totalDuration,
        averageDailyRecords: totalDays > 0 ? totalRecords / totalDays : 0,
        averageDailyDuration: totalDays > 0 ? totalDuration / totalDays : 0
      };

    } catch (error) {
      console.error('Failed to get statistics:', error);
      return {
        totalDays: 0,
        totalRecords: 0,
        totalDuration: 0,
        averageDailyRecords: 0,
        averageDailyDuration: 0
      };
    }
  }

  /**
   * 세션별 스크린샷을 조회합니다.
   */
  async getSessionScreenshots(sessionId: string): Promise<Array<{
    id: string;
    filename: string;
    path: string;
    timestamp: string;
  }>> {
    try {
      // 최근 7일 동안의 기록에서 해당 세션을 찾기
      const today = new Date();
      let session: WorkRecord | null = null;
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        
        const dayData = await this.getWorkRecords(dateString);
        if (dayData) {
          const record = dayData.records.find(r => r.id === sessionId);
          if (record) {
            session = record;
            break;
          }
        }
      }
      
      if (!session) {
        return [];
      }

      // 스크린샷 디렉토리 경로
      const screenshotsDir = join(this.dataPath, 'screenshots');
      
      if (!existsSync(screenshotsDir)) {
        return [];
      }

      // 세션 시간 범위 계산
      const sessionStart = new Date(session.startTime);
      const sessionEnd = session.endTime ? new Date(session.endTime) : new Date();
      
      // 스크린샷 파일들 조회
      const files = await readdir(screenshotsDir);
      const screenshots = [];
      
      for (const file of files) {
        if (!file.endsWith('.png')) continue;
        
        const filePath = join(screenshotsDir, file);
        const stats = await stat(filePath);
        const fileTime = stats.mtime;
        
        // 세션 시간 범위에 포함되는 스크린샷만 선택
        if (fileTime >= sessionStart && fileTime <= sessionEnd) {
          screenshots.push({
            id: file.replace('.png', ''),
            filename: file,
            path: filePath,
            timestamp: fileTime.toISOString()
          });
        }
      }
      
      // 시간순 정렬
      screenshots.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      return screenshots;

    } catch (error) {
      console.error('Failed to get session screenshots:', error);
      return [];
    }
  }

  /**
   * Reports 페이지용 상세 업무 통계를 계산합니다.
   */
  async getWorkStats(timeRange: 'week' | 'month' | 'year'): Promise<{
    totalSessions: number;
    totalHours: number;
    averageSessionLength: number;
    mostProductiveDay: string;
    weeklyHours: number[];
    dailyAverages: { [key: string]: number };
  }> {
    try {
      // 시간 범위 계산
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeRange) {
        case 'week':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case 'month':
          // 현재 달의 첫날로 설정
          startDate.setDate(1);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'year':
          startDate.setDate(endDate.getDate() - 365);
          break;
      }

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // 해당 기간의 모든 업무 기록 가져오기
      const dayDataList = await this.getWorkRecordsInRange(startDateStr, endDateStr);
      
      // 모든 완료된 세션 수집
      const completedSessions: WorkRecord[] = [];
      for (const dayData of dayDataList) {
        const completed = dayData.records.filter(record => 
          record.endTime && record.duration && record.duration > 0
        );
        completedSessions.push(...completed);
      }

      // 기본 통계 계산
      const totalSessions = completedSessions.length;
      const totalDurationMs = completedSessions.reduce((sum, session) => sum + (session.duration || 0), 0);
      const totalHours = totalDurationMs / (1000 * 60 * 60); // 밀리초를 시간으로 변환
      
      const averageSessionLength = totalSessions > 0 ? totalHours / totalSessions : 0;

      // 요일별 데이터 수집
      const dayOfWeekData: { [key: number]: number } = {}; // 0=일요일, 1=월요일, ...
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      for (const session of completedSessions) {
        const sessionDate = new Date(session.startTime);
        const dayOfWeek = sessionDate.getDay();
        const sessionHours = (session.duration || 0) / (1000 * 60 * 60);
        
        dayOfWeekData[dayOfWeek] = (dayOfWeekData[dayOfWeek] || 0) + sessionHours;
      }

      // 가장 생산적인 요일 찾기
      let mostProductiveDay = 'Monday';
      let maxHours = 0;
      for (let i = 0; i < 7; i++) {
        const hours = dayOfWeekData[i] || 0;
        if (hours > maxHours) {
          maxHours = hours;
          mostProductiveDay = dayNames[i];
        }
      }

      // 주간 시간 배열 (월~일)
      const weeklyHours = [
        dayOfWeekData[1] || 0, // Monday
        dayOfWeekData[2] || 0, // Tuesday
        dayOfWeekData[3] || 0, // Wednesday
        dayOfWeekData[4] || 0, // Thursday
        dayOfWeekData[5] || 0, // Friday
        dayOfWeekData[6] || 0, // Saturday
        dayOfWeekData[0] || 0, // Sunday
      ];

      // 요일별 평균 계산 (해당 요일이 몇 번 있었는지 고려)
      const weeksInRange = Math.ceil((endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
      const dailyAverages = {
        Monday: weeklyHours[0] / Math.max(1, weeksInRange),
        Tuesday: weeklyHours[1] / Math.max(1, weeksInRange),
        Wednesday: weeklyHours[2] / Math.max(1, weeksInRange),
        Thursday: weeklyHours[3] / Math.max(1, weeksInRange),
        Friday: weeklyHours[4] / Math.max(1, weeksInRange),
        Saturday: weeklyHours[5] / Math.max(1, weeksInRange),
        Sunday: weeklyHours[6] / Math.max(1, weeksInRange),
      };

      return {
        totalSessions,
        totalHours,
        averageSessionLength,
        mostProductiveDay,
        weeklyHours,
        dailyAverages
      };

    } catch (error) {
      console.error('Failed to calculate work stats:', error);
      // 오류 시 기본값 반환
      return {
        totalSessions: 0,
        totalHours: 0,
        averageSessionLength: 0,
        mostProductiveDay: 'Monday',
        weeklyHours: [0, 0, 0, 0, 0, 0, 0],
        dailyAverages: {
          Monday: 0,
          Tuesday: 0,
          Wednesday: 0,
          Thursday: 0,
          Friday: 0,
          Saturday: 0,
          Sunday: 0
        }
      };
    }
  }

  /**
   * 특정 월의 통계를 계산합니다. (Calendar 페이지용)
   */
  async getMonthStats(year: number, month: number): Promise<{
    totalDuration: number;
    totalSessions: number;
    totalDays: number;
    averageSessionDuration: number;
  }> {
    try {
      // 해당 월의 첫날과 마지막날 계산
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // 해당 월의 모든 업무 기록 가져오기
      const dayDataList = await this.getWorkRecordsInRange(startDateStr, endDateStr);
      
      // 통계 계산
      let totalDuration = 0;
      let totalSessions = 0;
      const activeDays = new Set<string>();

      for (const dayData of dayDataList) {
        if (dayData.records.length > 0) {
          activeDays.add(dayData.date);
          
          for (const record of dayData.records) {
            if (record.duration && record.duration > 0) {
              totalDuration += record.duration;
              totalSessions++;
            }
          }
        }
      }

      const averageSessionDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;

      return {
        totalDuration,
        totalSessions,
        totalDays: activeDays.size,
        averageSessionDuration
      };

    } catch (error) {
      console.error('Failed to calculate month stats:', error);
      return {
        totalDuration: 0,
        totalSessions: 0,
        totalDays: 0,
        averageSessionDuration: 0
      };
    }
  }
} 