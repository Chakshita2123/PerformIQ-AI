import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  ClipboardList,
  LogOut,
  ShieldAlert,
  GraduationCap,
  Menu,
  X,
  UserCheck,
} from 'lucide-react';

/**
 * Main application layout featuring a responsive sidebar, sticky topbar,
 * active route indicators, user details, and logout functionality.
 */
export default function Layout() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Students', path: '/students', icon: Users },
    { name: 'Enroll Student', path: '/students/new', icon: UserPlus },
    { name: 'Interventions', path: '/interventions', icon: ClipboardList },
    { name: 'Early Warning', path: '/early-warning', icon: ShieldAlert },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* ── Mobile Topbar ──────────────────────────────────────────────────── */}
      <div className="md:hidden bg-slate-900 text-white flex items-center justify-between p-4 sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-1.5 rounded-lg">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold tracking-tight text-lg">PerformIQ AI</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* ── Sidebar (Desktop & Mobile Drawer) ──────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-100 flex flex-col transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl shadow-md shadow-indigo-500/20">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight leading-none text-white">PerformIQ AI</h1>
            <p className="text-xs text-indigo-400 font-medium mt-1">Student Early-Intervention</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Main Menu
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                  }`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400 font-semibold text-sm">
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-medium text-white truncate">{user?.name || 'User'}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    isAdmin
                      ? 'bg-purple-950/80 text-purple-300 border border-purple-800'
                      : 'bg-indigo-950/80 text-indigo-300 border border-indigo-800'
                  }`}
                >
                  {user?.role || 'Teacher'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-300 hover:bg-rose-950/30 border border-slate-800 hover:border-rose-900/50 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Backdrop for mobile drawer */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-950/60 z-30 md:hidden backdrop-blur-xs"
        />
      )}

      {/* ── Main Content Area ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Desktop Header */}
        <header className="hidden md:flex items-center justify-between px-8 py-4 bg-white border-b border-slate-200">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">
              Welcome back, <span className="text-indigo-600">{user?.name}</span>
            </h2>
            <p className="text-xs text-slate-500">
              {isAdmin
                ? 'System Administrator mode (Full access across all teachers and students)'
                : 'Teacher mode (Scoped view of your assigned students)'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`text-xs font-medium px-3 py-1 rounded-full border ${
                isAdmin
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-indigo-50 text-indigo-700 border-indigo-200'
              }`}
            >
              Role: <strong className="capitalize">{user?.role}</strong>
            </span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
