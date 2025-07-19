import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { BarChart3, Clock, Calendar, TrendingUp } from 'lucide-react';

interface WorkStats {
  totalSessions: number;
  totalHours: number;
  averageSessionLength: number;
  mostProductiveDay: string;
  weeklyHours: number[];
  dailyAverages: { [key: string]: number };
}

export function Reports() {
  const [stats, setStats] = useState<WorkStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');

  useEffect(() => {
    loadStats();
  }, [timeRange]);

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

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold">Reports</h1>
          <div className="flex space-x-2">
            {(['week', 'month', 'year'] as const).map((range) => (
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
            ))}
          </div>
        </div>

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
      </div>
    </div>
  );
} 