import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import DashboardPage from './pages/DashboardPage';
import CreatePostPage from './pages/CreatePostPage';
import ContentManagementPage from './pages/ContentManagementPage';
import CalendarPage from './pages/CalendarPage';
import MediaLibraryPage from './pages/MediaLibraryPage';
import SocialAccountsPage from './pages/SocialAccountsPage';
import LoginPage from './pages/LoginPage';
import { AuthProvider, ProtectedRoute } from './lib/auth.jsx';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/create" element={<CreatePostPage />} />
          <Route path="/content" element={<ContentManagementPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/media" element={<MediaLibraryPage />} />
          <Route path="/accounts" element={<SocialAccountsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
