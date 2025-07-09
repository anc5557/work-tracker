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

function App() {
  return (
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
      </Router>
    </SessionProvider>
  );
}

export default App; 