import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { TaskInputDialog } from './task-input-dialog';
import { useToast } from '../../hooks/use-toast';
import { formatDuration } from '../../lib/utils';
import { Play, Square, Camera, Clock, Zap, Target, Timer, Coffee, Activity, Pause } from 'lucide-react';
import { useSession } from '../../contexts/session-context';
import type { WorkRecord, AppSettings, AutoCaptureStatus, AutoRestStatus, AutoRestEvent } from '../../../shared/types';

export function WorkTimer() {
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [autoCaptureStatus, setAutoCaptureStatus] = useState<AutoCaptureStatus | null>(null);
  const [autoRestStatus, setAutoRestStatus] = useState<AutoRestStatus | null>(null);
  const { toast } = useToast();
  const { isWorking, currentRecord, elapsedTime, startSession, stopSession, pauseSession, resumeSession, checkSession, endCurrentSession } = useSession();

  // 설정과 자동 캡처 상태 로드
  useEffect(() => {
    loadSettings();
    loadAutoCaptureStatus();
    loadAutoRestStatus();
  }, []);

  // 이벤트 리스너 추가
  useEffect(() => {
    const handleScreenshotCaptured = () => {
      // 스크린샷이 캡처되면 자동 캡처 상태 새로고침
      loadAutoCaptureStatus();
    };

    const handleAutoCaptureStatusChanged = (status: AutoCaptureStatus) => {
      setAutoCaptureStatus(status);
    };

    const handleAutoRestStatusChanged = (status: AutoRestStatus) => {
      setAutoRestStatus(status);
      // 설정도 함께 새로고침
      loadSettings();
    };

    const handleAutoRestEvent = (event: AutoRestEvent) => {
      // 자동 휴식 이벤트에 대한 토스트 알림 표시
      if (event.type === 'rest-started') {
        toast({
          title: "휴식 시작",
          description: "활동이 감지되지 않아 휴식 상태로 전환되었습니다.",
          variant: "default",
        });
      } else if (event.type === 'rest-ended') {
        const durationMinutes = event.duration ? Math.floor(event.duration / (1000 * 60)) : 0;
        toast({
          title: "업무 재개",
          description: `${durationMinutes}분간 휴식 후 업무를 재개합니다.`,
          variant: "default",
        });
      }
      
      // 상태 새로고침
      loadAutoRestStatus();
    };

    window.electronAPI.on('screenshot-captured', handleScreenshotCaptured);
    window.electronAPI.on('auto-capture-status-changed', handleAutoCaptureStatusChanged);
    window.electronAPI.on('auto-rest-status-changed', handleAutoRestStatusChanged);
    window.electronAPI.on('auto-rest-event', handleAutoRestEvent);

    return () => {
      window.electronAPI.removeAllListeners('screenshot-captured');
      window.electronAPI.removeAllListeners('auto-capture-status-changed');
      window.electronAPI.removeAllListeners('auto-rest-status-changed');
      window.electronAPI.removeAllListeners('auto-rest-event');
    };
  }, [toast]);

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

  const loadAutoRestStatus = async () => {
    try {
      const result = await window.electronAPI.invoke('get-auto-rest-status');
      if (result.success) {
        setAutoRestStatus(result.data);
      }
    } catch (error) {
      console.error('Failed to load auto rest status:', error);
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

  // 활동 타이머 리셋 (휴식 상태에서 수동으로 업무 재개)
  const resetActivityTimer = async () => {
    try {
      const result = await window.electronAPI.invoke('reset-activity-timer');
      if (result.success) {
        setAutoRestStatus(result.data);
        toast({
          title: "활동 재개",
          description: "활동 타이머가 리셋되었습니다.",
        });
      }
    } catch (error) {
      console.error('Failed to reset activity timer:', error);
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

  const handleTaskSubmit = async (title: string, description?: string, tags?: string[]) => {
    try {
      const result = await window.electronAPI.invoke('start-work', { title, description, tags });
      
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
        description: "업무 내용 미입력",
        tags: []
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
      // endCurrentSession이 자동 캡처 정지와 세션 종료를 모두 처리
      await endCurrentSession();
    } catch (error) {
      console.error('Failed to stop work:', error);
      toast({
        title: "오류",
        description: "업무 종료에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const handlePauseWork = async () => {
    if (!currentRecord) return;

    try {
      // 자동 캡처 정지 (중지 중에는 캡처하지 않음)
      await stopAutoCapture();
      
      const result = await window.electronAPI.invoke('pause-work', { id: currentRecord.id });
      
      if (result.success) {
        // 즉시 UI 업데이트 (중지 상태로)
        pauseSession(result.data);
        
        toast({
          title: "업무 중지",
          description: "업무가 중지되었습니다. 언제든지 재개할 수 있습니다.",
        });
      } else {
        toast({
          title: "오류",
          description: result.error || "업무 중지에 실패했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to pause work:', error);
      toast({
        title: "오류",
        description: "업무 중지에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleResumeWork = async () => {
    if (!currentRecord) return;

    try {
      const result = await window.electronAPI.invoke('resume-work', { id: currentRecord.id });
      
      if (result.success) {
        // 즉시 UI 업데이트 (재개 상태로)
        resumeSession(result.data);
        
        // 자동 캡처 재시작
        if (settings?.autoCapture) {
          await startAutoCapture(currentRecord.id);
        }
        
        toast({
          title: "업무 재개",
          description: "업무를 재개했습니다.",
        });
      } else {
        toast({
          title: "오류",
          description: result.error || "업무 재개에 실패했습니다.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to resume work:', error);
      toast({
        title: "오류",
        description: "업무 재개에 실패했습니다.",
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
              <div className={`p-4 rounded-full ${
                isWorking && autoRestStatus?.isResting
                  ? 'bg-orange-50 text-orange-400 border-2 border-orange-200'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {isWorking ? (
                  autoRestStatus?.isResting ? (
                    <Coffee className="w-6 h-6 animate-pulse" />
                  ) : (
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  )
                ) : (
                  <Target className="w-6 h-6" />
                )}
              </div>
            </div>
            <CardTitle className="text-2xl font-semibold text-foreground">
              {isWorking 
                ? currentRecord?.isPaused 
                  ? '작업 중지됨'
                  : autoRestStatus?.isResting 
                    ? '자동 휴식 중'
                    : '작업 진행 중' 
                : '새로운 업무 시작'
              }
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {isWorking 
                ? currentRecord?.isPaused
                  ? '작업이 중지되었습니다. 언제든지 재개할 수 있습니다'
                  : autoRestStatus?.isResting
                    ? '활동이 감지되지 않아 자동으로 휴식 상태입니다'
                    : '집중해서 작업을 진행하고 있습니다' 
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
                  {currentRecord.tags && currentRecord.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {currentRecord.tags.map((tag, index) => (
                        <Badge 
                          key={index} 
                          variant="outline" 
                          className="text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* 타이머 디스플레이 */}
                <div className="text-center">
                  <div className={`text-3xl font-mono font-semibold px-6 py-3 rounded-lg inline-block ${
                    autoRestStatus?.isResting 
                      ? 'text-orange-400 bg-orange-50 border border-orange-200' 
                      : 'text-foreground bg-muted'
                  }`}>
                    {formatDuration(elapsedTime)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {autoRestStatus?.isResting ? '휴식 중 (타이머 일시정지)' : '경과 시간'}
                  </p>
                  {autoRestStatus?.isResting && autoRestStatus.restStartTime && (
                    <p className="text-xs text-orange-500 mt-1">
                      휴식 시작: {new Date(autoRestStatus.restStartTime).toLocaleTimeString('ko-KR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  )}
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
              ) : currentRecord?.isPaused ? (
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    onClick={handleResumeWork}
                    variant="default"
                    size="lg"
                    className="py-4 font-medium"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    재개
                  </Button>
                  <Button 
                    onClick={handleStopWork}
                    variant="destructive"
                    size="lg"
                    className="py-4 font-medium"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    완료
                  </Button>
                  <Button 
                    onClick={handleCaptureScreenshot}
                    variant="outline"
                    size="lg"
                    className="py-4 font-medium"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    캡처
                  </Button>
                </div>
              ) : autoRestStatus?.isResting ? (
                <div className="space-y-3">
                  <Button 
                    onClick={resetActivityTimer}
                    size="lg"
                    className="w-full py-4 text-lg font-medium bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    <Activity className="w-5 h-5 mr-2" />
                    활동 재개하기
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      onClick={handleStopWork}
                      variant="destructive"
                      size="lg"
                      className="py-4 font-medium"
                    >
                      <Square className="w-4 h-4 mr-2" />
                      완료
                    </Button>
                    <Button 
                      onClick={handleCaptureScreenshot}
                      variant="outline"
                      size="lg"
                      className="py-4 font-medium"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      캡처
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    onClick={handlePauseWork}
                    variant="outline"
                    size="lg"
                    className="py-4 font-medium"
                  >
                    <Pause className="w-4 h-4 mr-2" />
                    중지
                  </Button>
                  <Button 
                    onClick={handleStopWork}
                    variant="destructive"
                    size="lg"
                    className="py-4 font-medium"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    완료
                  </Button>
                  <Button 
                    onClick={handleCaptureScreenshot}
                    variant="outline"
                    size="lg"
                    className="py-4 font-medium"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    캡처
                  </Button>
                </div>
              )}
            </div>
            
            {/* 진행 상태 표시 */}
            {isWorking && (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  {currentRecord?.isPaused ? (
                    <>
                      <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                      <span>작업 중지됨</span>
                    </>
                  ) : autoRestStatus?.isResting ? (
                    <>
                      <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                      <span className="text-orange-600">자동 휴식 중</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span>작업 진행 중</span>
                    </>
                  )}
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
                
                {/* 자동 휴식 상태 */}
                {autoRestStatus && settings && (
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    {autoRestStatus.enabled && !currentRecord?.isPaused ? (
                      autoRestStatus.isResting ? (
                        <>
                          <Coffee className="w-3 h-3 text-orange-400 animate-pulse" />
                          <span className="text-orange-400">휴식 중</span>
                        </>
                      ) : (
                        <>
                          <Activity className="w-3 h-3 text-green-400" />
                          <span>자동 휴식 감지: {settings.autoRestIdleTime}분 대기</span>
                        </>
                      )
                    ) : (
                      <>
                        <Activity className="w-3 h-3 text-muted-foreground" />
                        <span>자동 휴식 감지: OFF</span>
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