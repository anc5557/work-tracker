import React, { useEffect, useState } from 'react';
import { TaskInputDialog } from './task-input-dialog';
import { useSession } from '../../contexts/session-context';
import type { ScreenshotData, WorkRecord } from '../../../shared/types';
import { v4 as uuidv4 } from 'uuid';

export function WorkChangeNotificationHandler() {
  const [showTaskInput, setShowTaskInput] = useState(false);
  const [currentScreenshot, setCurrentScreenshot] = useState<ScreenshotData | null>(null);
  
  const { endCurrentSessionAndStartNew, endCurrentSession } = useSession();

  useEffect(() => {
    // 시스템 알림 응답 이벤트 리스너
    const handleNotificationResponse = (data: {
      action: 'new-work' | 'continue' | 'stop';
      screenshot: ScreenshotData;
      timestamp: string;
    }) => {
      console.log('Notification response received:', data);
      setCurrentScreenshot(data.screenshot);
      
      switch (data.action) {
        case 'new-work':
          // 새 작업 시작 - 작업 입력 다이얼로그 표시
          console.log('Opening task input dialog for new work');
          setShowTaskInput(true);
          break;
        case 'continue':
          // 현재 작업 계속 - 아무것도 하지 않음
          console.log('Continuing current work');
          break;
        case 'stop':
          // 작업 종료
          console.log('Stopping current work');
          handleStop();
          break;
      }
    };

    // IPC 이벤트 리스너 등록
    window.electronAPI.on('notification-response', handleNotificationResponse);

    // 컴포넌트 언마운트 시 리스너 정리
    return () => {
      window.electronAPI.removeAllListeners('notification-response');
    };
  }, []);

  // "종료" 버튼 클릭 - 현재 세션 종료
  const handleStop = async () => {
    setCurrentScreenshot(null);
    await endCurrentSession();
  };

  // 새 작업 입력 완료
  const handleNewTaskSubmit = async (title: string, description?: string) => {
    try {
      console.log('Creating new work record:', { title, description });
      
      const newRecord: WorkRecord = {
        id: uuidv4(),
        title,
        description,
        startTime: new Date().toISOString(),
        tags: [],
        isActive: true,
      };

      console.log('New record created:', newRecord);
      console.log('Calling endCurrentSessionAndStartNew...');
      
      await endCurrentSessionAndStartNew(newRecord);
      
      console.log('Session change completed, closing dialog');
      setShowTaskInput(false);
      setCurrentScreenshot(null);
    } catch (error) {
      console.error('Error in handleNewTaskSubmit:', error);
    }
  };

  // 새 작업 입력 건너뛰기
  const handleTaskInputSkip = () => {
    setShowTaskInput(false);
    setCurrentScreenshot(null);
    // 그냥 현재 상태 유지
  };

  return (
    <>
      {/* 새 작업 입력 다이얼로그 (시스템 알림에서 "예" 선택 시 표시) */}
      <TaskInputDialog
        open={showTaskInput}
        onOpenChange={setShowTaskInput}
        onSubmit={handleNewTaskSubmit}
        onSkip={handleTaskInputSkip}
        onStartNewSession={handleNewTaskSubmit}
        isSessionChange={true}
      />
    </>
  );
} 