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
  const { isWorking, currentRecord, elapsedTime, startSession, stopSession, restoreSession } = useSession();

  const handleStartWork = async () => {
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
      if (result.success && result.data) {
        toast({
          title: "진행 중인 세션 감지",
          description: "다른 곳에서 진행 중인 작업이 있습니다. 세션이 복원됩니다.",
          variant: "destructive",
        });
        
        // 세션 복원
        await restoreSession();
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
        <Card className="relative overflow-hidden bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-0 shadow-2xl">
          {/* 배경 그래디언트 */}
          <div className={`absolute inset-0 bg-gradient-to-br ${
            isWorking 
              ? 'from-green-500/10 via-emerald-500/5 to-teal-500/10' 
              : 'from-blue-500/10 via-purple-500/5 to-indigo-500/10'
          } transition-all duration-1000`} />
          
          <CardHeader className="relative text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className={`p-4 rounded-full ${
                isWorking 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              } transition-all duration-500`}>
                {isWorking ? (
                  <Zap className="w-8 h-8 animate-pulse" />
                ) : (
                  <Target className="w-8 h-8" />
                )}
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">
              {isWorking ? '업무 진행 중' : '새로운 업무 시작'}
            </CardTitle>
            <CardDescription className="text-lg">
              {isWorking 
                ? '집중해서 작업을 진행하고 있습니다' 
                : '생산적인 하루를 시작해보세요'
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent className="relative space-y-6">
            {isWorking && currentRecord && (
              <div className="text-center space-y-6">
                {/* 현재 작업 정보 */}
                <div className="bg-gray-50/80 dark:bg-gray-700/50 rounded-xl p-6 space-y-3">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">현재 작업</span>
                  </div>
                  <h3 className="font-semibold text-xl">{currentRecord.title}</h3>
                  {currentRecord.description && (
                    <p className="text-muted-foreground">{currentRecord.description}</p>
                  )}
                </div>
                
                {/* 타이머 디스플레이 */}
                <div className="text-center">
                  <div className="relative inline-block">
                    <div className="absolute -inset-4 bg-gradient-to-r from-green-400 to-blue-500 rounded-full blur opacity-20 animate-pulse"></div>
                    <Badge variant="secondary" className="relative text-4xl font-mono px-8 py-4 bg-white dark:bg-gray-800 border-2 border-green-200 dark:border-green-700">
                      {formatDuration(elapsedTime)}
                    </Badge>
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
                  className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transform hover:scale-[1.02] transition-all duration-200 shadow-lg"
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
                    className="py-4 font-semibold transform hover:scale-[1.02] transition-all duration-200"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    작업 완료
                  </Button>
                  <Button 
                    onClick={handleCaptureScreenshot}
                    variant="outline"
                    size="lg"
                    className="py-4 font-semibold transform hover:scale-[1.02] transition-all duration-200 bg-white/50 dark:bg-gray-800/50"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    스크린샷
                  </Button>
                </div>
              )}
            </div>
            
            {/* 진행 상태 표시 */}
            {isWorking && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                <span>작업 진행 중...</span>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* 빠른 통계 카드들 */}
        {!isWorking && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-lg p-4 text-center border border-gray-200/50 dark:border-gray-700/50">
              <div className="text-2xl font-bold text-blue-600">0</div>
              <div className="text-xs text-muted-foreground">오늘 작업</div>
            </div>
            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-lg p-4 text-center border border-gray-200/50 dark:border-gray-700/50">
              <div className="text-2xl font-bold text-green-600">0h</div>
              <div className="text-xs text-muted-foreground">총 시간</div>
            </div>
            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-lg p-4 text-center border border-gray-200/50 dark:border-gray-700/50">
              <div className="text-2xl font-bold text-purple-600">0</div>
              <div className="text-xs text-muted-foreground">스크린샷</div>
            </div>
          </div>
        )}
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