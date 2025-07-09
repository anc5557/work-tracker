import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { TaskInputDialog } from './task-input-dialog';
import { useToast } from '../../hooks/use-toast';
import { formatDuration } from '../../lib/utils';
import { Play, Square, Camera, Clock, Zap, Target } from 'lucide-react';
import { useSession } from '../../contexts/session-context';
import type { WorkRecord } from '../../../shared/types';

export function WorkTimer() {
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const { toast } = useToast();
  const { isWorking, currentRecord, elapsedTime, startSession, stopSession, checkSession } = useSession();

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
        toast({
          title: "진행 중인 세션 감지",
          description: "다른 곳에서 진행 중인 작업이 있습니다. 세션이 복원됩니다.",
          variant: "destructive",
        });
        
        // 세션 체크로 복원
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
      const result = await window.electronAPI.invoke('capture-screenshot');
      
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
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-full bg-gray-700 text-gray-300">
                {isWorking ? (
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                ) : (
                  <Target className="w-6 h-6" />
                )}
              </div>
            </div>
            <CardTitle className="text-2xl font-semibold text-white">
              {isWorking ? '작업 진행 중' : '새로운 업무 시작'}
            </CardTitle>
            <CardDescription className="text-gray-400">
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
                <div className="bg-gray-700 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-400">현재 작업</span>
                  </div>
                  <h3 className="font-medium text-lg text-white">{currentRecord.title}</h3>
                  {currentRecord.description && (
                    <p className="text-gray-400">{currentRecord.description}</p>
                  )}
                </div>
                
                {/* 타이머 디스플레이 */}
                <div className="text-center">
                  <div className="text-3xl font-mono font-semibold text-white bg-gray-700 px-6 py-3 rounded-lg inline-block">
                    {formatDuration(elapsedTime)}
                  </div>
                  <p className="text-sm text-gray-400 mt-2">경과 시간</p>
                </div>
              </div>
            )}
            
            {/* 액션 버튼들 */}
            <div className="flex flex-col gap-3">
              {!isWorking ? (
                <Button 
                  onClick={handleStartWork}
                  size="lg"
                  className="w-full py-4 text-lg font-medium bg-white text-gray-900 hover:bg-gray-100"
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
                    className="py-4 font-medium border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    스크린샷
                  </Button>
                </div>
              )}
            </div>
            
            {/* 진행 상태 표시 */}
            {isWorking && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-400 pt-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>작업 진행 중</span>
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