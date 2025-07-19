import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface TaskInputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (title: string, description?: string) => void;
  onSkip: () => void;
  onStartNewSession?: (title: string, description?: string) => void;
  isSessionChange?: boolean; // 세션 변경 모드인지 여부
}

export function TaskInputDialog({ 
  open, 
  onOpenChange, 
  onSubmit, 
  onSkip, 
  onStartNewSession, 
  isSessionChange = false 
}: TaskInputDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      if (isSessionChange && onStartNewSession) {
        onStartNewSession(title.trim(), description.trim() || undefined);
      } else {
        onSubmit(title.trim(), description.trim() || undefined);
      }
      resetForm();
    }
  };

  const handleSkip = () => {
    onSkip();
    resetForm();
  };

  const handleCancel = () => {
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleSkip();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>
            {isSessionChange ? '새 작업 시작' : '업무 내용 입력'}
          </DialogTitle>
          <DialogDescription>
            {isSessionChange 
              ? '새로운 작업을 시작합니다. 이전 작업은 자동으로 종료됩니다.'
              : '지금 어떤 작업을 하고 있습니까? 업무 내용을 입력하거나 건너뛸 수 있습니다.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              작업 제목 *
            </label>
            <Input
              id="title"
              type="text"
              placeholder="예: 프로젝트 개발, 회의 준비, 문서 작성 등"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              상세 설명 (선택사항)
            </label>
            <Input
              id="description"
              type="text"
              placeholder="작업에 대한 추가 설명..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancel}
              className="order-3 sm:order-1"
            >
              취소
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleSkip}
              className="order-2"
            >
              건너뛰기 (ESC)
            </Button>
            <Button
              type="submit"
              disabled={!title.trim()}
              className="order-1 sm:order-3"
            >
              {isSessionChange ? '새 작업 시작 (Enter)' : '시작하기 (Enter)'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 