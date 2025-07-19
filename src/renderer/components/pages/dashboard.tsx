import React, { useState, useEffect } from 'react';
import { WorkTimer } from '../work/work-timer';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { useSession } from '../../contexts/session-context';
import { formatDuration } from '../../lib/utils';
import type { WorkRecord } from '../../../shared/types';
import { Calendar, Clock, CheckCircle } from 'lucide-react';

export function Dashboard() {
  const [todaysSessions, setTodaysSessions] = useState<WorkRecord[]>([]);
  const { isWorking } = useSession();

  // 오늘의 세션 로드
  useEffect(() => {
    loadTodaysSessions();
  }, []);

  // 세션이 변경될 때마다 오늘의 세션 다시 로드
  useEffect(() => {
    if (!isWorking) {
      // 세션이 종료되었을 때 목록 새로고침
      loadTodaysSessions();
    }
  }, [isWorking]);

  const loadTodaysSessions = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const result = await window.electronAPI.invoke('get-work-records', { date: today });
      if (result.success) {
        const sessions = result.data?.records || [];
        setTodaysSessions(sessions);
      }
    } catch (error) {
      console.error('Failed to load today\'s sessions:', error);
    }
  };

  const completedSessions = todaysSessions.filter(session => !session.isActive);
  const totalDuration = completedSessions.reduce((total, session) => {
    return total + (session.duration || 0);
  }, 0);

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <div className="flex items-center gap-2">
          {isWorking && (
            <Badge variant="secondary" className="bg-green-600 text-white border-green-600">
              <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse" />
              작업 중
            </Badge>
          )}
        </div>
      </div>

      {/* 타이머 */}
      <WorkTimer />

      {/* 오늘의 업무 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-medium text-foreground">오늘의 업무</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            {new Date().toLocaleDateString('ko-KR', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>

        {/* 간단한 통계 */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">완료된 작업</p>
                  <p className="text-xl font-semibold text-foreground">{completedSessions.length}개</p>
                </div>
                <CheckCircle className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">총 작업시간</p>
                  <p className="text-xl font-semibold text-foreground">{formatDuration(totalDuration)}</p>
                </div>
                <Clock className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 업무 목록 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-foreground">작업 목록</CardTitle>
          </CardHeader>
          <CardContent>
            {todaysSessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                아직 오늘 작업한 기록이 없습니다.
              </div>
            ) : (
              <div className="space-y-3">
                {todaysSessions.map((session, index) => (
                  <div key={session.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">{session.title}</h4>
                      {session.description && (
                        <p className="text-sm text-muted-foreground mt-1">{session.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>{new Date(session.startTime).toLocaleTimeString('ko-KR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}</span>
                        {session.endTime && (
                          <span>→ {new Date(session.endTime).toLocaleTimeString('ko-KR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {session.isActive ? (
                        <Badge variant="secondary" className="bg-green-600 text-white border-green-600">
                          진행중
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {formatDuration(session.duration || 0)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 