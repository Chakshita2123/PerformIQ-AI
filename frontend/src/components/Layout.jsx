import React, { useState } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  ClipboardList,
  ShieldAlert,
  GraduationCap,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

/**
 * Layout
 * Polished, distinctive layout with quiet chrome, dark/light theme toggle,
 * responsive mobile menu, and clean header without duplicate scope text.
 */
export default function Layout() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Students', path: '/students', icon: Users },
    { name: 'Enroll student', path: '/students/new', icon: UserPlus },
    { name: 'Interventions', path: '/interventions', icon: ClipboardList },
    { name: 'Early warning', path: '/early-warning', icon: ShieldAlert },
  ];

  // Strict single-active matching logic:
  // /students/new activates ONLY "Enroll student".
  // /students and /students/:id (except /students/new) activates ONLY "Students".
  const isItemActive = (itemPath) => {
    if (itemPath === '/') {
      return location.pathname === '/';
    }
    if (itemPath === '/students/new') {
      return location.pathname === '/students/new';
    }
    if (itemPath === '/students') {
      return (
        location.pathname === '/students' ||
        (location.pathname.startsWith('/students/') && location.pathname !== '/students/new')
      );
    }
    return location.pathname.startsWith(itemPath);
  };

  return (
    <div className="min-h-screen bg-page text-text-primary flex flex-col md:flex-row transition-colors">
      {/* ── Mobile Top Header ────────────────────────────────────────────── */}
      <header className="md:hidden bg-panel border-b border-border flex items-center justify-between px-4 py-3 sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="bg-teal p-1.5 rounded-lg text-navy">
            <GraduationCap className="w-5 h-5" />
          </div>
          <span className="font-bold tracking-tight text-base text-text-primary">
            PerformIQ AI
          </span>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="p-2 rounded-lg border border-border text-text-muted hover:text-text-primary hover:bg-subtle focus-visible:ring-2 focus-visible:ring-accent"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* ── Sidebar (Desktop & Mobile Drawer) ────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-panel border-r border-border flex flex-col transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-teal p-2 rounded-xl text-navy">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight leading-none text-text-primary">
                PerformIQ AI
              </h1>
              <p className="text-xs text-text-muted mt-1">Student early intervention</p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <div className="px-3 pt-2 pb-1.5 text-xs font-medium text-text-subtle">
            Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-subtle text-accent-text border border-border font-semibold'
                    : 'text-text-muted hover:text-text-primary hover:bg-subtle'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Mobile Drawer Footer User Profile */}
        <div className="md:hidden p-3.5 border-t border-border bg-subtle/40 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-panel border border-border flex items-center justify-center text-accent-text font-bold text-xs flex-shrink-0">
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-text-primary truncate">{user?.name || 'User'}</p>
              <span className="text-[11px] text-text-muted capitalize">
                {user?.role || 'Teacher'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-medium text-text-muted hover:text-risk-high-text hover:bg-risk-high-bg border border-border transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-navy/60 z-30 md:hidden"
          aria-hidden="true"
        />
      )}

      {/* ── Main Content Area ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Desktop Sticky Header: Clean, quiet, with ThemeToggle & User Profile */}
        <header className="hidden md:flex items-center justify-between px-8 py-3 bg-panel border-b border-border sticky top-0 z-20">
          <div />

          {/* User Controls & Profile */}
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-subtle border border-border flex items-center justify-center text-accent-text font-bold text-xs flex-shrink-0">
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <div className="text-left">
                <span className="text-xs font-semibold text-text-primary block leading-tight">
                  {user?.name || 'User'}
                </span>
                <span className="text-[10px] text-text-muted capitalize block leading-tight">
                  {user?.role || 'Teacher'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-text-muted hover:text-risk-high-text hover:bg-risk-high-bg border border-border transition-colors focus-visible:ring-2 focus-visible:ring-accent"
              title="Sign out of PerformIQ AI"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
