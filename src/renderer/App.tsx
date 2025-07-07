import React from 'react';
import { AppLayout } from './components/layout/app-layout';
import { WorkTimer } from './components/work/work-timer';
import { DailyWorkList } from './components/history/daily-work-list';
import { Toaster } from './components/ui/toaster';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <AppLayout>
        <div className="container mx-auto p-6 space-y-8">
          {/* 헤로 섹션 */}
          <div className="text-center space-y-4 mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Work Tracker
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              생산적인 업무를 위한 스마트한 시간 관리 도구
            </p>
          </div>
          
          {/* 메인 대시보드 그리드 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 메인 업무 타이머 - 더 큰 공간 할당 */}
            <div className="lg:col-span-2">
              <WorkTimer />
            </div>
            
            {/* 사이드 패널 - 통계나 빠른 액션들 */}
            <div className="space-y-6">
              {/* 오늘의 통계 카드 */}
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-lg">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  오늘의 현황
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">완료한 작업</span>
                    <span className="font-medium">0개</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">총 작업 시간</span>
                    <span className="font-medium">0시간</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">스크린샷</span>
                    <span className="font-medium">0장</span>
                  </div>
                </div>
              </div>
              
              {/* 빠른 액션 카드 */}
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-lg">
                <h3 className="text-lg font-semibold mb-4">빠른 액션</h3>
                <div className="space-y-2">
                  <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm">
                    📊 통계 보기
                  </button>
                  <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm">
                    ⚙️ 설정
                  </button>
                  <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm">
                    📁 데이터 폴더 열기
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* 일일 업무 리스트 */}
          <div className="mt-8">
            <DailyWorkList />
          </div>
        </div>
      </AppLayout>
      <Toaster />
    </div>
  );
}

export default App; 