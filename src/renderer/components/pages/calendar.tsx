import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarComponent } from '../ui/calendar';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  Briefcase, 
  Plus, 
  Calendar as CalendarIcon,
  Clock,
  BarChart3,
  Users
} from 'lucide-react';
import { TaskInputDialog } from '../work/task-input-dialog';
import type { WorkRecord } from '../../../shared/types';

interface MonthStats {
  totalDuration: number;
  totalSessions: number;
  totalDays: number;
  averageSessionDuration: number;
}

interface DayData {
  date: string;
  hasWork: boolean;
  sessionCount: number;
  totalDuration: number;
}

export function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedRange, setSelectedRange] = useState<Date[]>([]);
  const [workSessions, setWorkSessions] = useState<WorkRecord[]>([]);
  const [monthStats, setMonthStats] = useState<MonthStats>({
    totalDuration: 0,
    totalSessions: 0,
    totalDays: 0,
    averageSessionDuration: 0
  });
  const [monthWorkData, setMonthWorkData] = useState<Map<string, DayData>>(new Map());
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [selectedDateForTask, setSelectedDateForTask] = useState<Date | null>(null);
  
  // 드래그 선택을 위한 상태
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Date | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // 현재 달과 다음 달 표시
  const getMonthYear = (date: Date) => {
    return date.toLocaleDateString('ko-KR', { month: 'long', year: 'numeric' });
  };

  const getCurrentMonth = () => getMonthYear(currentDate);
  const getNextMonth = () => {
    const nextMonth = new Date(currentDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return getMonthYear(nextMonth);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
    setSelectedRange([]); // 월 변경 시 선택 범위 초기화
  };

  // 월별 통계 및 업무 데이터 로드
  useEffect(() => {
    loadMonthData(currentDate);
  }, [currentDate]);

  // 선택된 날짜의 작업 세션 로드
  useEffect(() => {
    if (selectedDate) {
      loadWorkSessions(selectedDate);
    }
  }, [selectedDate]);

  const loadMonthData = async (date: Date) => {
    try {
      // 월별 통계 로드 (새로운 핸들러 사용)
      const year = date.getFullYear();
      const month = date.getMonth(); // 0-based month
      
      const statsResult = await window.electronAPI.invoke('get-month-stats', { year, month });
      if (statsResult.success) {
        setMonthStats(statsResult.data);
      } else {
        console.error('Failed to load month stats:', statsResult.error);
        // 기본값 설정
        setMonthStats({
          totalDuration: 0,
          totalSessions: 0,
          totalDays: 0,
          averageSessionDuration: 0
        });
      }

      // 해당 월의 모든 날짜에 대한 업무 데이터 로드
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const newMonthData = new Map<string, DayData>();

      for (let day = 1; day <= daysInMonth; day++) {
        const dayDate = new Date(year, month, day);
        const dateString = dayDate.toISOString().split('T')[0];
        
        try {
          const result = await window.electronAPI.invoke('get-work-records', { date: dateString });
          if (result.success && result.data.records && result.data.records.length > 0) {
            newMonthData.set(dateString, {
              date: dateString,
              hasWork: true,
              sessionCount: result.data.records.length,
              totalDuration: result.data.totalDuration || 0
            });
          }
        } catch (error) {
          console.error(`Failed to load data for ${dateString}:`, error);
        }
      }

      setMonthWorkData(newMonthData);
    } catch (error) {
      console.error('Failed to load month data:', error);
      // 에러 시 기본값 설정
      setMonthStats({
        totalDuration: 0,
        totalSessions: 0,
        totalDays: 0,
        averageSessionDuration: 0
      });
    }
  };

  const loadWorkSessions = async (date: Date) => {
    try {
      const dateString = date.toISOString().split('T')[0];
      const result = await window.electronAPI.invoke('get-work-records', { date: dateString });
      if (result.success) {
        setWorkSessions(result.data.records || []);
      }
    } catch (error) {
      console.error('Failed to load work sessions:', error);
      setWorkSessions([]);
    }
  };

  // 드래그 시작
  const handleMouseDown = (date: Date, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return;
    
    setIsDragging(true);
    setDragStart(date);
    setSelectedRange([date]);
    setSelectedDate(date);
  };

  // 드래그 중
  const handleMouseEnter = (date: Date, isCurrentMonth: boolean) => {
    if (!isDragging || !dragStart || !isCurrentMonth) return;
    
    const startTime = dragStart.getTime();
    const endTime = date.getTime();
    const range: Date[] = [];
    
    const start = Math.min(startTime, endTime);
    const end = Math.max(startTime, endTime);
    
    for (let time = start; time <= end; time += 24 * 60 * 60 * 1000) {
      range.push(new Date(time));
    }
    
    setSelectedRange(range);
  };

  // 드래그 종료
  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  // 더블클릭으로 업무 추가
  const handleDoubleClick = (date: Date, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return;
    setSelectedDateForTask(date);
    setIsTaskDialogOpen(true);
  };

  // 새 업무 추가
  const handleTaskSubmit = async (title: string, description?: string) => {
    if (!selectedDateForTask) return;

    try {
      const result = await window.electronAPI.invoke('start-work', {
        title,
        description
      });

      if (result.success) {
        setIsTaskDialogOpen(false);
        setSelectedDateForTask(null);
        
        // 해당 날짜가 선택되어 있으면 업무 세션을 다시 로드
        if (selectedDate && selectedDate.toDateString() === selectedDateForTask.toDateString()) {
          loadWorkSessions(selectedDate);
        }
        
        // 월별 데이터도 다시 로드
        loadMonthData(currentDate);
      }
    } catch (error) {
      console.error('Failed to create new task:', error);
    }
  };

  const handleTaskSkip = () => {
    setIsTaskDialogOpen(false);
    setSelectedDateForTask(null);
  };

  // 달력 컴포넌트 렌더링
  const renderCalendar = (monthOffset: number) => {
    const displayDate = new Date(currentDate);
    displayDate.setMonth(displayDate.getMonth() + monthOffset);
    
    const year = displayDate.getFullYear();
    const month = displayDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const weeks = [];
    let currentWeek = [];
    
    for (let i = 0; i < 42; i++) { // 6주 x 7일
      const cellDate = new Date(startDate);
      cellDate.setDate(startDate.getDate() + i);
      
      const isCurrentMonth = cellDate.getMonth() === month;
      const isToday = cellDate.toDateString() === new Date().toDateString();
      const isSelected = selectedDate && cellDate.toDateString() === selectedDate.toDateString();
      const isInRange = selectedRange.some(d => d.toDateString() === cellDate.toDateString());
      
      // 해당 날짜의 업무 데이터
      const dateString = cellDate.toISOString().split('T')[0];
      const dayData = monthWorkData.get(dateString);
      const hasWork = dayData?.hasWork || false;
      const sessionCount = dayData?.sessionCount || 0;
      
      currentWeek.push(
        <div
          key={i}
          onClick={() => handleDateClick(cellDate, isCurrentMonth)}
          onMouseDown={() => handleMouseDown(cellDate, isCurrentMonth)}
          onMouseEnter={() => handleMouseEnter(cellDate, isCurrentMonth)}
          onMouseUp={handleMouseUp}
          onDoubleClick={() => handleDoubleClick(cellDate, isCurrentMonth)}
          className={`
            relative aspect-square flex flex-col items-center justify-center text-sm cursor-pointer transition-all duration-200 select-none
            ${isCurrentMonth ? 'text-white hover:bg-gray-700' : 'text-gray-600'}
            ${isToday ? 'bg-blue-600 text-white rounded-lg' : ''}
            ${isSelected && !isToday ? 'bg-gray-700 rounded-lg' : ''}
            ${isInRange && !isSelected && !isToday ? 'bg-gray-800 rounded' : ''}
            ${hasWork ? 'font-medium' : ''}
          `}
        >
          <span className="mb-1">{cellDate.getDate()}</span>
          
          {/* 업무 표시 점 */}
          {hasWork && (
            <div className="flex space-x-0.5 absolute bottom-1">
              {Array.from({ length: Math.min(sessionCount, 3) }).map((_, idx) => (
                <div
                  key={idx}
                  className={`w-1.5 h-1.5 rounded-full ${
                    sessionCount > 3 && idx === 2 ? 'bg-yellow-400' : 'bg-green-400'
                  }`}
                />
              ))}
              {sessionCount > 3 && (
                <span className="text-xs text-yellow-400 ml-1">+</span>
              )}
            </div>
          )}
        </div>
      );
      
      if (currentWeek.length === 7) {
        weeks.push(
          <div key={weeks.length} className="grid grid-cols-7 gap-1">
            {currentWeek}
          </div>
        );
        currentWeek = [];
      }
    }
    
    return (
      <div className="space-y-2">
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 gap-1 text-center text-sm font-medium text-gray-400 mb-2">
          <div>일</div>
          <div>월</div>
          <div>화</div>
          <div>수</div>
          <div>목</div>
          <div>금</div>
          <div>토</div>
        </div>
        {/* 날짜 그리드 */}
        {weeks}
      </div>
    );
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ko-KR', { 
      hour: 'numeric',
      minute: '2-digit',
      hour12: false
    });
  };

  const formatDuration = (ms: number) => {
    // NaN 또는 유효하지 않은 값 처리
    if (!ms || isNaN(ms) || ms < 0) {
      return '0시간 0분';
    }
    
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}시간 ${minutes}분`;
  };

  // 단일 클릭으로 날짜 선택
  const handleDateClick = (date: Date, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return;
    setSelectedDate(date);
    setSelectedRange([date]); // 단일 선택으로 범위 초기화
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8" ref={calendarRef}>
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold">📅 Calendar</h1>
          
          {/* 월별 통계 요약 */}
          <div className="flex space-x-4">
            <Card className="bg-gray-800 border-gray-700 px-4 py-2">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-gray-300">이번 달</span>
                <span className="font-medium">{formatDuration(monthStats.totalDuration)}</span>
              </div>
            </Card>
            <Card className="bg-gray-800 border-gray-700 px-4 py-2">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-green-400" />
                <span className="text-sm text-gray-300">세션</span>
                <span className="font-medium">{monthStats.totalSessions}개</span>
              </div>
            </Card>
            <Card className="bg-gray-800 border-gray-700 px-4 py-2">
              <div className="flex items-center space-x-2">
                <CalendarIcon className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-gray-300">활동일</span>
                <span className="font-medium">{monthStats.totalDays}일</span>
              </div>
            </Card>
          </div>
        </div>
        
        {/* Calendar Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateMonth('prev')}
            className="text-gray-300 hover:text-white"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex space-x-16 text-lg font-medium">
            <span>{getCurrentMonth()}</span>
            <span>{getNextMonth()}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateMonth('next')}
            className="text-gray-300 hover:text-white"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* 범례 */}
        <div className="flex items-center justify-center space-x-6 text-sm text-gray-400 mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-400 rounded-full" />
            <span>업무 있음</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-600 rounded-lg" />
            <span>오늘</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gray-700 rounded-lg" />
            <span>선택됨</span>
          </div>
          <span>💡 더블클릭: 업무 추가 | 드래그: 범위 선택</span>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <Card className="bg-gray-800 border-gray-700 p-6">
            <h3 className="text-lg font-medium mb-4 text-center">{getCurrentMonth()}</h3>
            {renderCalendar(0)}
          </Card>
          <Card className="bg-gray-800 border-gray-700 p-6">
            <h3 className="text-lg font-medium mb-4 text-center">{getNextMonth()}</h3>
            {renderCalendar(1)}
          </Card>
        </div>

        {/* Work Sessions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">업무 세션</h2>
            {selectedRange.length > 1 && (
              <Badge variant="secondary" className="bg-blue-600 text-white">
                {selectedRange.length}일 선택됨
              </Badge>
            )}
          </div>
          
          {selectedDate && (
            <p className="text-gray-400 mb-4">
              {selectedDate.toLocaleDateString('ko-KR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
              {selectedRange.length > 1 && ` 외 ${selectedRange.length - 1}일`}
            </p>
          )}
          
          <div className="space-y-3">
            {workSessions.length > 0 ? (
              workSessions.map((session) => (
                <Card key={session.id} className="bg-gray-800 border-gray-700 p-4">
                  <div className="flex items-center space-x-4">
                    <div className="bg-gray-700 p-2 rounded">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{session.title}</h3>
                      <p className="text-sm text-gray-400">
                        {formatTime(session.startTime)} - {session.endTime ? formatTime(session.endTime) : '진행 중'}
                        {session.duration && (
                          <span className="ml-2 text-green-400">
                            ({formatDuration(session.duration)})
                          </span>
                        )}
                      </p>
                      {session.description && (
                        <p className="text-sm text-gray-500 mt-1">{session.description}</p>
                      )}
                    </div>
                    <div className="flex space-x-1">
                      {session.tags?.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="bg-gray-800 border-gray-700 p-8 text-center text-gray-400">
                <div className="space-y-2">
                  <CalendarIcon className="w-8 h-8 mx-auto text-gray-600" />
                  <p>선택된 날짜에 작업 세션이 없습니다</p>
                  <p className="text-sm">날짜를 더블클릭하여 새 업무를 추가하세요</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Task Input Dialog */}
      <TaskInputDialog
        open={isTaskDialogOpen}
        onOpenChange={setIsTaskDialogOpen}
        onSubmit={handleTaskSubmit}
        onSkip={handleTaskSkip}
      />
    </div>
  );
} 