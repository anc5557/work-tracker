import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { WorkRecordCard } from './work-record-card';
import { formatDate, formatDuration } from '../../lib/utils';
import type { DayWorkSummary } from '../../../shared/types';

export function DailyWorkList() {
  const [todayData, setTodayData] = useState<DayWorkSummary | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState(false);

  const loadWorkRecords = async (date: string) => {
    setLoading(true);
    try {
      const result = await window.electronAPI.invoke('get-work-records', { date });
      
      if (result.success) {
        setTodayData(result.data);
      } else {
        console.error('Failed to load work records:', result.error);
        setTodayData(null);
      }
    } catch (error) {
      console.error('Failed to load work records:', error);
      setTodayData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkRecords(selectedDate);
  }, [selectedDate]);

  const handleRefresh = () => {
    loadWorkRecords(selectedDate);
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>
              {isToday ? '오늘의 업무' : formatDate(selectedDate)}
            </CardTitle>
            <CardDescription>
              {todayData ? 
                `총 ${todayData.totalRecords}개 작업, ${formatDuration(todayData.totalDuration)}` :
                '업무 기록이 없습니다'
              }
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            {todayData && todayData.totalRecords > 0 && (
              <Badge variant="secondary">
                {todayData.totalRecords}개 작업
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              {loading ? '로딩...' : '새로고침'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="text-muted-foreground">로딩 중...</div>
          </div>
        ) : todayData && todayData.records.length > 0 ? (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {todayData.records.map((record, index) => (
                <div key={record.id}>
                  <WorkRecordCard 
                    record={record} 
                    onUpdate={() => loadWorkRecords(selectedDate)}
                  />
                  {index < todayData.records.length - 1 && (
                    <Separator className="mt-3" />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8 space-y-2">
            <div className="text-muted-foreground">
              {isToday ? '아직 오늘의 업무 기록이 없습니다.' : '이 날짜에 업무 기록이 없습니다.'}
            </div>
            {isToday && (
              <div className="text-sm text-muted-foreground">
                위의 "업무 시작" 버튼을 클릭하여 업무를 시작해보세요.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 