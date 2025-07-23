import React, { useEffect, useState } from 'react';
import { WorkStatusDialog } from './work-status-dialog';
import { TaskInputDialog } from './task-input-dialog';
import { useSession } from '../../contexts/session-context';
import { useToast } from '../../hooks/use-toast';
import type { ScreenshotData, WorkRecord } from '../../../shared/types';

export function WorkChangeNotificationHandler() {
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showTaskInputDialog, setShowTaskInputDialog] = useState(false);
  const [currentScreenshot, setCurrentScreenshot] = useState<ScreenshotData | null>(null);
  
  const { 
    isWorking, 
    currentRecord, 
    elapsedTime,
    startSession,
    pauseSession,
    resumeSession,
    endCurrentSessionAndStartNew,
    endCurrentSession 
  } = useSession();
  const { toast } = useToast();

  useEffect(() => {
    // 알림 클릭 이벤트 처리 - 다이얼로그 표시
    const handleNotificationClick = (data: {
      screenshot: ScreenshotData;
      timestamp: string;
    }) => {
      console.log('Notification clicked, showing status dialog:', data);
      setCurrentScreenshot(data.screenshot);
      setShowStatusDialog(true);
    };

    // 트레이에서 현재 세션 중지 요청
    const handleStopCurrentSession = async () => {
      console.log('Stop current session requested from tray');
      try {
        await endCurrentSession();
        toast({
          title: "세션 중지",
          description: "현재 작업 세션이 중지되었습니다.",
        });
      } catch (error) {
        console.error('Error stopping session from tray:', error);
        toast({
          title: "오류",
          description: "세션 중지에 실패했습니다.",
          variant: "destructive",
        });
      }
    };

    // 트레이에서 현재 세션 일시정지 요청
    const handlePauseCurrentSession = async () => {
      console.log('Pause current session requested from tray');
      if (!currentRecord) {
        toast({
          title: "오류",
          description: "일시정지할 세션이 없습니다.",
          variant: "destructive",
        });
        return;
      }

      try {
        const result = await window.electronAPI.invoke('pause-work', { id: currentRecord.id });
        if (result.success) {
          pauseSession(result.data);
          toast({
            title: "세션 일시정지",
            description: "현재 작업이 일시정지되었습니다.",
          });
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error('Error pausing session from tray:', error);
        toast({
          title: "오류",
          description: "세션 일시정지에 실패했습니다.",
          variant: "destructive",
        });
      }
    };

    // 트레이에서 현재 세션 재개 요청
    const handleResumeCurrentSession = async () => {
      console.log('Resume current session requested from tray');
      if (!currentRecord) {
        toast({
          title: "오류",
          description: "재개할 세션이 없습니다.",
          variant: "destructive",
        });
        return;
      }

      try {
        const result = await window.electronAPI.invoke('resume-work', { id: currentRecord.id });
        if (result.success) {
          resumeSession(result.data);
          toast({
            title: "세션 재개",
            description: "작업을 재개했습니다.",
          });
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error('Error resuming session from tray:', error);
        toast({
          title: "오류",
          description: "세션 재개에 실패했습니다.",
          variant: "destructive",
        });
      }
    };

    // 트레이에서 새 세션 시작 요청
    const handleStartNewSessionFromTray = () => {
      console.log('Start new session requested from tray');
      setShowTaskInputDialog(true);
    };

    // 이벤트 리스너 등록
    window.electronAPI.on('notification-clicked', handleNotificationClick);
    window.electronAPI.on('stop-current-session', handleStopCurrentSession);
    window.electronAPI.on('pause-current-session', handlePauseCurrentSession);
    window.electronAPI.on('resume-current-session', handleResumeCurrentSession);
    window.electronAPI.on('start-new-session-from-tray', handleStartNewSessionFromTray);

    // 컴포넌트 언마운트 시 리스너 정리
    return () => {
      window.electronAPI.removeAllListeners('notification-clicked');
      window.electronAPI.removeAllListeners('stop-current-session');
      window.electronAPI.removeAllListeners('pause-current-session');
      window.electronAPI.removeAllListeners('resume-current-session');
      window.electronAPI.removeAllListeners('start-new-session-from-tray');
    };
  }, [endCurrentSession, pauseSession, resumeSession, currentRecord, toast]);

  // 계속 진행 - 아무것도 하지 않음
  const handleContinue = () => {
    console.log('Continuing current work');
    toast({
      title: "업무 계속",
      description: "현재 작업을 계속 진행합니다.",
    });
  };

  // 다른 업무로 전환
  const handleSwitchWork = async (title: string, description?: string) => {
    try {
      console.log('Switching to new work:', { title, description });
      
      const newRecord: WorkRecord = {
        id: crypto.randomUUID(),
        title,
        description,
        startTime: new Date().toISOString(),
        tags: [],
        isActive: true,
      };

      console.log('New record created:', newRecord);
      
      await endCurrentSessionAndStartNew(newRecord);
      
      console.log('Work switch completed');
      setCurrentScreenshot(null);
      
      toast({
        title: "업무 전환",
        description: `"${title}" 작업으로 전환되었습니다.`,
      });
    } catch (error) {
      console.error('Error in handleSwitchWork:', error);
      toast({
        title: "오류",
        description: "업무 전환에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  // 업무 중지
  const handleStop = async () => {
    try {
      console.log('Stopping current work');
      
      setCurrentScreenshot(null);
      await endCurrentSession();
      
      toast({
        title: "업무 완료",
        description: "현재 작업이 완료되었습니다.",
      });
    } catch (error) {
      console.error('Error stopping work:', error);
      toast({
        title: "오류", 
        description: "업무 종료에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  // 트레이에서 새 세션 시작 요청 처리
  const handleStartNewSession = (title: string, description?: string) => {
    try {
      const newRecord: WorkRecord = {
        id: crypto.randomUUID(),
        title,
        description,
        startTime: new Date().toISOString(),
        tags: [],
        isActive: true,
      };

      startSession(newRecord);
      
      toast({
        title: "새 세션 시작",
        description: `"${title}" 작업을 시작했습니다.`,
      });
    } catch (error) {
      console.error('Error starting new session from tray:', error);
      toast({
        title: "오류",
        description: "새 세션 시작에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  // 트레이에서 새 세션 시작 취소
  const handleSkipNewSession = () => {
    console.log('New session start cancelled from tray');
  };

  return (
    <>
      <WorkStatusDialog
        open={showStatusDialog}
        onOpenChange={setShowStatusDialog}
        currentRecord={currentRecord}
        elapsedTime={elapsedTime}
        screenshot={currentScreenshot || undefined}
        onContinue={handleContinue}
        onSwitchWork={handleSwitchWork}
        onStop={handleStop}
      />
      
      <TaskInputDialog
        open={showTaskInputDialog}
        onOpenChange={setShowTaskInputDialog}
        onSubmit={handleStartNewSession}
        onSkip={handleSkipNewSession}
      />
    </>
  );
} 