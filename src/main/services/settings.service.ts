import { writeFile, readFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import type { AppSettings } from '@/shared/types';

export class SettingsService {
  private dataPath: string;
  private settingsFilePath: string;
  private defaultSettings: AppSettings;

  constructor(dataPath: string) {
    this.dataPath = dataPath;
    this.settingsFilePath = join(dataPath, 'settings.json');
    this.defaultSettings = {
      captureInterval: 5, // 기본 5분
      autoCapture: true,
      storagePath: dataPath,
      theme: 'dark',
      maxScreenshots: 100,
      screenshotQuality: 'high'
    };
    this.ensureDirectoryExists();
  }

  private async ensureDirectoryExists(): Promise<void> {
    try {
      await mkdir(this.dataPath, { recursive: true });
    } catch (error) {
      console.error('Failed to create settings directory:', error);
    }
  }

  /**
   * 설정을 로드합니다.
   */
  async loadSettings(): Promise<AppSettings> {
    try {
      if (!existsSync(this.settingsFilePath)) {
        // 설정 파일이 없으면 기본 설정을 저장하고 반환
        await this.saveSettings(this.defaultSettings);
        return { ...this.defaultSettings };
      }

      const data = await readFile(this.settingsFilePath, 'utf-8');
      const settings = JSON.parse(data) as AppSettings;
      
      // 기본 설정과 병합 (새로운 설정 항목이 추가된 경우 대비)
      const mergedSettings: AppSettings = {
        ...this.defaultSettings,
        ...settings
      };

      return mergedSettings;
    } catch (error) {
      console.error('Failed to load settings:', error);
      // 오류 시 기본 설정 반환
      return { ...this.defaultSettings };
    }
  }

  /**
   * 설정을 저장합니다.
   */
  async saveSettings(settings: AppSettings): Promise<boolean> {
    try {
      // 설정 유효성 검증
      const validatedSettings = this.validateSettings(settings);
      
      const data = JSON.stringify(validatedSettings, null, 2);
      await writeFile(this.settingsFilePath, data, 'utf-8');
      
      console.log('Settings saved successfully');
      return true;
    } catch (error) {
      console.error('Failed to save settings:', error);
      return false;
    }
  }

  /**
   * 기본 설정을 반환합니다.
   */
  getDefaultSettings(): AppSettings {
    return { ...this.defaultSettings };
  }

  /**
   * 설정 유효성을 검증합니다.
   */
  private validateSettings(settings: AppSettings): AppSettings {
    const validated: AppSettings = { ...settings };

    // 캡처 간격 유효성 검증 (1, 5, 10, 15, 30분만 허용)
    const validIntervals = [1, 5, 10, 15, 30];
    if (!validIntervals.includes(validated.captureInterval)) {
      validated.captureInterval = 5; // 기본값으로 설정
    }

    // 최대 스크린샷 수 검증 (10-1000 범위)
    if (validated.maxScreenshots < 10 || validated.maxScreenshots > 1000) {
      validated.maxScreenshots = 100; // 기본값으로 설정
    }

    // 테마 검증
    if (!['light', 'dark'].includes(validated.theme)) {
      validated.theme = 'dark'; // 기본값으로 설정
    }

    // 스크린샷 품질 검증
    if (!['high', 'medium', 'low'].includes(validated.screenshotQuality)) {
      validated.screenshotQuality = 'high'; // 기본값으로 설정
    }

    // 저장 경로 검증 (빈 문자열이면 기본 경로 사용)
    if (!validated.storagePath || validated.storagePath.trim() === '') {
      validated.storagePath = this.dataPath;
    }

    return validated;
  }

  /**
   * 특정 설정 항목만 업데이트합니다.
   */
  async updateSetting<K extends keyof AppSettings>(
    key: K, 
    value: AppSettings[K]
  ): Promise<boolean> {
    try {
      const currentSettings = await this.loadSettings();
      const updatedSettings = {
        ...currentSettings,
        [key]: value
      };
      
      return await this.saveSettings(updatedSettings);
    } catch (error) {
      console.error(`Failed to update setting ${key}:`, error);
      return false;
    }
  }
} 