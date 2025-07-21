import React, { useEffect, useState } from 'react';
import { WorkStatusDialog } from './work-status-dialog';
import { useSession } from '../../contexts/session-context';
import { useToast } from '../../hooks/use-toast';
import type { ScreenshotData, WorkRecord } from '../../../shared/types';

export function WorkChangeNotificationHandler() {
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [currentScreenshot, setCurrentScreenshot] = useState<ScreenshotData | null>(null);
  
  const { 
    isWorking, 
    currentRecord, 
    elapsedTime,
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

    // 기존의 알림 응답 처리는 제거하고, 알림 클릭만 처리
    window.electronAPI.on('notification-clicked', handleNotificationClick);

    // 컴포넌트 언마운트 시 리스너 정리
    return () => {
      window.electronAPI.removeAllListeners('notification-clicked');
    };
  }, []);

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

  return (
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
  );
} 