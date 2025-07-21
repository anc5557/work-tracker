import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { Separator } from '../ui/separator';
import { formatDuration } from '../../lib/utils';
import { Clock, Play, Square, Plus, ArrowRight } from 'lucide-react';
import type { WorkRecord, ScreenshotData } from '../../../shared/types';

interface WorkStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentRecord: WorkRecord | null;
  elapsedTime: number;
  screenshot?: ScreenshotData;
  onContinue: () => void;
  onSwitchWork: (title: string, description?: string) => void;
  onStop: () => void;
}

export function WorkStatusDialog({
  open,
  onOpenChange,
  currentRecord,
  elapsedTime,
  screenshot,
  onContinue,
  onSwitchWork,
  onStop
}: WorkStatusDialogProps) {
  const [showNewWorkForm, setShowNewWorkForm] = useState(false);
  const [newWorkTitle, setNewWorkTitle] = useState('');
  const [newWorkDescription, setNewWorkDescription] = useState('');

  const handleContinue = () => {
    onContinue();
    onOpenChange(false);
  };

  const handleSwitchWork = () => {
    if (showNewWorkForm) {
      if (newWorkTitle.trim()) {
        onSwitchWork(newWorkTitle.trim(), newWorkDescription.trim() || undefined);
        onOpenChange(false);
        // 폼 리셋
        setNewWorkTitle('');
        setNewWorkDescription('');
        setShowNewWorkForm(false);
      }
    } else {
      setShowNewWorkForm(true);
    }
  };

  const handleStop = () => {
    onStop();
    onOpenChange(false);
  };

  const handleClose = () => {
    // 다이얼로그 닫을 때 폼 상태 리셋
    setShowNewWorkForm(false);
    setNewWorkTitle('');
    setNewWorkDescription('');
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && showNewWorkForm && newWorkTitle.trim()) {
      handleSwitchWork();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="w-5 h-5 text-green-500" />
            업무 진행 상태
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 현재 업무 정보 */}
          {currentRecord && (
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  {/* 업무 제목과 상태 */}
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-lg">{currentRecord.title}</h3>
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1" />
                      진행 중
                    </Badge>
                  </div>

                  {/* 업무 설명 */}
                  {currentRecord.description && (
                    <p className="text-muted-foreground text-sm">
                      {currentRecord.description}
                    </p>
                  )}

                  {/* 경과 시간 */}
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">경과 시간:</span>
                    <span className="font-mono font-semibold text-green-600">
                      {formatDuration(elapsedTime)}
                    </span>
                  </div>

                  {/* 시작 시간 */}
                  <div className="text-xs text-muted-foreground">
                    시작: {new Date(currentRecord.startTime).toLocaleString('ko-KR')}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 새 업무 입력 폼 */}
          {showNewWorkForm && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ArrowRight className="w-4 h-4 text-blue-500" />
                  새로운 업무로 전환
                </div>
                
                <div className="space-y-2">
                  <Input
                    placeholder="새로운 업무 제목을 입력하세요"
                    value={newWorkTitle}
                    onChange={(e) => setNewWorkTitle(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    className="focus:border-blue-500"
                  />
                  <Input
                    placeholder="업무 설명 (선택사항)"
                    value={newWorkDescription}
                    onChange={(e) => setNewWorkDescription(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                </div>
              </div>
            </>
          )}

          {/* 액션 버튼들 */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              onClick={handleContinue}
              className="flex flex-col items-center gap-1 h-16 text-xs"
            >
              <Play className="w-4 h-4" />
              계속 진행
            </Button>
            
            <Button
              variant={showNewWorkForm ? "default" : "outline"}
              onClick={handleSwitchWork}
              disabled={showNewWorkForm && !newWorkTitle.trim()}
              className="flex flex-col items-center gap-1 h-16 text-xs"
            >
              <Plus className="w-4 h-4" />
              {showNewWorkForm ? '전환하기' : '다른 업무'}
            </Button>
            
            <Button
              variant="destructive"
              onClick={handleStop}
              className="flex flex-col items-center gap-1 h-16 text-xs"
            >
              <Square className="w-4 h-4" />
              업무 중지
            </Button>
          </div>

          {/* 취소 버튼 */}
          {showNewWorkForm && (
            <Button
              variant="ghost"
              onClick={() => setShowNewWorkForm(false)}
              className="w-full"
            >
              취소
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 