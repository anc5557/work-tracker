import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { formatTime, formatDuration } from '../../lib/utils';
import { Clock, Play, Square, Camera, Folder, Tag, CheckCircle2 } from 'lucide-react';
import type { WorkRecord } from '../../../shared/types';

interface WorkRecordCardProps {
  record: WorkRecord;
  onUpdate?: () => void;
}

export function WorkRecordCard({ record, onUpdate }: WorkRecordCardProps) {
  const handleOpenScreenshot = async () => {
    if (record.screenshotPath) {
      try {
        await window.electronAPI.invoke('open-screenshot', { path: record.screenshotPath });
      } catch (error) {
        console.error('Failed to open screenshot:', error);
      }
    }
  };

  const handleShowInFolder = async () => {
    if (record.screenshotPath) {
      try {
        await window.electronAPI.showItemInFolder(record.screenshotPath);
      } catch (error) {
        console.error('Failed to show in folder:', error);
      }
    }
  };

  const getStatusBadge = () => {
    if (record.isActive) {
      return (
        <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white flex items-center gap-1">
          <Play className="w-3 h-3" />
          진행 중
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          완료
        </Badge>
      );
    }
  };

  const getDurationDisplay = () => {
    if (record.duration) {
      return formatDuration(record.duration);
    } else if (record.isActive && record.startTime) {
      // 진행 중인 작업의 경우 현재까지의 시간 계산
      const now = new Date().getTime();
      const start = new Date(record.startTime).getTime();
      return formatDuration(now - start);
    }
    return '시간 미측정';
  };

  return (
    <Card className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg group ${
      record.isActive 
        ? 'border-green-200 dark:border-green-700 bg-green-50/50 dark:bg-green-900/10 shadow-md' 
        : 'bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200/50 dark:border-gray-700/50'
    }`}>
      {/* 상태 표시 라인 */}
      <div className={`absolute top-0 left-0 w-full h-1 ${
        record.isActive 
          ? 'bg-gradient-to-r from-green-400 to-emerald-500' 
          : 'bg-gradient-to-r from-blue-400 to-indigo-500'
      }`} />
      
      {/* 타임라인 포인트 */}
      <div className="absolute -left-3 top-6 w-6 h-6 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 flex items-center justify-center">
        {record.isActive ? (
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        ) : (
          <CheckCircle2 className="w-3 h-3 text-blue-500" />
        )}
      </div>

      <CardHeader className="pb-3 pl-8">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg font-semibold">{record.title}</CardTitle>
              {record.isActive && (
                <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
                  <span className="text-xs font-medium">LIVE</span>
                </div>
              )}
            </div>
            {record.description && (
              <CardDescription className="text-sm">{record.description}</CardDescription>
            )}
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pl-8">
        {/* 시간 정보 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">시작</span>
            </div>
            <div className="font-mono text-sm font-medium pl-6">
              {formatTime(record.startTime)}
            </div>
            {record.endTime && (
              <>
                <div className="flex items-center gap-2 text-sm pt-1">
                  <Square className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">종료</span>
                </div>
                <div className="font-mono text-sm font-medium pl-6">
                  {formatTime(record.endTime)}
                </div>
              </>
            )}
          </div>
          
          <div className="text-right space-y-2">
            <div className="text-muted-foreground text-sm">소요 시간</div>
            <div className={`text-2xl font-bold font-mono ${
              record.isActive ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'
            }`}>
              {getDurationDisplay()}
            </div>
            {record.isActive && (
              <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                진행 중...
              </div>
            )}
          </div>
        </div>

        {/* 스크린샷 섹션 */}
        {record.screenshotPath && (
          <div className="bg-gray-50/80 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200/50 dark:border-gray-600/50">
            <div className="flex items-center gap-2 mb-2">
              <Camera className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">스크린샷 첨부됨</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenScreenshot}
                className="flex-1 bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800"
              >
                <Camera className="w-4 h-4 mr-2" />
                보기
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleShowInFolder}
                className="hover:bg-white dark:hover:bg-gray-800"
              >
                <Folder className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* 태그 섹션 */}
        {record.tags && record.tags.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">태그</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {record.tags.map((tag, index) => (
                <Badge 
                  key={index} 
                  variant="outline" 
                  className="text-xs bg-white/50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 