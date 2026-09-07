import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// --- Social Media Manager section (existing) ---
import AppLayout from './components/layout/AppLayout';
import DashboardPage from './pages/DashboardPage';
import CreatePostPage from './pages/CreatePostPage';
import ContentManagementPage from './pages/ContentManagementPage';
import CalendarPage from './pages/CalendarPage';
import MediaLibraryPage from './pages/MediaLibraryPage';
import SocialAccountsPage from './pages/SocialAccountsPage';
import YouTubeDownloaderPage from './pages/YouTubeDownloaderPage';
import AdminUsersPage from './pages/AdminUsersPage';
import LoginPage from './pages/LoginPage';
import { AuthProvider as SocialAuthProvider, ProtectedRoute as SocialProtectedRoute } from './lib/auth.jsx';

// --- Smart Class Library section (fully isolated: own login, own auth, own layout) ---
import SmartClassLayout from './components/layout/SmartClassLayout';
import AddVideoPage from './pages/AddVideoPage';
import SmartClassLibraryPage from './pages/SmartClassLibraryPage';
import SmartClassLoginPage from './pages/SmartClassLoginPage';
import SmartClassAdminUsersPage from './pages/SmartClassAdminUsersPage';
import { AuthProvider as SmartClassAuthProvider, ProtectedRoute as SmartClassProtectedRoute } from './lib/smartClassAuth.jsx';

import PortalChooserPage from './pages/PortalChooserPage';

export default function App() {
  return (
    <SocialAuthProvider>
      <SmartClassAuthProvider>
        <Routes>
          <Route path="/" element={<PortalChooserPage />} />

          {/* Social Media Manager -- own login, own token, own protected routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <SocialProtectedRoute>
                <AppLayout />
              </SocialProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/create" element={<CreatePostPage />} />
            <Route path="/content" element={<ContentManagementPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/media" element={<MediaLibraryPage />} />
            <Route path="/accounts" element={<SocialAccountsPage />} />
            <Route path="/youtube-downloader" element={<YouTubeDownloaderPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
          </Route>

          {/* Smart Class Library -- completely separate login/session; a social session cannot
              reach these routes (SmartClassProtectedRoute checks the smart-class auth state only,
              and the backend independently rejects a social token on any /library/* call). */}
          <Route path="/smart-class/login" element={<SmartClassLoginPage />} />
          <Route
            element={
              <SmartClassProtectedRoute>
                <SmartClassLayout />
              </SmartClassProtectedRoute>
            }
          >
            <Route path="/smart-class/library" element={<SmartClassLibraryPage />} />
            <Route path="/smart-class/add-video" element={<AddVideoPage />} />
            <Route path="/smart-class/admin/users" element={<SmartClassAdminUsersPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </SmartClassAuthProvider>
    </SocialAuthProvider>
  );
}
