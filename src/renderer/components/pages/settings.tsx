import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useToast } from '../../hooks/use-toast';
import { useTheme } from '../theme-provider';
import type { AppSettings } from '../../../shared/types';
import { Loader2, Sun, Moon, Monitor } from 'lucide-react';

export function Settings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    loadSettings();
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