import React from 'react';
import { AppLayout } from './components/layout/app-layout';
import { WorkTimer } from './components/work/work-timer';
import { DailyWorkList } from './components/history/daily-work-list';
import { Toaster } from './components/ui/toaster';

function App() {
  return (
    <div className="min-h-screen bg-background">
      <AppLayout>
        <div className="container mx-auto p-6 space-y-6">
          {/* 메인 업무 타이머 */}
          <div className="flex justify-center">
            <WorkTimer />
          </div>
          
          {/* 일일 업무 리스트 */}
          <DailyWorkList />
        </div>
      </AppLayout>
      <Toaster />
    </div>
  );
}

export default App; 