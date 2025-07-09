import React, { useState, useEffect } from 'react';
import { WorkTimer } from '../work/work-timer';
import { DailyWorkList } from '../history/daily-work-list';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { useSession } from '../../contexts/session-context';
import { formatDuration } from '../../lib/utils';
import type { WorkRecord } from '../../../shared/types';
import { 
  Clock, 
  Target, 
  BarChart3, 
  Calendar,
  Play,
  CheckCircle,
  Timer
} from 'lucide-react';

export function Dashboard() {
  const [todaysSessions, setTodaysSessions] = useState<WorkRecord[]>([]);
  const [todayStats, setTodayStats] = useState({
    totalDuration: 0,
    completedSessions: 0,
    averageSessionTime: 0
  });
  const { isWorking, currentRecord, elapsedTime } = useSession();

  // 오늘의 세션 로드
  useEffect(() => {
    loadTodaysSessions();
  }, []);

  // 세션이 변경될 때마다 오늘의 세션 다시 로드
  useEffect(() => {
    if (!isWorking && currentRecord === null) {
      // 세션이 종료되었을 때 목록 새로고침
      loadTodaysSessions();
    }
  }, [isWorking, currentRecord]);

  const loadTodaysSessions = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const result = await window.electronAPI.invoke('get-work-records', { date: today });
      if (result.success) {
        const sessions = result.data || [];
        setTodaysSessions(sessions);
        
        // 통계 계산
        const completedSessions = sessions.filter((s: WorkRecord) => !s.isActive);
        const totalDuration = completedSessions.reduce((total: number, session: WorkRecord) => {
          return total + (session.duration || 0);
        }, 0);
        const averageSessionTime = completedSessions.length > 0 
          ? totalDuration / completedSessions.length 
          : 0;

        setTodayStats({
          totalDuration,
          completedSessions: completedSessions.length,
          averageSessionTime
        });
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

  const currentTime = formatTime(elapsedTime);

  return (
    <div className="space-y-8 p-6">
      {/* 현재 세션 섹션 */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            업무 대시보드
          </h1>
          <div className="flex items-center gap-2">
            {isWorking && (
              <Badge variant="default" className="bg-green-500 text-white animate-pulse">
                <Play className="w-3 h-3 mr-1" />
                진행 중
              </Badge>
            )}
          </div>
        </div>

        {/* 메인 타이머 영역 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 현재 세션 타이머 */}
          <div className="lg:col-span-2">
            <WorkTimer />
          </div>

          {/* 오늘의 통계 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              오늘의 통계
            </h3>
            
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">총 작업 시간</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {formatDuration(todayStats.totalDuration)}
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">완료된 세션</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {todayStats.completedSessions}개
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">평균 세션 시간</p>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {formatDuration(todayStats.averageSessionTime)}
                    </p>
                  </div>
                  <Timer className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* 현재 진행 중인 세션 상세 정보 */}
      {isWorking && currentRecord && (
        <Card className="bg-gradient-to-r from-green-500/10 via-emerald-500/5 to-teal-500/10 border-green-200 dark:border-green-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <Target className="w-5 h-5" />
              현재 진행 중인 작업
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-lg mb-2">{currentRecord.title}</h3>
                {currentRecord.description && (
                  <p className="text-gray-600 dark:text-gray-400">{currentRecord.description}</p>
                )}
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                  시작 시간: {new Date(currentRecord.startTime).toLocaleString('ko-KR')}
                </p>
              </div>
              <div className="flex items-center justify-center md:justify-end">
                <div className="text-center">
                  <div className="text-4xl font-mono font-bold text-green-600 dark:text-green-400">
                    {currentTime.hours}:{currentTime.minutes}:{currentTime.seconds}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">경과 시간</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 오늘의 세션 목록 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            오늘의 작업 기록
          </h2>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Calendar className="w-4 h-4" />
            {new Date().toLocaleDateString('ko-KR', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>

        <DailyWorkList />
      </div>

      {/* 빠른 액션 */}
      {!isWorking && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">새로운 작업을 시작하세요!</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              생산적인 하루를 위해 지금 바로 작업을 시작해보세요.
            </p>
            <div className="flex items-center justify-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <BarChart3 className="w-4 h-4" />
                <span>진행률을 추적하고 성과를 분석하세요</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 