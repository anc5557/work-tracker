import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { TaskInputDialog } from './task-input-dialog';
import { useToast } from '../../hooks/use-toast';
import { formatDuration } from '../../lib/utils';
import { Play, Square, Camera, Clock, Zap, Target, Timer } from 'lucide-react';
import { useSession } from '../../contexts/session-context';
import type { WorkRecord, AppSettings, AutoCaptureStatus } from '../../../shared/types';

export function WorkTimer() {
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [autoCaptureStatus, setAutoCaptureStatus] = useState<AutoCaptureStatus | null>(null);
  const { toast } = useToast();
  const { isWorking, currentRecord, elapsedTime, startSession, stopSession, checkSession } = useSession();

  // 설정과 자동 캡처 상태 로드
  useEffect(() => {
    loadSettings();
    loadAutoCaptureStatus();
  }, []);

  // 스크린샷 캡처 이벤트 리스너 추가
  useEffect(() => {
    const handleScreenshotCaptured = () => {
      // 스크린샷이 캡처되면 자동 캡처 상태 새로고침
      loadAutoCaptureStatus();
    };

    const handleAutoCaptureStatusChanged = (status: AutoCaptureStatus) => {
      setAutoCaptureStatus(status);
    };

    window.electronAPI.on('screenshot-captured', handleScreenshotCaptured);
    window.electronAPI.on('auto-capture-status-changed', handleAutoCaptureStatusChanged);

    return () => {
      window.electronAPI.removeAllListeners('screenshot-captured');
      window.electronAPI.removeAllListeners('auto-capture-status-changed');
    };
  }, []);

  const loadSettings = async () => {
    try {
      const result = await window.electronAPI.invoke('load-settings');
      if (result.success) {
        setSettings(result.data);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const loadAutoCaptureStatus = async () => {
    try {
      const result = await window.electronAPI.invoke('get-auto-capture-status');
      if (result.success) {
        setAutoCaptureStatus(result.data);
      }
    } catch (error) {
      console.error('Failed to load auto capture status:', error);
    }
  };

  // 자동 캡처 시작
  const startAutoCapture = async (sessionId: string) => {
    if (!settings?.autoCapture) return;
    
    try {
      const result = await window.electronAPI.invoke('start-auto-capture', {
        sessionId,
        interval: settings.captureInterval
      });
      
      if (result.success) {
        setAutoCaptureStatus(result.data);
        toast({
          title: "자동 캡처 시작",
          description: `${settings.captureInterval}분 간격으로 자동 캡처가 시작되었습니다.`,
        });
      }
    } catch (error) {
      console.error('Failed to start auto capture:', error);
    }
  };

  // 자동 캡처 정지
  const stopAutoCapture = async () => {
    try {
      const result = await window.electronAPI.invoke('stop-auto-capture');
      if (result.success) {
        setAutoCaptureStatus(result.data);
        toast({
          title: "자동 캡처 정지",
          description: "자동 캡처가 정지되었습니다.",
        });
      }
    } catch (error) {
      console.error('Failed to stop auto capture:', error);
    }
  };

  const handleStartWork = async () => {
    // 먼저 세션 상태를 체크하여 동기화
    await checkSession();
    
    // 이미 진행 중인 세션이 있는지 확인
    if (isWorking && currentRecord) {
      toast({
        title: "진행 중인 세션",
        description: "이미 진행 중인 작업이 있습니다. 먼저 현재 작업을 완료해주세요.",
        variant: "destructive",
      });
      return;
    }

    // 백엔드에서도 한번 더 확인
    try {
      const result = await window.electronAPI.invoke('get-active-session');
      if (result.success && result.data && result.data.isActive) {
        // 세션 체크로 조용히 복원
        await checkSession();
        return;
      }
    } catch (error) {
      console.error('Failed to check active session:', error);
    }

    setShowTaskDialog(true);
  };

  const handleTaskSubmit = async (title: string, description?: string) => {
    try {
      const result = await window.electronAPI.invoke('start-work', { title, description });
      
      if (result.success) {
        startSession(result.data);
        setShowTaskDialog(false);
        
        // 자동 캡처 시작
        await startAutoCapture(result.data.id);
        
        toast({
          title: "업무 시작",
          description: `"${title}" 작업을 시작했습니다.`,
        });
      } else {
        toast({
          title: "오류",
          description: result.error || "업무 시작에 실패했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to start work:', error);
      toast({
        title: "오류",
        description: "업무 시작에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleTaskSkip = async () => {
    try {
      const result = await window.electronAPI.invoke('start-work', { 
        title: "업무 작업", 
        description: "업무 내용 미입력" 
      });
      
      if (result.success) {
        startSession(result.data);
        setShowTaskDialog(false);
        
        // 자동 캡처 시작
        await startAutoCapture(result.data.id);
        
        toast({
          title: "업무 시작",
          description: "업무를 시작했습니다.",
        });
      }
    } catch (error) {
      console.error('Failed to start work:', error);
      toast({
        title: "오류",
        description: "업무 시작에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleStopWork = async () => {
    if (!currentRecord) return;

    try {
      // 자동 캡처 정지
      await stopAutoCapture();
      
      const result = await window.electronAPI.invoke('stop-work', { id: currentRecord.id });
      
      if (result.success) {
        stopSession();
        
        toast({
          title: "업무 완료",
          description: `"${result.data.title}" 작업을 완료했습니다.`,
        });
      } else {
        toast({
          title: "오류",
          description: result.error || "업무 종료에 실패했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to stop work:', error);
      toast({
        title: "오류",
        description: "업무 종료에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleCaptureScreenshot = async () => {
    try {
      // 현재 세션이 활성화되어 있을 때만 세션 ID 전달
      const sessionId = isWorking && currentRecord ? currentRecord.id : undefined;
      console.log('Manual capture requested, sessionId:', sessionId, 'isWorking:', isWorking, 'currentRecord:', currentRecord);
      
      const result = await window.electronAPI.invoke('capture-screenshot', { sessionId });
      
      if (result.success) {
        toast({
          title: "스크린샷 캡처",
          description: "스크린샷이 성공적으로 캡처되었습니다.",
        });
      } else {
        toast({
          title: "오류",
          description: result.error || "스크린샷 캡처에 실패했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
      toast({
        title: "오류",
        description: "스크린샷 캡처에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* 메인 타이머 카드 */}
        <Card>
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-full bg-muted text-muted-foreground">
                {isWorking ? (
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                ) : (
                  <Target className="w-6 h-6" />
                )}
              </div>
            </div>
            <CardTitle className="text-2xl font-semibold text-foreground">
              {isWorking ? '작업 진행 중' : '새로운 업무 시작'}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {isWorking 
                ? '집중해서 작업을 진행하고 있습니다' 
                : '생산적인 하루를 시작해보세요'
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {isWorking && currentRecord && (
              <div className="text-center space-y-6">
                {/* 현재 작업 정보 */}
                <div className="bg-muted rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">현재 작업</span>
                  </div>
                  <h3 className="font-medium text-lg text-foreground">{currentRecord.title}</h3>
                  {currentRecord.description && (
                    <p className="text-muted-foreground">{currentRecord.description}</p>
                  )}
                </div>
                
                {/* 타이머 디스플레이 */}
                <div className="text-center">
                  <div className="text-3xl font-mono font-semibold text-foreground bg-muted px-6 py-3 rounded-lg inline-block">
                    {formatDuration(elapsedTime)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">경과 시간</p>
                </div>
              </div>
            )}
            
            {/* 액션 버튼들 */}
            <div className="flex flex-col gap-3">
              {!isWorking ? (
                <Button 
                  onClick={handleStartWork}
                  size="lg"
                  className="w-full py-4 text-lg font-medium"
                >
                  <Play className="w-5 h-5 mr-2" />
                  업무 시작하기
                </Button>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    onClick={handleStopWork}
                    variant="destructive"
                    size="lg"
                    className="py-4 font-medium"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    작업 완료
                  </Button>
                  <Button 
                    onClick={handleCaptureScreenshot}
                    variant="outline"
                    size="lg"
                    className="py-4 font-medium"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    스크린샷
                  </Button>
                </div>
              )}
            </div>
            
            {/* 진행 상태 표시 */}
            {isWorking && (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span>작업 진행 중</span>
                </div>
                
                {/* 자동 캡처 상태 */}
                {autoCaptureStatus && settings && (
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    {autoCaptureStatus.isActive ? (
                      <>
                        <Timer className="w-3 h-3 text-blue-400" />
                        <span>자동 캡처: {settings.captureInterval}분 간격</span>
                        <Badge variant="outline" className="text-xs border-blue-400 text-blue-400">
                          {autoCaptureStatus.totalCaptured}회 캡처됨
                        </Badge>
                      </>
                    ) : settings.autoCapture ? (
                      <>
                        <Timer className="w-3 h-3 text-muted-foreground" />
                        <span>자동 캡처 대기 중</span>
                      </>
                    ) : (
                      <>
                        <Timer className="w-3 h-3 text-muted-foreground" />
                        <span>자동 캡처 비활성화</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <TaskInputDialog
        open={showTaskDialog}
        onOpenChange={setShowTaskDialog}
        onSubmit={handleTaskSubmit}
        onSkip={handleTaskSkip}
      />
    </>
  );
} 