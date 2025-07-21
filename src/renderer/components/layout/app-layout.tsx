import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Home, 
  Calendar, 
  BarChart3, 
  Settings,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  Play
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useSession } from '../../contexts/session-context';
import { usePageChangeDetection } from '../../hooks/use-page-change-detection';
import { formatDuration } from '../../lib/utils';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(256); // 기본 너비
  const [isResizing, setIsResizing] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { isWorking, currentRecord, elapsedTime } = useSession();
  
  // 페이지 이동시 세션 상태 확인
  usePageChangeDetection();
  
  const minWidth = 200; // 최소 너비
  const maxWidth = 400; // 최대 너비
  
  const isActive = (path: string) => location.pathname === path;
  
  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    { path: '/calendar', icon: Calendar, label: 'Calendar' },
    { path: '/reports', icon: BarChart3, label: 'Reports' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const closeSidebar = () => setSidebarOpen(false);
  const toggleCollapse = () => setSidebarCollapsed(!sidebarCollapsed);

  // 리사이즈 시작
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  // 마우스 이동 처리
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const newWidth = e.clientX;
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      setSidebarWidth(newWidth);
    }
  }, [isResizing, minWidth, maxWidth]);

  // 리사이즈 종료
  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  // 윈도우 크기 감지
  useEffect(() => {
    const checkIsDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    checkIsDesktop();
    window.addEventListener('resize', checkIsDesktop);

    return () => {
      window.removeEventListener('resize', checkIsDesktop);
    };
  }, []);

  // 이벤트 리스너 등록/해제
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none'; // 드래그 중 텍스트 선택 방지
      document.body.style.cursor = 'ew-resize'; // 커서 변경
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // 현재 사이드바 너비 계산
  const currentSidebarWidth = sidebarCollapsed ? 80 : sidebarWidth;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* 모바일 오버레이 */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden app-no-drag"
          onClick={closeSidebar}
        />
      )}

      {/* 사이드바 */}
      <aside 
        ref={sidebarRef}
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-card border-r border-border transform transition-all duration-300 ease-in-out lg:translate-x-0 app-sidebar",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        style={{
          width: `${currentSidebarWidth}px`,
          transition: isResizing ? 'none' : 'all 0.3s ease-in-out'
        }}
      >
        <div className="flex flex-col h-full">
          {/* 사이드바 헤더 */}
          <div className="flex items-center justify-between p-4 pt-8 border-b border-border flex-shrink-0">
            <div className="flex items-center space-x-2 transition-all duration-200">
              <div className="text-foreground flex-shrink-0">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <span className={cn(
                "text-foreground text-lg font-semibold truncate transition-all duration-200",
                sidebarCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
              )}>
                Work Tracker
              </span>
            </div>
            
            {/* 데스크톱 접기 버튼 */}
            <Button
              variant="ghost"
              size="sm"
              className="hidden lg:flex text-muted-foreground hover:text-foreground p-1.5"
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
              className="lg:hidden text-muted-foreground hover:text-foreground"
              onClick={closeSidebar}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* 네비게이션 메뉴 */}
          <nav className="flex-1 p-4 overflow-y-auto">
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
                        ? "text-primary-foreground bg-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                    title={sidebarCollapsed ? label : undefined}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {!sidebarCollapsed && <span className="truncate">{label}</span>}
                    
                    {/* 접혔을 때 툴팁 */}
                    {sidebarCollapsed && (
                      <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 whitespace-nowrap border">
                        {label}
                        <div className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-1 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-popover"></div>
                      </div>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* 세션 상태 표시 */}
          {!sidebarCollapsed && isWorking && currentRecord && (
            <div className="p-4 border-t border-border bg-green-50 dark:bg-green-950/20 flex-shrink-0">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-muted-foreground font-medium">진행 중</span>
                </div>
                <div className="text-sm text-foreground font-semibold truncate">
                  {currentRecord.title}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span className="font-mono">{formatDuration(elapsedTime)}</span>
                </div>
              </div>
            </div>
          )}

          {/* 접힌 상태에서 세션 인디케이터 */}
          {sidebarCollapsed && isWorking && (
            <div className="p-3 border-t border-border flex-shrink-0">
              <div className="flex justify-center">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" title="작업 진행 중"></div>
              </div>
            </div>
          )}

          {/* 사이드바 푸터 */}
          {!sidebarCollapsed && (
            <div className="p-4 border-t border-border flex-shrink-0">
              <div className="text-xs text-muted-foreground text-center">
                Work Tracker v1.0
              </div>
            </div>
          )}
        </div>

        {/* 리사이즈 핸들 - 데스크톱에서만 표시하고 접힌 상태가 아닐 때만 */}
        {!sidebarCollapsed && (
          <div
            className="absolute top-0 right-0 w-1 h-full cursor-ew-resize bg-transparent hover:bg-primary/30 transition-colors duration-200 hidden lg:block group app-no-drag"
            onMouseDown={handleMouseDown}
            title="드래그해서 사이드바 크기 조정"
          >
            {/* 시각적 인디케이터 */}
            <div className="absolute top-1/2 right-0 transform -translate-y-1/2 w-1 h-8 bg-border rounded-l-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
          </div>
        )}
      </aside>

      {/* 메인 콘텐츠 영역 */}
      <div 
        className="flex-1 flex flex-col h-screen"
        style={{
          marginLeft: isDesktop ? `${currentSidebarWidth}px` : '0'
        }}
      >
        {/* 고정 헤더 */}
        <header className="bg-card border-b border-border px-4 py-3 lg:px-6 lg:py-4 app-no-drag flex-shrink-0">
          <div className="flex items-center justify-between">
            {/* 모바일 메뉴 버튼 */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden text-muted-foreground hover:text-foreground app-no-drag"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>

            {/* 헤더 타이틀 (현재 페이지) - 이 부분만 드래그 가능 */}
            <div className="flex-1 lg:flex lg:items-center lg:justify-center app-header">
              <h1 className="text-foreground text-lg font-semibold ml-4 lg:ml-0 cursor-default select-none">
                {navItems.find(item => isActive(item.path))?.label || 'Dashboard'}
              </h1>
            </div>

            {/* 우측 액션 버튼들 (필요시 추가) */}
            <div className="flex items-center space-x-2 app-no-drag">
              {/* 추후 알림, 설정 등 버튼 추가 가능 */}
            </div>
          </div>
        </header>

        {/* 스크롤 가능한 메인 콘텐츠 */}
        <main className="flex-1 p-6 bg-background app-main-content overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
} 