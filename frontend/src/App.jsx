import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';

// Route-level code splitting: each page is a separate chunk loaded on demand.
// This reduces the initial JS bundle size and speeds up first-paint.
const LoginPage          = lazy(() => import('./pages/LoginPage'));
const DashboardPage      = lazy(() => import('./pages/DashboardPage'));
const StudentsPage       = lazy(() => import('./pages/StudentsPage'));
const StudentProfilePage = lazy(() => import('./pages/StudentProfilePage'));
const AddStudentPage     = lazy(() => import('./pages/AddStudentPage'));
const InterventionsPage  = lazy(() => import('./pages/InterventionsPage'));
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
 * App: Defines application routing structure with protected routes
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
            <Route path="/" element={<DashboardPage />} />
            <Route path="/students" element={<StudentsPage />} />
            <Route path="/students/new" element={<AddStudentPage />} />
            <Route path="/students/:id" element={<StudentProfilePage />} />
            <Route path="/interventions" element={<InterventionsPage />} />
            <Route path="/early-warning" element={<EarlyWarningPage />} />
          </Route>
        </Route>

        {/* Catch-all fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
