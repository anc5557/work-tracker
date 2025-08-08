import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useToast } from '../../hooks/use-toast';
import { useTheme } from '../theme-provider';
import type { AppSettings } from '../../../shared/types';
import { Loader2, Sun, Moon, Monitor, DownloadCloud, CheckCircle, RefreshCw, AlertTriangle } from 'lucide-react';

export function Settings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [updateState, setUpdateState] = useState<
    | { status: 'idle' }
    | { status: 'checking' }
    | { status: 'available'; version: string; notes?: string | null }
    | { status: 'not-available'; current: string }
    | { status: 'downloading'; percent: number }
    | { status: 'downloaded'; version: string }
    | { status: 'error'; message: string }
  >({ status: 'idle' });

  useEffect(() => {
    loadSettings();
    // 업데이트 이벤트 리스너 등록
    const off: Array<() => void> = [];
    const on = window.electronAPI.on;
    on('update-available', (data: { version: string; releaseNotes?: string | null }) => {
      setUpdateState({ status: 'available', version: data.version, notes: data.releaseNotes });
      toast({ title: '업데이트 발견', description: `새 버전 ${data.version}을(를) 사용할 수 있습니다.` });
    });
    on('update-not-available', (data: { version: string }) => {
      setUpdateState({ status: 'not-available', current: data.version });
      toast({ title: '최신 상태', description: `현재 최신 버전(${data.version})입니다.` });
    });
    on('update-error', (data: { message: string }) => {
      setUpdateState({ status: 'error', message: data.message });
      toast({ title: '업데이트 오류', description: data.message, variant: 'destructive' });
    });
    on('update-progress', (data: { percent: number }) => {
      setUpdateState({ status: 'downloading', percent: data.percent });
    });
    on('update-downloaded', (data: { version: string }) => {
      setUpdateState({ status: 'downloaded', version: data.version });
      toast({ title: '업데이트 다운로드 완료', description: '앱을 재시작하여 설치할 수 있습니다.' });
    });
    // 정리 함수
    return () => {
      window.electronAPI.removeAllListeners('update-available');
      window.electronAPI.removeAllListeners('update-not-available');
      window.electronAPI.removeAllListeners('update-error');
      window.electronAPI.removeAllListeners('update-progress');
      window.electronAPI.removeAllListeners('update-downloaded');
    };
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const result = await window.electronAPI.invoke('load-settings');
      if (result.success) {
        setSettings(result.data);
      } else {
        toast({
          title: "오류",
          description: "설정을 불러오는데 실패했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast({
        title: "오류",
        description: "설정을 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    if (settings) {
      setSettings({ ...settings, [key]: value });
      
      // 입력값 변경 시 해당 필드의 에러 제거
      if (validationErrors[key]) {
        setValidationErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[key];
          return newErrors;
        });
      }
    }
  };

  const validateSettings = (settings: AppSettings): { [key: string]: string } => {
    const errors: { [key: string]: string } = {};

    // 최근 태그 개수 유효성 검증
    if (settings.recentTagsLimit < 3 || settings.recentTagsLimit > 50) {
      errors.recentTagsLimit = '최근 태그 개수는 3~50 사이의 값이어야 합니다.';
    }

    // 캡처 간격 유효성 검증
    const validIntervals = [1, 5, 10, 15, 30];
    if (!validIntervals.includes(settings.captureInterval)) {
      errors.captureInterval = '유효하지 않은 캡처 간격입니다.';
    }

    // 최대 스크린샷 수 유효성 검증
    if (settings.maxScreenshots < 10 || settings.maxScreenshots > 1000) {
      errors.maxScreenshots = '최대 스크린샷 수는 10~1000 사이의 값이어야 합니다.';
    }

    // 자동 휴식 대기 시간 유효성 검증
    if (settings.autoRestIdleTime < 1 || settings.autoRestIdleTime > 30) {
      errors.autoRestIdleTime = '자동 휴식 대기 시간은 1~30분 사이의 값이어야 합니다.';
    }

    return errors;
  };

  const handleSaveChanges = async () => {
    if (!settings) return;
    
    // 유효성 검증
    const errors = validateSettings(settings);
    setValidationErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      toast({
        title: "설정 오류",
        description: "입력값을 확인해주세요.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsSaving(true);
      const result = await window.electronAPI.invoke('save-settings', settings);
      
      if (result.success) {
        // 자동 휴식 설정이 변경된 경우 즉시 적용
        try {
          await window.electronAPI.invoke('update-auto-rest-settings', {
            enabled: settings.autoRestEnabled,
            idleTime: settings.autoRestIdleTime
          });
        } catch (error) {
          console.error('Failed to update auto rest settings:', error);
        }

        toast({
          title: "설정 저장됨",
          description: "모든 설정이 성공적으로 저장되었습니다.",
        });
      } else {
        toast({
          title: "오류",
          description: result.error || "설정 저장에 실패했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast({
        title: "오류",
        description: "설정 저장에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCheckUpdates = async () => {
    try {
      setUpdateState({ status: 'checking' });
      const res = await window.electronAPI.checkForUpdates();
      if (!res?.success) {
        throw new Error(res?.error || '업데이트 확인에 실패했습니다.');
      }
    } catch (error: any) {
      setUpdateState({ status: 'error', message: error?.message || '업데이트 확인 실패' });
      toast({ title: '오류', description: '업데이트 확인에 실패했습니다.', variant: 'destructive' });
    }
  };

  const handleDownloadUpdate = async () => {
    try {
      const res = await window.electronAPI.downloadUpdate();
      if (!res?.success) {
        throw new Error(res?.error || '업데이트 다운로드 실패');
      }
    } catch (error: any) {
      setUpdateState({ status: 'error', message: error?.message || '업데이트 다운로드 실패' });
      toast({ title: '오류', description: '업데이트 다운로드에 실패했습니다.', variant: 'destructive' });
    }
  };

  const handleQuitAndInstall = async () => {
    try {
      const res = await window.electronAPI.quitAndInstall();
      if (!res?.success) {
        throw new Error(res?.error || '설치 실행 실패');
      }
    } catch (error: any) {
      setUpdateState({ status: 'error', message: error?.message || '설치 실행 실패' });
      toast({ title: '오류', description: '설치를 시작하지 못했습니다.', variant: 'destructive' });
    }
  };

  const handleBrowseFolder = async () => {
    try {
      // 폴더 선택 다이얼로그
      const result = await window.electronAPI.invoke('open-folder-dialog');
      if (result.success && result.data) {
        updateSetting('storagePath', result.data);
      }
    } catch (error) {
      console.error('Failed to open folder dialog:', error);
      toast({
        title: "오류",
        description: "폴더 선택에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  if (isLoading || !settings) {
    return (
      <div className="min-h-screen bg-background text-foreground p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">설정을 불러오는 중...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-semibold">Settings</h1>
        
        {/* Screenshot Capture Section */}
        <Card>
          <CardHeader>
            <CardTitle>Screenshot Capture</CardTitle>
            <CardDescription>스크린샷 캡처 설정을 관리합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Auto Capture</label>
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={settings.autoCapture}
                  onChange={(e) => updateSetting('autoCapture', e.target.checked)}
                  className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary"
                />
                <span className="text-sm text-muted-foreground">작업 중 자동으로 스크린샷 캡처</span>
              </div>
            </div>
            
            {settings.autoCapture && (
              <div>
                <label className="block text-sm font-medium mb-2">Capture Interval</label>
                <div className="relative">
                  <select 
                    value={settings.captureInterval}
                    onChange={(e) => updateSetting('captureInterval', parseInt(e.target.value))}
                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
                  >
                    <option value={1}>1분</option>
                    <option value={5}>5분</option>
                    <option value={10}>10분</option>
                    <option value={15}>15분</option>
                    <option value={30}>30분</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                    <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium mb-2">Screenshot Quality</label>
              <div className="relative">
                <select 
                  value={settings.screenshotQuality}
                  onChange={(e) => updateSetting('screenshotQuality', e.target.value as 'high' | 'medium' | 'low')}
                  className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary appearance-none"
                >
                  <option value="high">고품질</option>
                  <option value="medium">중품질</option>
                  <option value="low">저품질</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Max Screenshots per Session</label>
              <Input
                type="number"
                value={settings.maxScreenshots}
                onChange={(e) => updateSetting('maxScreenshots', parseInt(e.target.value) || 100)}
                min={10}
                max={1000}
                placeholder="최대 스크린샷 수"
                className={validationErrors.maxScreenshots ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
              />
              {validationErrors.maxScreenshots && (
                <p className="text-xs text-red-500 mt-1">
                  {validationErrors.maxScreenshots}
                </p>
              )}
              {!validationErrors.maxScreenshots && (
                <p className="text-xs text-muted-foreground mt-1">세션당 저장할 최대 스크린샷 수 (10-1000)</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Storage Path Section */}
        <Card>
          <CardHeader>
            <CardTitle>Storage Path</CardTitle>
            <CardDescription>데이터 저장 경로를 설정합니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <label className="block text-sm font-medium mb-2">Data Storage Path</label>
              <div className="flex space-x-2">
                <Input
                  value={settings.storagePath}
                  onChange={(e) => updateSetting('storagePath', e.target.value)}
                  className="flex-1"
                  placeholder="데이터 저장 경로 선택..."
                />
                <Button 
                  onClick={handleBrowseFolder}
                  variant="outline"
                >
                  Browse
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">업무 기록과 스크린샷이 저장될 폴더</p>
            </div>
          </CardContent>
        </Card>

        {/* Tags Section */}
        <Card>
          <CardHeader>
            <CardTitle>Tags</CardTitle>
            <CardDescription>태그 관련 설정을 관리합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Recent Tags Limit</label>
              <Input
                type="number"
                value={settings.recentTagsLimit}
                onChange={(e) => updateSetting('recentTagsLimit', parseInt(e.target.value) || 10)}
                min={3}
                max={50}
                placeholder="최근 태그 개수"
                className={validationErrors.recentTagsLimit ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
              />
              {validationErrors.recentTagsLimit && (
                <p className="text-xs text-red-500 mt-1">
                  {validationErrors.recentTagsLimit}
                </p>
              )}
              {!validationErrors.recentTagsLimit && (
                <p className="text-xs text-muted-foreground mt-1">
                  업무 시작 시 표시할 최근 사용 태그 개수 (3-50개)
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Auto Rest Section */}
        <Card>
          <CardHeader>
            <CardTitle>Auto Rest Detection</CardTitle>
            <CardDescription>자동 휴식 감지 기능을 설정합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Auto Rest Detection</label>
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={settings.autoRestEnabled}
                  onChange={(e) => updateSetting('autoRestEnabled', e.target.checked)}
                  className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary"
                />
                <span className="text-sm text-muted-foreground">
                  키보드/마우스 입력이 없을 때 자동으로 휴식 상태로 전환
                </span>
              </div>
            </div>

            {settings.autoRestEnabled && (
              <div>
                <label className="block text-sm font-medium mb-2">Idle Time Before Rest (minutes)</label>
                <Input
                  type="number"
                  value={settings.autoRestIdleTime}
                  onChange={(e) => updateSetting('autoRestIdleTime', parseInt(e.target.value) || 5)}
                  min={1}
                  max={30}
                  placeholder="대기 시간 (분)"
                  className={validationErrors.autoRestIdleTime ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                />
                {validationErrors.autoRestIdleTime && (
                  <p className="text-xs text-red-500 mt-1">
                    {validationErrors.autoRestIdleTime}
                  </p>
                )}
                {!validationErrors.autoRestIdleTime && (
                  <p className="text-xs text-muted-foreground mt-1">
                    입력이 없어도 휴식 상태로 전환되기까지의 시간 (1-30분)
                  </p>
                )}
              </div>
            )}

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="text-sm font-medium text-foreground">기능 설명</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• 설정된 시간 동안 키보드/마우스 입력이 없으면 자동으로 "휴식 중" 상태로 전환됩니다.</li>
                <li>• 휴식 시작 시 macOS 알림으로 사용자에게 안내합니다.</li>
                <li>• 업무 기록에 "휴식 시작" 및 "업무 재개" 내역이 자동으로 추가됩니다.</li>
                <li>• 다시 입력을 시작하면 자동으로 업무 상태로 복귀합니다.</li>
              </ul>
            </div>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 space-y-2">
              <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">macOS 권한 안내</h4>
              <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
                <li>• <strong>접근성 권한:</strong> 시스템 환경설정 → 보안 및 개인 정보 보호 → 개인 정보 보호 → 접근성에서 Work Tracker 허용</li>
                <li>• <strong>알림 권한:</strong> 시스템 환경설정 → 알림에서 Work Tracker 허용</li>
                <li>• 권한이 허용되지 않으면 자동 휴식 감지가 제한적으로 작동할 수 있습니다.</li>
                <li>• 앱 재시작 후 권한 설정이 적용됩니다.</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Theme Section */}
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>테마 설정을 변경합니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-4">
              <Button
                onClick={() => setTheme('light')}
                variant={theme === 'light' ? 'default' : 'outline'}
                className="flex items-center gap-2"
              >
                <Sun className="w-4 h-4" />
                Light
              </Button>
              <Button
                onClick={() => setTheme('dark')}
                variant={theme === 'dark' ? 'default' : 'outline'}
                className="flex items-center gap-2"
              >
                <Moon className="w-4 h-4" />
                Dark
              </Button>
              <Button
                onClick={() => setTheme('system')}
                variant={theme === 'system' ? 'default' : 'outline'}
                className="flex items-center gap-2"
              >
                <Monitor className="w-4 h-4" />
                System
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Update Section */}
        <Card>
          <CardHeader>
            <CardTitle>App Update</CardTitle>
            <CardDescription>새 버전을 확인하고 설치합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Button onClick={handleCheckUpdates} variant="default" disabled={updateState.status === 'checking'}>
                <RefreshCw className={`w-4 h-4 mr-2 ${updateState.status === 'checking' ? 'animate-spin' : ''}`} />
                업데이트 확인
              </Button>

              {updateState.status === 'available' && (
                <>
                  <span className="text-sm">새 버전 {updateState.version} 이용 가능</span>
                  <Button onClick={handleDownloadUpdate} variant="secondary">
                    <DownloadCloud className="w-4 h-4 mr-2" /> 다운로드
                  </Button>
                </>
              )}

              {updateState.status === 'downloading' && (
                <span className="text-sm">다운로드 중... {Math.round(updateState.percent)}%</span>
              )}

              {updateState.status === 'downloaded' && (
                <>
                  <span className="text-sm">다운로드 완료 (v{updateState.version})</span>
                  <Button onClick={handleQuitAndInstall} variant="default">
                    <CheckCircle className="w-4 h-4 mr-2" /> 재시작 후 설치
                  </Button>
                </>
              )}

              {updateState.status === 'not-available' && (
                <span className="text-sm">최신 버전 사용 중 (v{updateState.current})</span>
              )}

              {updateState.status === 'error' && (
                <div className="flex items-center text-red-500 text-sm">
                  <AlertTriangle className="w-4 h-4 mr-2" /> {updateState.message}
                </div>
              )}
            </div>
            {updateState.status === 'available' && updateState.notes && (
              <div className="text-xs text-muted-foreground whitespace-pre-wrap border border-border rounded p-3">
                {updateState.notes}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end pt-6">
          <Button 
            onClick={handleSaveChanges}
            disabled={isSaving}
            className="px-8"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                저장 중...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
} 