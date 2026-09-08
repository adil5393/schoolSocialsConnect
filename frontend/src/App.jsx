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

// --- Smart Class Library section (digital teaching & learning library) ---
import SmartClassLayout from './components/layout/SmartClassLayout';
import SmartClassHomePage from './pages/smartclass/SmartClassHomePage';
import MyClassesPage from './pages/smartclass/MyClassesPage';
import SubjectCurriculumPage from './pages/smartclass/SubjectCurriculumPage';
import ChapterWorkspacePage from './pages/smartclass/ChapterWorkspacePage';
import AddMaterialPage from './pages/smartclass/AddMaterialPage';
import LibrarySearchPage from './pages/smartclass/LibrarySearchPage';
import ContentCoveragePage from './pages/smartclass/ContentCoveragePage';
import ManageMaterialPage from './pages/smartclass/ManageMaterialPage';
import RecentLessonsPage from './pages/smartclass/RecentLessonsPage';
import FavoritesPage from './pages/smartclass/FavoritesPage';
import OfflinePage from './pages/smartclass/OfflinePage';
import MyUploadsPage from './pages/smartclass/MyUploadsPage';
import AdminCurriculumPage from './pages/smartclass/admin/AdminCurriculumPage';
import AdminTeachersPage from './pages/smartclass/admin/AdminTeachersPage';
import AdminLibraryManagementPage from './pages/smartclass/admin/AdminLibraryManagementPage';
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

          {/* WORKSPACE 1: Social Media Manager */}
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

          {/* WORKSPACE 2: Smart Class Teaching Library */}
          <Route path="/smart-class/login" element={<SmartClassLoginPage />} />
          <Route
            element={
              <SmartClassProtectedRoute>
                <SmartClassLayout />
              </SmartClassProtectedRoute>
            }
          >
            {/* Smart Class Home & Core Experience */}
            <Route path="/smart-class" element={<SmartClassHomePage />} />
            <Route path="/smart-class/classes" element={<MyClassesPage />} />
            <Route path="/smart-class/curriculum" element={<SubjectCurriculumPage />} />
            <Route path="/smart-class/curriculum/:classId/:subjectId" element={<SubjectCurriculumPage />} />
            <Route path="/smart-class/curriculum/:classId/:subjectId/:chapterId" element={<ChapterWorkspacePage />} />
            <Route path="/smart-class/library" element={<LibrarySearchPage />} />

            {/* Teacher Tools */}
            <Route path="/smart-class/add-material" element={<AddMaterialPage />} />
            <Route path="/smart-class/add-video" element={<AddMaterialPage />} />
            <Route path="/smart-class/manage-material" element={<ManageMaterialPage />} />
            <Route path="/smart-class/coverage" element={<ContentCoveragePage />} />

            {/* Quick Access / Productivity */}
            <Route path="/smart-class/recent" element={<RecentLessonsPage />} />
            <Route path="/smart-class/favorites" element={<FavoritesPage />} />
            <Route path="/smart-class/offline" element={<OfflinePage />} />
            <Route path="/smart-class/my-uploads" element={<MyUploadsPage />} />

            {/* Administration */}
            <Route path="/smart-class/admin/curriculum" element={<AdminCurriculumPage />} />
            <Route path="/smart-class/admin/teachers" element={<AdminTeachersPage />} />
            <Route path="/smart-class/admin/library-management" element={<AdminLibraryManagementPage />} />
            <Route path="/smart-class/admin/users" element={<SmartClassAdminUsersPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </SmartClassAuthProvider>
    </SocialAuthProvider>
  );
}

