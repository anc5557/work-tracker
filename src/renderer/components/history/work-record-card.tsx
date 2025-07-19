import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { formatTime, formatDuration } from '../../lib/utils';
import { Clock, Play, Square, Camera, Folder, Tag, CheckCircle2, Edit3, Trash2, MoreVertical, ExternalLink } from 'lucide-react';
import type { WorkRecord } from '../../../shared/types';

interface WorkRecordCardProps {
  record: WorkRecord;
  onUpdate?: () => void;
  onDelete?: (id: string) => void;
  onEdit?: (record: WorkRecord) => void;
}

export function WorkRecordCard({ record, onUpdate, onDelete, onEdit }: WorkRecordCardProps) {
  const navigate = useNavigate();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(record.title);
  const [editDescription, setEditDescription] = useState(record.description || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleOpenScreenshot = async () => {
    if (record.screenshotPath) {
      try {
        const result = await window.electronAPI.invoke('open-screenshot', { path: record.screenshotPath });
        if (!result.success) {
          console.error('Failed to open screenshot:', result.error);
        }
      } catch (error) {
        console.error('Failed to open screenshot:', error);
      }
    }
  };

  const handleShowInFolder = async () => {
    if (record.screenshotPath) {
      try {
        const result = await window.electronAPI.showItemInFolder(record.screenshotPath);
        if (!result.success) {
          console.error('Failed to show in folder:', result.error);
        }
      } catch (error) {
        console.error('Failed to show in folder:', error);
      }
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // 버튼이나 액션 영역을 클릭한 경우 카드 클릭 이벤트 방지
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('[data-action]')) {
      return;
    }
    navigate(`/session/${record.id}`);
  };

  const handleEdit = async () => {
    if (!editTitle.trim()) return;
    
    setIsLoading(true);
    try {
      const updatedRecord: WorkRecord = {
        ...record,
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
      };
      
      if (onEdit) {
        onEdit(updatedRecord);
      }
      
      setIsEditDialogOpen(false);
      onUpdate?.();
    } catch (error) {
      console.error('Failed to edit record:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      if (onDelete) {
        onDelete(record.id);
      }
      setIsDeleteDialogOpen(false);
      onUpdate?.();
    } catch (error) {
      console.error('Failed to delete record:', error);
    } finally {
      setIsLoading(false);
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
    <>
      <Card 
        className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg group cursor-pointer ${
          record.isActive 
            ? 'border-green-200 dark:border-green-700 bg-green-50/50 dark:bg-green-900/10 shadow-md' 
            : 'bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200/50 dark:border-gray-700/50'
        }`}
        onClick={handleCardClick}
      >
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

        {/* 액션 버튼 그룹 */}
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200" data-action>
          <div className="flex items-center gap-1 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg border border-gray-200/50 dark:border-gray-700/50 p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/session/${record.id}`);
              }}
              className="h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30"
              title="세션 상세보기"
            >
              <ExternalLink className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setEditTitle(record.title);
                setEditDescription(record.description || '');
                setIsEditDialogOpen(true);
              }}
              className="h-8 w-8 p-0 hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
              title="편집"
            >
              <Edit3 className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsDeleteDialogOpen(true);
              }}
              className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-900/30"
              title="삭제"
            >
              <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
            </Button>
          </div>
        </div>

        <CardHeader className="pb-3 pl-8">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1 pr-16">
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
            <div className="bg-gray-50/80 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200/50 dark:border-gray-600/50" data-action>
              <div className="flex items-center gap-2 mb-2">
                <Camera className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">스크린샷 첨부됨</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenScreenshot();
                  }}
                  className="flex-1 bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  보기
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShowInFolder();
                  }}
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

      {/* 편집 다이얼로그 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>업무 기록 편집</DialogTitle>
            <DialogDescription>
              업무 기록의 제목과 설명을 수정할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">제목</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="업무 제목을 입력하세요"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">설명</label>
              <Input
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="업무 설명을 입력하세요 (선택사항)"
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isLoading}
            >
              취소
            </Button>
            <Button
              onClick={handleEdit}
              disabled={!editTitle.trim() || isLoading}
            >
              {isLoading ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>업무 기록 삭제</DialogTitle>
            <DialogDescription>
              정말로 이 업무 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 my-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full" />
              <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                삭제될 항목: "{record.title}"
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isLoading}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading}
            >
              {isLoading ? '삭제 중...' : '삭제'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 