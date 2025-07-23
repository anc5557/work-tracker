import React from 'react';
import { WorkRecord } from '@/shared/types';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Clock, Calendar, FileText, ArrowLeft, Tag } from 'lucide-react';

interface TagDetailViewProps {
  tagName: string;
  records: WorkRecord[];
  onBack: () => void;
}

const formatDuration = (milliseconds: number) => {
  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

export function TagDetailView({ tagName, records, onBack }: TagDetailViewProps) {
  const totalDuration = records.reduce((sum, record) => sum + (record.duration || 0), 0);
  const averageDuration = records.length > 0 ? totalDuration / records.length : 0;

  // 날짜별로 그룹화
  const recordsByDate = records.reduce((groups, record) => {
    const date = new Date(record.startTime).toISOString().split('T')[0];
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(record);
    return groups;
  }, {} as Record<string, WorkRecord[]>);

  const sortedDates = Object.keys(recordsByDate).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>뒤로가기</span>
          </Button>
          <div className="flex items-center space-x-3">
            <Tag className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-semibold text-foreground">{tagName}</h2>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">총 시간</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatDuration(totalDuration)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">총 기록 수</CardTitle>
            <FileText className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{records.length}건</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">평균 시간</CardTitle>
            <Calendar className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatDuration(averageDuration)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Records List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">업무 기록 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>해당 태그의 업무 기록이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {sortedDates.map(date => (
                <div key={date} className="space-y-3">
                  <div className="flex items-center space-x-2 text-sm font-medium text-muted-foreground border-b border-border pb-2">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(date)}</span>
                    <span className="text-xs">
                      ({recordsByDate[date].length}건, {formatDuration(recordsByDate[date].reduce((sum, r) => sum + (r.duration || 0), 0))})
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    {recordsByDate[date].map(record => (
                      <div
                        key={record.id}
                        className="p-4 border border-border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-foreground mb-1">{record.title}</h4>
                            {record.description && (
                              <p className="text-sm text-muted-foreground mb-2">{record.description}</p>
                            )}
                          </div>
                          <div className="text-right text-sm text-muted-foreground ml-4">
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatDuration(record.duration || 0)}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <span>시작: {formatTime(record.startTime)}</span>
                            {record.endTime && (
                              <span>종료: {formatTime(record.endTime)}</span>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {record.tags && record.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {record.tags.map(tag => (
                                  <Badge
                                    key={tag}
                                    variant="outline"
                                    className={`text-xs ${
                                      tag === tagName 
                                        ? 'bg-primary/10 text-primary border-primary' 
                                        : 'bg-muted text-muted-foreground'
                                    }`}
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}