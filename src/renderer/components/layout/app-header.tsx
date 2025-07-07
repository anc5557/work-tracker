import React from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Minus, X, Zap } from 'lucide-react';

export function AppHeader() {
  const handleMinimize = () => {
    window.electronAPI?.minimizeApp();
  };

  const handleClose = () => {
    window.electronAPI?.closeApp();
  };

  return (
    <header className="relative bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-700/50">
      {/* 배경 그래디언트 */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/3 to-indigo-500/5" />
      
      <div className="relative flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-lg">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                Work Tracker
              </h1>
              <Badge variant="secondary" className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700">
                v1.0 • 업무 자동화 도구
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMinimize}
            className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all duration-200"
          >
            <Minus className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 rounded-full transition-all duration-200"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* 하단 그라데이션 보더 */}
      <div className="h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent"></div>
    </header>
  );
} 