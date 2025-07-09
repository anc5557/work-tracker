import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { TaskInputDialog } from '../work/task-input-dialog';
import { useToast } from '../../hooks/use-toast';
import type { WorkRecord } from '../../../shared/types';

export function Dashboard() {
  const [isWorking, setIsWorking] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<WorkRecord | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [todaysSessions, setTodaysSessions] = useState<WorkRecord[]>([]);
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

  // 오늘의 세션 로드
  useEffect(() => {
    loadTodaysSessions();
  }, []);

  const loadTodaysSessions = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const result = await window.electronAPI.invoke('get-work-records', { date: today });
      if (result.success) {
        setTodaysSessions(result.data);
      }
    } catch (error) {
      console.error('Failed to load today\'s sessions:', error);
    }
  };

  const formatTime = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    
    return {
      hours: hours.toString().padStart(2, '0'),
      minutes: minutes.toString().padStart(2, '0'),
      seconds: seconds.toString().padStart(2, '0')
    };
  };

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

  const handleStopWork = async () => {
    if (!currentRecord) return;

    try {
      const result = await window.electronAPI.invoke('stop-work', { id: currentRecord.id });
      
      if (result.success) {
        setIsWorking(false);
        setCurrentRecord(null);
        setElapsedTime(0);
        loadTodaysSessions(); // 세션 목록 새로고침
        
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

  const time = formatTime(elapsedTime);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Current Session */}
        <div className="text-center space-y-6">
          <h1 className="text-3xl font-semibold">Current Session</h1>
          
          {/* Timer Display */}
          <div className="flex justify-center items-center space-x-4">
            <div className="bg-gray-800 rounded-lg p-6 min-w-[120px]">
              <div className="text-4xl font-mono font-bold">{time.hours}</div>
              <div className="text-sm text-gray-400 mt-1">Hours</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-6 min-w-[120px]">
              <div className="text-4xl font-mono font-bold">{time.minutes}</div>
              <div className="text-sm text-gray-400 mt-1">Minutes</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-6 min-w-[120px]">
              <div className="text-4xl font-mono font-bold">{time.seconds}</div>
              <div className="text-sm text-gray-400 mt-1">Seconds</div>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex justify-center space-x-4">
            {!isWorking ? (
              <Button 
                onClick={handleStartWork}
                className="bg-blue-600 hover:bg-blue-700 px-8 py-3 text-lg"
              >
                Start Work
              </Button>
            ) : (
              <Button 
                onClick={handleStopWork}
                variant="secondary"
                className="bg-gray-700 hover:bg-gray-600 px-8 py-3 text-lg"
              >
                Stop Work
              </Button>
            )}
          </div>
        </div>

        {/* Today's Sessions */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Today's Sessions</h2>
          
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="text-left p-4 font-medium">Start Time</th>
                  <th className="text-left p-4 font-medium">End Time</th>
                  <th className="text-left p-4 font-medium">Summary</th>
                </tr>
              </thead>
              <tbody>
                {todaysSessions.length > 0 ? (
                  todaysSessions.map((session, index) => (
                    <tr key={session.id} className="border-t border-gray-700">
                      <td className="p-4">{new Date(session.startTime).toLocaleTimeString('en-US', { hour12: false })}</td>
                      <td className="p-4">
                        {session.endTime 
                          ? new Date(session.endTime).toLocaleTimeString('en-US', { hour12: false })
                          : 'In Progress'
                        }
                      </td>
                      <td className="p-4">{session.title}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-gray-400">
                      아직 오늘의 작업 세션이 없습니다
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <TaskInputDialog 
        open={showTaskDialog}
        onOpenChange={setShowTaskDialog}
        onSubmit={handleTaskSubmit}
        onSkip={() => {
          setShowTaskDialog(false);
          handleTaskSubmit("기본 작업", "작업 내용 미입력");
        }}
      />
    </div>
  );
} 