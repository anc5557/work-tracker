import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { TaskInputDialog } from './task-input-dialog';
import { useToast } from '../../hooks/use-toast';
import { formatDuration } from '../../lib/utils';
import type { WorkRecord } from '../../../shared/types';

export function WorkTimer() {
  const [isWorking, setIsWorking] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<WorkRecord | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const { toast } = useToast();

  // 경과 시간 업데이트
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isWorking && currentRecord) {
      interval = setInterval(() => {
        const now = new Date().getTime();
        const start = new Date(currentRecord.startTime).getTime();
        setElapsedTime(now - start);
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isWorking, currentRecord]);

  const handleStartWork = () => {
    setShowTaskDialog(true);
  };

  const handleTaskSubmit = async (title: string, description?: string) => {
    try {
      const result = await window.electronAPI.invoke('start-work', { title, description });
      
      if (result.success) {
        setCurrentRecord(result.data);
        setIsWorking(true);
        setElapsedTime(0);
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
        setCurrentRecord(result.data);
        setIsWorking(true);
        setElapsedTime(0);
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
        setIsWorking(false);
        setCurrentRecord(null);
        setElapsedTime(0);
        
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
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {isWorking ? '업무 진행 중' : '업무 시작'}
          </CardTitle>
          <CardDescription>
            {isWorking 
              ? '현재 작업 중입니다' 
              : '업무를 시작하려면 버튼을 클릭하세요'
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {isWorking && currentRecord && (
            <div className="text-center space-y-3">
              <div className="space-y-1">
                <h3 className="font-medium">{currentRecord.title}</h3>
                {currentRecord.description && (
                  <p className="text-sm text-muted-foreground">{currentRecord.description}</p>
                )}
              </div>
              
              <Badge variant="secondary" className="text-lg px-4 py-2">
                {formatDuration(elapsedTime)}
              </Badge>
            </div>
          )}
          
          <div className="flex flex-col gap-2">
            {!isWorking ? (
              <Button 
                onClick={handleStartWork}
                size="lg"
                className="w-full"
              >
                업무 시작
              </Button>
            ) : (
              <Button 
                onClick={handleStopWork}
                variant="destructive"
                size="lg"
                className="w-full"
              >
                업무 종료
              </Button>
            )}
            
            <Button 
              onClick={handleCaptureScreenshot}
              variant="outline"
              size="sm"
              className="w-full"
            >
              수동 스크린샷 캡처
            </Button>
          </div>
        </CardContent>
      </Card>

      <TaskInputDialog
        open={showTaskDialog}
        onOpenChange={setShowTaskDialog}
        onSubmit={handleTaskSubmit}
        onSkip={handleTaskSkip}
      />
    </>
  );
} 