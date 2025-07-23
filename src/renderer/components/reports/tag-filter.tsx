import React, { useState, useMemo } from 'react';
import { TagStats } from '@/shared/types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Search, X, SlidersHorizontal, ArrowUpDown } from 'lucide-react';

interface TagFilterProps {
  data: TagStats[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedTags: string[];
  onTagToggle: (tag: string) => void;
  sortBy: 'duration' | 'count' | 'name';
  onSortChange: (sort: 'duration' | 'count' | 'name') => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: (order: 'asc' | 'desc') => void;
}

export function TagFilter({
  data,
  searchQuery,
  onSearchChange,
  selectedTags,
  onTagToggle,
  sortBy,
  onSortChange,
  sortOrder,
  onSortOrderChange
}: TagFilterProps) {
  const [showAllTags, setShowAllTags] = useState(false);

  // 검색 필터링된 태그들
  const filteredTags = useMemo(() => {
    let filtered = data.filter(tag =>
      tag.tag.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // 정렬
    filtered.sort((a, b) => {
      let compareValue = 0;
      
      switch (sortBy) {
        case 'duration':
          compareValue = a.totalDuration - b.totalDuration;
          break;
        case 'count':
          compareValue = a.recordCount - b.recordCount;
          break;
        case 'name':
          compareValue = a.tag.localeCompare(b.tag);
          break;
      }
      
      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    return filtered;
  }, [data, searchQuery, sortBy, sortOrder]);

  // 표시할 태그 수 제한
  const displayTags = showAllTags ? filteredTags : filteredTags.slice(0, 10);

  const clearAllFilters = () => {
    onSearchChange('');
    selectedTags.forEach(tag => onTagToggle(tag));
  };

  const formatDuration = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getSortLabel = () => {
    switch (sortBy) {
      case 'duration': return '시간순';
      case 'count': return '건수순';
      case 'name': return '이름순';
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="태그 검색..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSearchChange('')}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>

        {/* Sort Controls */}
        <div className="flex items-center space-x-2">
          <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as 'duration' | 'count' | 'name')}
            className="px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="duration">시간순</option>
            <option value="count">건수순</option>
            <option value="name">이름순</option>
          </select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-2"
          >
            <ArrowUpDown className="w-4 h-4" />
            <span className="ml-1 text-xs">
              {sortOrder === 'desc' ? '내림차순' : '오름차순'}
            </span>
          </Button>
        </div>
      </div>

      {/* Active Filters Summary */}
      {(selectedTags.length > 0 || searchQuery) && (
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center space-x-2 flex-wrap gap-2">
            <span className="text-sm text-muted-foreground">활성 필터:</span>
            {searchQuery && (
              <Badge variant="secondary" className="text-xs">
                검색: "{searchQuery}"
              </Badge>
            )}
            {selectedTags.map(tag => (
              <Badge key={tag} variant="default" className="text-xs">
                선택: {tag}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onTagToggle(tag)}
                  className="ml-1 h-3 w-3 p-0 hover:bg-transparent"
                >
                  <X className="w-2 h-2" />
                </Button>
              </Badge>
            ))}
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-xs"
          >
            모두 지우기
          </Button>
        </div>
      )}

      {/* Tag Selection Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-foreground">
            태그 선택 ({getSortLabel()})
          </h4>
          {filteredTags.length > 10 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllTags(!showAllTags)}
              className="text-xs"
            >
              {showAllTags ? '간단히 보기' : `모두 보기 (${filteredTags.length}개)`}
            </Button>
          )}
        </div>

        {filteredTags.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">검색 결과가 없습니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {displayTags.map(tagStat => {
              const isSelected = selectedTags.includes(tagStat.tag);
              
              return (
                <div
                  key={tagStat.tag}
                  onClick={() => onTagToggle(tagStat.tag)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${
                    isSelected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : 'border-border bg-card hover:border-primary/50 hover:bg-accent/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground truncate">
                      {tagStat.tag}
                    </span>
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground ml-2">
                      <span>{formatDuration(tagStat.totalDuration)}</span>
                      <span>•</span>
                      <span>{tagStat.recordCount}건</span>
                    </div>
                  </div>
                  
                  <div className="mt-2 w-full bg-muted rounded-full h-1">
                    <div 
                      className="bg-primary h-1 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(tagStat.percentage, 100)}%` }}
                    />
                  </div>
                  
                  <div className="mt-1 text-xs text-muted-foreground text-right">
                    {tagStat.percentage.toFixed(1)}%
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Results Summary */}
      <div className="text-sm text-muted-foreground">
        총 {filteredTags.length}개 태그
        {selectedTags.length > 0 && ` • ${selectedTags.length}개 선택됨`}
      </div>
    </div>
  );
}