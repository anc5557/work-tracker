import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { X, Plus } from 'lucide-react';

interface TaskInputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (title: string, description?: string, tags?: string[]) => void;
  onSkip: () => void;
  onStartNewSession?: (title: string, description?: string, tags?: string[]) => void;
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
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [recentTags, setRecentTags] = useState<string[]>([]);

  // 다이얼로그가 열릴 때 최근 태그 로드
  useEffect(() => {
    if (open) {
      loadRecentTags();
    }
  }, [open]);

  const loadRecentTags = async () => {
    try {
      const result = await window.electronAPI.invoke('get-recent-tags');
      if (result.success) {
        setRecentTags(result.data || []);
      }
    } catch (error) {
      console.error('Failed to load recent tags:', error);
    }
  };

  const addTag = (tag?: string) => {
    const targetTag = tag || tagInput.trim();
    if (targetTag && !tags.includes(targetTag)) {
      setTags([...tags, targetTag]);
      if (!tag) {
        setTagInput(''); // 직접 입력한 경우만 입력창 클리어
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      if (isSessionChange && onStartNewSession) {
        onStartNewSession(title.trim(), description.trim() || undefined, tags);
      } else {
        onSubmit(title.trim(), description.trim() || undefined, tags);
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
    setTags([]);
    setTagInput('');
    setRecentTags([]);
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

          <div className="space-y-2">
            <label htmlFor="tags" className="text-sm font-medium">
              태그 (선택사항)
            </label>
            
            {/* 기존 태그 표시 */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="flex items-center gap-1 px-2 py-1"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            
            {/* 최근 태그 추천 */}
            {recentTags.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">최근 사용한 태그</div>
                <div className="flex flex-wrap gap-1">
                  {recentTags
                    .filter(recentTag => !tags.includes(recentTag))
                    .map((tag) => (
                    <Button
                      key={tag}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addTag(tag)}
                      className="h-7 px-2 text-xs bg-muted/50 hover:bg-muted border-dashed hover:border-solid transition-all"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      {tag}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            
            {/* 태그 입력 */}
            <div className="flex gap-2">
              <Input
                id="tags"
                type="text"
                placeholder="태그 입력 후 Enter 또는 추가 버튼"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyPress}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => addTag()}
                disabled={!tagInput.trim() || tags.includes(tagInput.trim())}
                className="px-3"
              >
                추가
              </Button>
            </div>
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