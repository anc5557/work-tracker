import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { BarChart3, Clock, Calendar, TrendingUp, Tags, PieChart } from 'lucide-react';
import { TagReportData, TagFilterOptions } from '@/shared/types';
import { TagChart } from '../reports/tag-chart';
import { TagList } from '../reports/tag-list';
import { TagDetailView } from '../reports/tag-detail-view';
import { TagFilter } from '../reports/tag-filter';

interface WorkStats {
  totalSessions: number;
  totalHours: number;
  averageSessionLength: number;
  mostProductiveDay: string;
  weeklyHours: number[];
  dailyAverages: { [key: string]: number };
}

type ViewMode = 'overview' | 'tags' | 'tag-detail';
type ChartType = 'pie' | 'bar';

export function Reports() {
  const [stats, setStats] = useState<WorkStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');
  
  // 태그 레포트 관련 상태
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [tagReportData, setTagReportData] = useState<TagReportData | null>(null);
  const [tagLoading, setTagLoading] = useState(false);
  const [tagTimeRange, setTagTimeRange] = useState<'today' | 'week' | 'month' | 'custom'>('week');
  const [chartType, setChartType] = useState<ChartType>('pie');
  const [selectedTagForDetail, setSelectedTagForDetail] = useState<string | null>(null);
  
  // 필터 상태
  const [filterOptions, setFilterOptions] = useState<TagFilterOptions>({
    searchQuery: '',
    selectedTags: [],
    sortBy: 'duration',
    sortOrder: 'desc'
  });

  useEffect(() => {
    loadStats();
  }, [timeRange]);

  useEffect(() => {
    if (viewMode === 'tags') {
      loadTagReports();
    }
  }, [viewMode, tagTimeRange]);

  const loadStats = async () => {
    try {
      setLoading(true);
      // 실제 통계 데이터 로드
      const result = await window.electronAPI.invoke('get-work-stats', { timeRange });
      if (result.success) {
        setStats(result.data);
      } else {
        // 더미 데이터
        setStats({
          totalSessions: 47,
          totalHours: 156.5,
          averageSessionLength: 3.3,
          mostProductiveDay: 'Tuesday',
          weeklyHours: [8, 7.5, 9, 6, 8.5, 4, 2],
          dailyAverages: {
            Monday: 7.2,
            Tuesday: 8.1,
            Wednesday: 6.8,
            Thursday: 7.5,
            Friday: 6.2,
            Saturday: 3.1,
            Sunday: 2.4
          }
        });
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
      // 에러 시 더미 데이터
      setStats({
        totalSessions: 47,
        totalHours: 156.5,
        averageSessionLength: 3.3,
        mostProductiveDay: 'Tuesday',
        weeklyHours: [8, 7.5, 9, 6, 8.5, 4, 2],
        dailyAverages: {
          Monday: 7.2,
          Tuesday: 8.1,
          Wednesday: 6.8,
          Thursday: 7.5,
          Friday: 6.2,
          Saturday: 3.1,
          Sunday: 2.4
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTagReports = async () => {
    try {
      setTagLoading(true);
      const result = await window.electronAPI.invoke('get-tag-reports', {
        timeRange: tagTimeRange
      });
      
      if (result.success) {
        setTagReportData(result.data);
      } else {
        console.error('Failed to load tag reports:', result.error);
        setTagReportData({
          totalDuration: 0,
          totalRecords: 0,
          tagStats: [],
          timeRange: tagTimeRange,
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0]
        });
      }
    } catch (error) {
      console.error('Failed to load tag reports:', error);
      setTagReportData({
        totalDuration: 0,
        totalRecords: 0,
        tagStats: [],
        timeRange: tagTimeRange,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
      });
    } finally {
      setTagLoading(false);
    }
  };

  const handleTagClick = (tag: string) => {
    setSelectedTagForDetail(tag);
    setViewMode('tag-detail');
  };

  const handleBackToTagReport = () => {
    setSelectedTagForDetail(null);
    setViewMode('tags');
  };

  const filteredTagStats = tagReportData?.tagStats.filter(tag => {
    const matchesSearch = tag.tag.toLowerCase().includes(filterOptions.searchQuery.toLowerCase());
    const matchesSelection = filterOptions.selectedTags.length === 0 || filterOptions.selectedTags.includes(tag.tag);
    return matchesSearch && matchesSelection;
  }).sort((a, b) => {
    let compareValue = 0;
    switch (filterOptions.sortBy) {
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
    return filterOptions.sortOrder === 'asc' ? compareValue : -compareValue;
  }) || [];

  const formatDuration = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours % 1) * 60);
    return `${h}h ${m}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-8">Loading...</div>
        </div>
      </div>
    );
  }

  // 태그 상세 보기 렌더링
  if (viewMode === 'tag-detail' && selectedTagForDetail && tagReportData) {
    const selectedTag = tagReportData.tagStats.find(t => t.tag === selectedTagForDetail);
    if (selectedTag) {
      return (
        <div className="min-h-screen bg-background text-foreground p-8">
          <div className="max-w-6xl mx-auto">
            <TagDetailView
              tagName={selectedTag.tag}
              records={selectedTag.records}
              onBack={handleBackToTagReport}
            />
          </div>
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold">Reports</h1>
          <div className="flex items-center space-x-4">
            {/* View Mode Toggle */}
            <div className="flex space-x-2">
              <Button
                variant={viewMode === 'overview' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('overview')}
                className="flex items-center space-x-2"
              >
                <BarChart3 className="w-4 h-4" />
                <span>개요</span>
              </Button>
              <Button
                variant={viewMode === 'tags' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('tags')}
                className="flex items-center space-x-2"
              >
                <Tags className="w-4 h-4" />
                <span>태그별</span>
              </Button>
            </div>
            
            {/* Time Range Selector */}
            <div className="flex space-x-2">
              {viewMode === 'overview' ? (
                (['week', 'month', 'year'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      timeRange === range
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    {range.charAt(0).toUpperCase() + range.slice(1)}
                  </button>
                ))
              ) : (
                (['today', 'week', 'month'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTagTimeRange(range)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      tagTimeRange === range
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    {range.charAt(0).toUpperCase() + range.slice(1)}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Overview Mode */}
        {viewMode === 'overview' && (
        <>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Sessions</CardTitle>
              <BarChart3 className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats?.totalSessions}</div>
              <p className="text-xs text-muted-foreground">
                +12% from last {timeRange}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Hours</CardTitle>
              <Clock className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{formatHours(stats?.totalHours || 0)}</div>
              <p className="text-xs text-muted-foreground">
                +8% from last {timeRange}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Session</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{formatHours(stats?.averageSessionLength || 0)}</div>
              <p className="text-xs text-muted-foreground">
                +5% from last {timeRange}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Most Productive</CardTitle>
              <Calendar className="h-4 w-4 text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats?.mostProductiveDay}</div>
              <p className="text-xs text-muted-foreground">
                Best day this {timeRange}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Hours Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Weekly Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.weeklyHours.map((hours, index) => {
                const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                const maxHours = Math.max(...(stats?.weeklyHours || [1]));
                const percentage = (hours / maxHours) * 100;
                
                return (
                  <div key={index} className="flex items-center space-x-4">
                    <div className="w-8 text-sm text-muted-foreground">{days[index]}</div>
                    <div className="flex-1 bg-muted rounded-full h-3">
                      <div 
                        className="bg-primary h-3 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="w-12 text-sm text-muted-foreground text-right">{formatHours(hours)}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Daily Averages */}
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Daily Averages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {Object.entries(stats?.dailyAverages || {}).map(([day, hours]) => (
                <div key={day} className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">{day.slice(0, 3)}</div>
                  <div className="text-lg font-semibold text-foreground">{formatHours(hours)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        </>
        )}
        
        {/* Tags Mode */}
        {viewMode === 'tags' && (
        <>
        {tagLoading ? (
          <div className="text-center py-8">태그 레포트 로딩 중...</div>
        ) : (
        <>
        {/* Tag Report Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Tags className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-semibold">태그별 레포트</h2>
          </div>
          
          {tagReportData && tagReportData.tagStats.length > 0 && (
            <div className="flex items-center space-x-2">
              <Button
                variant={chartType === 'pie' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('pie')}
                className="flex items-center space-x-1"
              >
                <PieChart className="w-4 h-4" />
                <span>파이차트</span>
              </Button>
              <Button
                variant={chartType === 'bar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('bar')}
                className="flex items-center space-x-1"
              >
                <BarChart3 className="w-4 h-4" />
                <span>바차트</span>
              </Button>
            </div>
          )}
        </div>

        {tagReportData && (
        <>
        {/* Tag Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">총 작업 시간</CardTitle>
              <Clock className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{formatDuration(tagReportData.totalDuration)}</div>
              <p className="text-xs text-muted-foreground">
                {tagReportData.timeRange === 'today' ? '오늘' : 
                 tagReportData.timeRange === 'week' ? '이번 주' : 
                 tagReportData.timeRange === 'month' ? '이번 달' : '선택 기간'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">총 기록 수</CardTitle>
              <BarChart3 className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{tagReportData.totalRecords}건</div>
              <p className="text-xs text-muted-foreground">
                {tagReportData.tagStats.length}개 태그
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">평균 시간</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {tagReportData.totalRecords > 0 
                  ? formatDuration(Math.round(tagReportData.totalDuration / tagReportData.totalRecords))
                  : '0m'
                }
              </div>
              <p className="text-xs text-muted-foreground">
                기록당 평균
              </p>
            </CardContent>
          </Card>
        </div>

        {tagReportData.tagStats.length > 0 ? (
        <>
        {/* Chart Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">태그별 시간 분포</CardTitle>
          </CardHeader>
          <CardContent>
            <TagChart
              data={filteredTagStats}
              chartType={chartType}
              onTagClick={handleTagClick}
            />
          </CardContent>
        </Card>

        {/* Filter Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">태그 필터 및 검색</CardTitle>
          </CardHeader>
          <CardContent>
            <TagFilter
              data={tagReportData.tagStats}
              searchQuery={filterOptions.searchQuery}
              onSearchChange={(query) => setFilterOptions(prev => ({ ...prev, searchQuery: query }))}
              selectedTags={filterOptions.selectedTags}
              onTagToggle={(tag) => {
                setFilterOptions(prev => ({
                  ...prev,
                  selectedTags: prev.selectedTags.includes(tag)
                    ? prev.selectedTags.filter(t => t !== tag)
                    : [...prev.selectedTags, tag]
                }));
              }}
              sortBy={filterOptions.sortBy}
              onSortChange={(sort) => setFilterOptions(prev => ({ ...prev, sortBy: sort }))}
              sortOrder={filterOptions.sortOrder}
              onSortOrderChange={(order) => setFilterOptions(prev => ({ ...prev, sortOrder: order }))}
            />
          </CardContent>
        </Card>

        {/* Tag List Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">태그별 상세 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <TagList
              data={filteredTagStats}
              onTagClick={handleTagClick}
              selectedTags={filterOptions.selectedTags}
            />
          </CardContent>
        </Card>
        </>
        ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Tags className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">태그가 있는 업무 기록이 없습니다</p>
              <p className="text-sm">업무를 시작할 때 태그를 추가해보세요</p>
            </div>
          </CardContent>
        </Card>
        )}
        </>
        )}
        </>
        )}
        </>
        )}
      </div>
    </div>
  );
} 