import { desktopCapturer, nativeImage, systemPreferences } from 'electron';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { ScreenshotData } from '@/shared/types';

export class ScreenshotService {
  private dataPath: string;
  private screenshotDir: string;

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

      // 화면 소스 가져오기
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1920, height: 1080 }
      });

      if (sources.length === 0) {
        throw new Error('캡처할 화면을 찾을 수 없습니다.');
      }

      // 첫 번째 화면을 캡처 (기본 모니터)
      const source = sources[0];
      const image = source.thumbnail;
      
      // 고해상도 이미지로 다시 캡처
      const fullSources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 0, height: 0 } // 실제 해상도
      });
      
      const fullImage = fullSources[0]?.thumbnail || image;

      // 파일명과 경로 생성
      const timestamp = new Date();
      const filename = `screenshot_${timestamp.toISOString().replace(/[:.]/g, '-')}.png`;
      const filePath = join(this.screenshotDir, filename);

      // PNG 파일로 저장
      const buffer = fullImage.toPNG();
      await writeFile(filePath, buffer);

      const screenshotData: ScreenshotData = {
        id: uuidv4(),
        timestamp: timestamp.toISOString(),
        filePath,
      };

      console.log('Screenshot captured:', filePath);
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
} 