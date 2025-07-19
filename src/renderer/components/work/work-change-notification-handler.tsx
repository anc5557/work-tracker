import React, { useEffect, useState } from 'react';
import { WorkChangeNotification } from './work-change-notification';
import { TaskInputDialog } from './task-input-dialog';
import { useSession } from '../../contexts/session-context';
import type { ScreenshotData, WorkRecord } from '../../../shared/types';
import { v4 as uuidv4 } from 'uuid';

export function WorkChangeNotificationHandler() {
  const [showNotification, setShowNotification] = useState(false);
  const [showTaskInput, setShowTaskInput] = useState(false);
  const [currentScreenshot, setCurrentScreenshot] = useState<ScreenshotData | null>(null);
  
  const { endCurrentSessionAndStartNew, endCurrentSession } = useSession();

  useEffect(() => {
    // 작업 변경 알림 이벤트 리스너
    const handleWorkChangeNotification = (data: { screenshot: ScreenshotData; timestamp: string }) => {
      console.log('Work change notification received:', data);
      setCurrentScreenshot(data.screenshot);
      setShowNotification(true);
    };

    // IPC 이벤트 리스너 등록
    window.electronAPI.on('work-change-notification', handleWorkChangeNotification);

    // 컴포넌트 언마운트 시 리스너 정리
    return () => {
      window.electronAPI.removeAllListeners('work-change-notification');
    };
  }, []);

  // "예" 버튼 클릭 - 새 작업 시작
  const handleYes = () => {
    setShowNotification(false);
    setShowTaskInput(true);
  };

  // "진행중" 버튼 클릭 - 현재 작업 계속
  const handleContinue = () => {
    setShowNotification(false);
    setCurrentScreenshot(null);
    // 아무것도 하지 않음 (현재 세션 유지)
  };

  // "종료" 버튼 클릭 - 현재 세션 종료
  const handleStop = async () => {
    setShowNotification(false);
    setCurrentScreenshot(null);
    await endCurrentSession();
  };

  // 새 작업 입력 완료
  const handleNewTaskSubmit = async (title: string, description?: string) => {
    const newRecord: WorkRecord = {
      id: uuidv4(),
      title,
      description,
      startTime: new Date().toISOString(),
      tags: [],
      isActive: true,
    };

    await endCurrentSessionAndStartNew(newRecord);
    setShowTaskInput(false);
    setCurrentScreenshot(null);
  };

  // 새 작업 입력 건너뛰기
  const handleTaskInputSkip = () => {
    setShowTaskInput(false);
    setCurrentScreenshot(null);
    // 그냥 현재 상태 유지
  };

  return (
    <>
      {/* 작업 변경 알림 다이얼로그 */}
      <WorkChangeNotification
        open={showNotification}
        onOpenChange={setShowNotification}
        onYes={handleYes}
        onContinue={handleContinue}
        onStop={handleStop}
        screenshot={currentScreenshot || undefined}
      />

      {/* 새 작업 입력 다이얼로그 */}
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