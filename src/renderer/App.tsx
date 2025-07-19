import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/layout/app-layout';
import { Dashboard } from './components/pages/dashboard';
import { Calendar } from './components/pages/calendar';
import { Reports } from './components/pages/reports';
import { Settings } from './components/pages/settings';
import { SessionDetails } from './components/pages/session-details';
import { Toaster } from './components/ui/toaster';
import { SessionProvider } from './contexts/session-context';
import { ThemeProvider } from './components/theme-provider';
import { WorkChangeNotificationHandler } from './components/work/work-change-notification-handler';

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
        </Router>
      </SessionProvider>
    </ThemeProvider>
  );
}

export default App; 