import React from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TagStats } from '@/shared/types';

interface TagChartProps {
  data: TagStats[];
  chartType: 'pie' | 'bar';
  onTagClick?: (tag: string) => void;
}

const COLORS = [
  '#3b82f6', // blue-500
  '#ef4444', // red-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
  '#84cc16', // lime-500
  '#ec4899', // pink-500
  '#6366f1', // indigo-500
];

const formatDuration = (milliseconds: number) => {
  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium text-foreground">{data.tag}</p>
        <p className="text-sm text-muted-foreground">
          시간: {formatDuration(data.totalDuration)}
        </p>
        <p className="text-sm text-muted-foreground">
          건수: {data.recordCount}건
        </p>
        <p className="text-sm text-muted-foreground">
          비율: {data.percentage.toFixed(1)}%
        </p>
      </div>
    );
  }
  return null;
};

const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium text-foreground">{data.tag}</p>
        <p className="text-sm text-muted-foreground">
          시간: {formatDuration(data.totalDuration)}
        </p>
        <p className="text-sm text-muted-foreground">
          건수: {data.recordCount}건
        </p>
        <p className="text-sm text-muted-foreground">
          비율: {data.percentage.toFixed(1)}%
        </p>
      </div>
    );
  }
  return null;
};

export function TagChart({ data, chartType, onTagClick }: TagChartProps) {
  const chartData = data.map((item, index) => ({
    ...item,
    color: COLORS[index % COLORS.length],
    displayName: item.tag.length > 15 ? `${item.tag.substring(0, 15)}...` : item.tag
  }));

  const handleClick = (data: any) => {
    if (onTagClick) {
      onTagClick(data.tag);
    }
  };

  if (chartType === 'pie') {
    return (
      <div className="w-full h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ percentage }) => `${percentage.toFixed(1)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="totalDuration"
              onClick={handleClick}
              className="cursor-pointer"
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color}
                  className="hover:opacity-80 transition-opacity"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomPieTooltip />} />
            <Legend 
              formatter={(value, entry: any) => (
                <span className="text-sm text-foreground">{entry.payload.tag}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 60,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey="displayName"
            angle={-45}
            textAnchor="end"
            height={80}
            fontSize={12}
            className="fill-muted-foreground"
          />
          <YAxis 
            tickFormatter={(value) => formatDuration(value)}
            fontSize={12}
            className="fill-muted-foreground"
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="totalDuration" 
            fill="#3b82f6"
            onClick={handleClick}
            className="cursor-pointer hover:opacity-80 transition-opacity"
            radius={[4, 4, 0, 0]}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}