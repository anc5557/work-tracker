import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { AppLayout } from './components/layout/app-layout';
import { Dashboard } from './components/pages/dashboard';
import { Calendar } from './components/pages/calendar';
import { Reports } from './components/pages/reports';
import { Settings } from './components/pages/settings';
import { SessionDetails } from './components/pages/session-details';
import { Toaster } from './components/ui/toaster';
import { SessionProvider, useSession } from './contexts/session-context';
import { ThemeProvider } from './components/theme-provider';
import { WorkChangeNotificationHandler } from './components/work/work-change-notification-handler';

// 세션 종료 시 자동 이동을 처리하는 컴포넌트
function SessionEndNavigationHandler() {
  const navigate = useNavigate();
  const { lastEndedSessionId, clearLastEndedSessionId } = useSession();

  useEffect(() => {
    if (lastEndedSessionId) {
      // 세션 상세보기 페이지로 이동
      navigate(`/session/${lastEndedSessionId}`);
      // lastEndedSessionId 초기화
      clearLastEndedSessionId();
    }
  }, [lastEndedSessionId, navigate, clearLastEndedSessionId]);

  return null;
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="work-tracker-theme">
      <SessionProvider>
        <Router>
          <AppLayout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/session/:sessionId" element={<SessionDetails />} />
            </Routes>
          </AppLayout>
          <Toaster />
          <WorkChangeNotificationHandler />
          <SessionEndNavigationHandler />
        </Router>
      </SessionProvider>
    </ThemeProvider>
  );
}

export default App; 