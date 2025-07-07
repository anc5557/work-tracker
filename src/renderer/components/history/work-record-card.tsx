import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { formatTime, formatDuration } from '../../lib/utils';
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
        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
          진행 중
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary">
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
    <Card className={`transition-all ${record.isActive ? 'border-primary shadow-md' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{record.title}</CardTitle>
            {record.description && (
              <CardDescription>{record.description}</CardDescription>
            )}
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">시작:</span>
              <span className="font-mono">{formatTime(record.startTime)}</span>
            </div>
            {record.endTime && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">종료:</span>
                <span className="font-mono">{formatTime(record.endTime)}</span>
              </div>
            )}
          </div>
          
          <div className="text-right">
            <div className="text-lg font-semibold">
              {getDurationDisplay()}
            </div>
            {record.isActive && (
              <div className="text-xs text-muted-foreground">진행 중...</div>
            )}
          </div>
        </div>

        {record.screenshotPath && (
          <div className="flex gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenScreenshot}
              className="flex-1"
            >
              스크린샷 보기
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShowInFolder}
            >
              폴더에서 보기
            </Button>
          </div>
        )}

        {record.tags && record.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-2 border-t">
            {record.tags.map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 