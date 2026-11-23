import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';

// Route-level code splitting: each page is a separate chunk loaded on demand.
const LoginPage          = lazy(() => import('./pages/LoginPage'));
const DashboardPage      = lazy(() => import('./pages/DashboardPage'));
const StudentsPage       = lazy(() => import('./pages/StudentsPage'));
const StudentProfilePage = lazy(() => import('./pages/StudentProfilePage'));
const AddStudentPage     = lazy(() => import('./pages/AddStudentPage'));
const FollowupsPage      = lazy(() => import('./pages/FollowupsPage'));
const EarlyWarningPage   = lazy(() => import('./pages/EarlyWarningPage'));

/** Full-screen spinner shown while a lazy page chunk is loading. */
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-page">
      <div className="w-9 h-9 border-3 border-teal border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

/**
 * App: Defines task-based application routing with protected routes
 * and role-aware navigation under Layout.
 */
export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes (Requires authenticated JWT session) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            {/* 1. Today (Dashboard) */}
            <Route path="/" element={<DashboardPage />} />

            {/* 2. Students */}
            <Route path="/students" element={<StudentsPage />} />
            <Route path="/students/new" element={<AddStudentPage />} />
            <Route path="/students/:id" element={<StudentProfilePage />} />

            {/* 3. Follow-ups (with legacy redirect from /interventions) */}
            <Route path="/follow-ups" element={<FollowupsPage />} />
            <Route path="/interventions" element={<Navigate to="/follow-ups" replace />} />

            {/* 4. About the model (with legacy redirect from /early-warning) */}
            <Route path="/about-the-model" element={<EarlyWarningPage />} />
            <Route path="/early-warning" element={<Navigate to="/about-the-model" replace />} />
          </Route>
        </Route>

        {/* Catch-all fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
