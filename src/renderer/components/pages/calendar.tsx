import React, { useState, useEffect } from 'react';
import { Calendar as CalendarComponent } from '../ui/calendar';
import { Button } from '../ui/button';
import { ChevronLeft, ChevronRight, Briefcase } from 'lucide-react';
import type { WorkRecord } from '../../../shared/types';

export function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [workSessions, setWorkSessions] = useState<WorkRecord[]>([]);

  // 현재 달과 다음 달 표시
  const getMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
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
  };

  // 선택된 날짜의 작업 세션 로드
  useEffect(() => {
    if (selectedDate) {
      loadWorkSessions(selectedDate);
    }
  }, [selectedDate]);

  const loadWorkSessions = async (date: Date) => {
    try {
      const dateString = date.toISOString().split('T')[0];
      const result = await window.electronAPI.invoke('get-work-records', { date: dateString });
      if (result.success) {
        setWorkSessions(result.data);
      }
    } catch (error) {
      console.error('Failed to load work sessions:', error);
      setWorkSessions([]);
    }
  };

  // 달력 컴포넌트를 직접 구현 (shadcn calendar 대신)
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
      
      currentWeek.push(
        <div
          key={i}
          onClick={() => isCurrentMonth && setSelectedDate(cellDate)}
          className={`
            aspect-square flex items-center justify-center text-sm cursor-pointer transition-colors
            ${isCurrentMonth ? 'text-white hover:bg-gray-700' : 'text-gray-600'}
            ${isToday ? 'bg-blue-600 text-white rounded-full' : ''}
            ${isSelected && !isToday ? 'bg-gray-700 rounded-full' : ''}
          `}
        >
          {cellDate.getDate()}
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
          <div>S</div>
          <div>M</div>
          <div>T</div>
          <div>W</div>
          <div>T</div>
          <div>F</div>
          <div>S</div>
        </div>
        {/* 날짜 그리드 */}
        {weeks}
      </div>
    );
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', { 
      hour: 'numeric',
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <h1 className="text-3xl font-semibold">Calendar</h1>
        
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

        {/* Calendar Grid */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-medium mb-4 text-center">{getCurrentMonth()}</h3>
            {renderCalendar(0)}
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-medium mb-4 text-center">{getNextMonth()}</h3>
            {renderCalendar(1)}
          </div>
        </div>

        {/* Work Sessions */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Work Sessions</h2>
          
          {selectedDate && (
            <p className="text-gray-400 mb-4">
              {selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          )}
          
          <div className="space-y-3">
            {workSessions.length > 0 ? (
              workSessions.map((session) => (
                <div key={session.id} className="bg-gray-800 rounded-lg p-4 flex items-center space-x-4">
                  <div className="bg-gray-700 p-2 rounded">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{session.title}</h3>
                    <p className="text-sm text-gray-400">
                      {formatTime(session.startTime)} - {session.endTime ? formatTime(session.endTime) : 'In Progress'}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-gray-800 rounded-lg p-8 text-center text-gray-400">
                선택된 날짜에 작업 세션이 없습니다
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 