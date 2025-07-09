import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '../ui/button';
import { 
  Home, 
  Calendar, 
  BarChart3, 
  Settings,
  Menu,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;
  
  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/calendar', icon: Calendar, label: 'Calendar' },
    { path: '/reports', icon: BarChart3, label: 'Reports' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const closeSidebar = () => setSidebarOpen(false);
  const toggleCollapse = () => setSidebarCollapsed(!sidebarCollapsed);

  return (
    <div className="flex min-h-screen bg-gray-900">
      {/* 모바일 오버레이 */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* 사이드바 */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 bg-gray-800 border-r border-gray-700 transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full",
        sidebarCollapsed ? "w-20" : "w-64"
      )}>
        <div className="flex flex-col h-full">
          {/* 사이드바 헤더 */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <div className={cn(
              "flex items-center space-x-2 transition-opacity duration-200",
              sidebarCollapsed ? "opacity-0 lg:opacity-0" : "opacity-100"
            )}>
              <div className="text-white">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              {!sidebarCollapsed && (
                <span className="text-white text-lg font-semibold">Work Tracker</span>
              )}
            </div>
            
            {/* 데스크톱 접기 버튼 */}
            <Button
              variant="ghost"
              size="sm"
              className="hidden lg:flex text-gray-400 hover:text-white p-1.5"
              onClick={toggleCollapse}
              title={sidebarCollapsed ? "사이드바 펼치기" : "사이드바 접기"}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </Button>
            
            {/* 모바일에서만 닫기 버튼 표시 */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden text-gray-400 hover:text-white"
              onClick={closeSidebar}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* 네비게이션 메뉴 */}
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {navItems.map(({ path, icon: Icon, label }) => (
                <li key={path}>
                  <Link
                    to={path}
                    onClick={closeSidebar}
                    className={cn(
                      "flex items-center rounded-lg text-sm font-medium transition-colors group relative",
                      sidebarCollapsed ? "justify-center px-3 py-3" : "space-x-3 px-3 py-2",
                      isActive(path)
                        ? "text-white bg-blue-600"
                        : "text-gray-300 hover:text-white hover:bg-gray-700"
                    )}
                    title={sidebarCollapsed ? label : undefined}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {!sidebarCollapsed && <span>{label}</span>}
                    
                    {/* 접혔을 때 툴팁 */}
                    {sidebarCollapsed && (
                      <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 whitespace-nowrap">
                        {label}
                        <div className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-1 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-900"></div>
                      </div>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* 사이드바 푸터 */}
          {!sidebarCollapsed && (
            <div className="p-4 border-t border-gray-700">
              <div className="text-xs text-gray-400 text-center">
                Work Tracker v1.0
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* 메인 콘텐츠 영역 */}
      <div className="flex-1 flex flex-col lg:ml-0">
        {/* 간소화된 헤더 (모바일 메뉴 버튼 포함) */}
        <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 lg:px-6 lg:py-4">
          <div className="flex items-center justify-between">
            {/* 모바일 메뉴 버튼 */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden text-gray-300 hover:text-white"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>

            {/* 헤더 타이틀 (현재 페이지) */}
            <div className="flex-1 lg:flex lg:items-center lg:justify-center">
              <h1 className="text-white text-lg font-semibold ml-4 lg:ml-0">
                {navItems.find(item => isActive(item.path))?.label || 'Dashboard'}
              </h1>
            </div>

            {/* 우측 액션 버튼들 (필요시 추가) */}
            <div className="flex items-center space-x-2">
              {/* 추후 알림, 설정 등 버튼 추가 가능 */}
            </div>
          </div>
        </header>

        {/* 페이지 콘텐츠 */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
} 