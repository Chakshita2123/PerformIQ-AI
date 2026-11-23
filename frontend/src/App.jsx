import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import StudentsPage from './pages/StudentsPage';
import StudentProfilePage from './pages/StudentProfilePage';
import AddStudentPage from './pages/AddStudentPage';
import InterventionsPage from './pages/InterventionsPage';
import EarlyWarningPage from './pages/EarlyWarningPage';

/**
 * App: Defines application routing structure with protected routes
 * and role-aware navigation under Layout.
 */
export default function App() {
  return (
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
  );
}
