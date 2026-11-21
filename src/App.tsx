import { useCallback, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { SplashScreen } from './components/layout/SplashScreen';
import { ProtectedRoute } from './components/shared/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LoginPage } from './pages/auth/LoginPage';
import { CalendarPage } from './pages/calendar/CalendarPage';
import { GlobalChatPage } from './pages/chat/GlobalChatPage';
import { CompetitionDetailPage } from './pages/competitions/CompetitionDetailPage';
import { CompetitionsPage } from './pages/competitions/CompetitionsPage';
import { OverviewPage } from './pages/dashboard/OverviewPage';
import { MembersPage } from './pages/members/MembersPage';
import { NotificationsPage } from './pages/notifications/NotificationsPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { MyTasksPage } from './pages/tasks/MyTasksPage';

function shouldSkipSplashInitially(): boolean {
  if (typeof window === 'undefined') return true;
  const params = new URLSearchParams(window.location.search);
  if (params.get('autostart') === '1') return true;
  try {
    if (sessionStorage.getItem('teman_splash_seen') === '1') {
      return true;
    }
  } catch {
    // Ignore sessionStorage errors
  }
  return false;
}

export default function App() {
  const [showSplash, setShowSplash] = useState<boolean>(shouldSkipSplashInitially() ? false : true);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
    try {
      sessionStorage.setItem('teman_splash_seen', '1');
    } catch {
      // Ignore sessionStorage errors
    }
  }, []);

  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          {showSplash && <SplashScreen onComplete={handleSplashComplete} />}

          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/overview" element={<OverviewPage />} />
              <Route path="/chat" element={<GlobalChatPage />} />
              <Route path="/competitions" element={<CompetitionsPage />} />
              <Route path="/competitions/:id" element={<CompetitionDetailPage />} />
              <Route path="/tasks" element={<MyTasksPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/members" element={<MembersPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            <Route path="/" element={<Navigate to="/overview" replace />} />
            <Route path="*" element={<Navigate to="/overview" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}
