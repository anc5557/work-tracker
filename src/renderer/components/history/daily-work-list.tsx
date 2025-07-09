import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { WorkRecordCard } from './work-record-card';
import { formatDate, formatDuration } from '../../lib/utils';
import { Calendar, Clock, Activity, RefreshCw, FileText } from 'lucide-react';
import type { DayWorkSummary, WorkRecord } from '../../../shared/types';

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
      
      if (result.success && result.data) {
        // 백엔드에서 DayWorkSummary 구조로 반환
        setTodayData(result.data);
      } else {
        console.error('Failed to load work records:', result.error);
        setTodayData({
          date,
          records: [],
          totalDuration: 0,
          totalRecords: 0
        });
      }
    } catch (error) {
      console.error('Failed to load work records:', error);
      setTodayData({
        date,
        records: [],
        totalDuration: 0,
        totalRecords: 0
      });
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

  const handleEditRecord = async (updatedRecord: WorkRecord) => {
    try {
      const result = await window.electronAPI.invoke('save-work-record', updatedRecord);
      if (result.success) {
        await loadWorkRecords(selectedDate);
      } else {
        console.error('Failed to update work record:', result.error);
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Failed to update work record:', error);
      throw error;
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    try {
      const result = await window.electronAPI.invoke('delete-work-record', { id: recordId });
      if (result.success) {
        await loadWorkRecords(selectedDate);
      } else {
        console.error('Failed to delete work record:', result.error);
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Failed to delete work record:', error);
      throw error;
    }
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  return (
    <Card className="relative overflow-hidden bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-0 shadow-xl">
      {/* 배경 그래디언트 */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/3 to-pink-500/5" />
      
      <CardHeader className="relative">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">
                  {isToday ? '오늘의 업무' : formatDate(selectedDate)}
                </CardTitle>
                <CardDescription className="flex items-center gap-4 text-base">
                  {todayData ? (
                    <>
                      <span className="flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        {todayData.totalRecords}개 작업
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatDuration(todayData.totalDuration)}
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">업무 기록이 없습니다</span>
                  )}
                </CardDescription>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {todayData && todayData.totalRecords > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700">
                  <Activity className="w-3 h-3 mr-1" />
                  {todayData.totalRecords}개 완료
                </Badge>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
              className="bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 transition-all duration-200"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? '로딩...' : '새로고침'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="relative">
              <div className="w-8 h-8 border-4 border-indigo-200 dark:border-indigo-800 rounded-full animate-spin"></div>
              <div className="absolute inset-0 w-8 h-8 border-4 border-transparent border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin"></div>
            </div>
            <div className="text-muted-foreground">데이터를 불러오는 중...</div>
          </div>
        ) : todayData && todayData.records && todayData.records.length > 0 ? (
          <div className="space-y-4">
            {/* 요약 통계 */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50/80 dark:bg-gray-700/30 rounded-xl border border-gray-200/50 dark:border-gray-600/50">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {todayData.totalRecords}
                </div>
                <div className="text-xs text-muted-foreground">총 작업</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {Math.round(todayData.totalDuration / 3600000)}h
                </div>
                <div className="text-xs text-muted-foreground">총 시간</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {todayData?.records?.filter((r: WorkRecord) => r.screenshotPath)?.length || 0}
                </div>
                <div className="text-xs text-muted-foreground">스크린샷</div>
              </div>
            </div>
            
            {/* 작업 목록 */}
            <ScrollArea className="h-[400px]">
              <div className="space-y-3 pr-4">
                {(todayData.records || []).map((record, index) => (
                  <div key={record.id} className="group">
                    <div className="relative">
                      {/* 타임라인 연결선 */}
                      {index > 0 && (
                        <div className="absolute -top-3 left-3 w-0.5 h-3 bg-gray-200 dark:bg-gray-600"></div>
                      )}
                      
                      <WorkRecordCard 
                        record={record} 
                        onUpdate={() => loadWorkRecords(selectedDate)}
                        onEdit={handleEditRecord}
                        onDelete={handleDeleteRecord}
                      />
                    </div>
                    
                    {index < (todayData.records?.length || 0) - 1 && (
                      <div className="flex items-center gap-2 my-3 opacity-60">
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent"></div>
                        <div className="text-xs text-muted-foreground">다음 작업</div>
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent"></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className="text-center py-16 space-y-6">
            <div className="flex justify-center">
              <div className="p-6 bg-gray-100 dark:bg-gray-700/50 rounded-full">
                <FileText className="w-12 h-12 text-gray-400 dark:text-gray-500" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-lg font-medium text-muted-foreground">
                {isToday ? '아직 오늘의 업무 기록이 없습니다' : '이 날짜에 업무 기록이 없습니다'}
              </div>
              {isToday && (
                <div className="text-sm text-muted-foreground max-w-md mx-auto">
                  상단의 "업무 시작하기" 버튼을 클릭하여 첫 번째 작업을 시작해보세요. 
                  모든 작업 시간과 스크린샷이 자동으로 기록됩니다.
                </div>
              )}
            </div>
            {isToday && (
              <Button 
                variant="outline" 
                size="lg"
                className="bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 transition-all duration-200"
                onClick={() => {
                  // 업무 시작 버튼으로 스크롤
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <Activity className="w-4 h-4 mr-2" />
                업무 시작하기
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 