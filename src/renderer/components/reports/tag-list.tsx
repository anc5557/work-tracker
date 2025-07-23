import React from 'react';
import { TagStats } from '@/shared/types';
import { Badge } from '../ui/badge';
import { Clock, FileText, TrendingUp } from 'lucide-react';

interface TagListProps {
  data: TagStats[];
  onTagClick?: (tag: string) => void;
  selectedTags?: string[];
}

const formatDuration = (milliseconds: number) => {
  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

const getTagColor = (index: number) => {
  const colors = [
    'bg-blue-100 text-blue-800 border-blue-200',
    'bg-red-100 text-red-800 border-red-200',
    'bg-green-100 text-green-800 border-green-200',
    'bg-yellow-100 text-yellow-800 border-yellow-200',
    'bg-purple-100 text-purple-800 border-purple-200',
    'bg-cyan-100 text-cyan-800 border-cyan-200',
    'bg-orange-100 text-orange-800 border-orange-200',
    'bg-lime-100 text-lime-800 border-lime-200',
    'bg-pink-100 text-pink-800 border-pink-200',
    'bg-indigo-100 text-indigo-800 border-indigo-200',
  ];
  return colors[index % colors.length];
};

export function TagList({ data, onTagClick, selectedTags = [] }: TagListProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>태그가 있는 업무 기록이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((tagStat, index) => {
        const isSelected = selectedTags.includes(tagStat.tag);
        
        return (
          <div
            key={tagStat.tag}
            className={`p-4 rounded-lg border transition-all cursor-pointer hover:shadow-md ${
              isSelected 
                ? 'border-primary bg-primary/5 ring-1 ring-primary/20' 
                : 'border-border bg-card hover:border-primary/50 hover:bg-accent/50'
            }`}
            onClick={() => onTagClick && onTagClick(tagStat.tag)}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <Badge 
                  variant="outline" 
                  className={`${getTagColor(index)} border font-medium`}
                >
                  {tagStat.tag}
                </Badge>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>{formatDuration(tagStat.totalDuration)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <FileText className="w-4 h-4" />
                    <span>{tagStat.recordCount}건</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1 text-sm font-medium">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-foreground">{tagStat.percentage.toFixed(1)}%</span>
                </div>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(tagStat.percentage, 100)}%` }}
              />
            </div>
            
            {/* Tag details */}
            <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">평균 세션:</span>
                <p className="font-medium text-foreground">
                  {formatDuration(Math.round(tagStat.totalDuration / tagStat.recordCount))}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">최근 활동:</span>
                <p className="font-medium text-foreground">
                  {tagStat.records.length > 0 
                    ? new Date(tagStat.records[0].startTime).toLocaleDateString('ko-KR', {
                        month: 'short',
                        day: 'numeric'
                      })
                    : '-'
                  }
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">활동 빈도:</span>
                <p className="font-medium text-foreground">
                  {tagStat.recordCount > 10 ? '높음' : 
                   tagStat.recordCount > 5 ? '보통' : '낮음'}
                </p>
              </div>
            </div>
            
            {isSelected && (
              <div className="mt-3 text-xs text-primary bg-primary/10 px-2 py-1 rounded">
                클릭하여 상세 내용 보기
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}