import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Lock, Mail, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

/**
 * LoginPage: Provides user authentication with quick-fill demo buttons
 * for Administrator and Teachers to facilitate testing and evaluation.
 */
export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Show demo logins button only if VITE_SHOW_DEMO_LOGINS is true (or unset for local dev)
  const showDemoLogins = import.meta.env.VITE_SHOW_DEMO_LOGINS !== 'false' && import.meta.env.VITE_SHOW_DEMO_LOGINS !== false;

  // If already authenticated, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.message);
    }
  };

  const fillCredentials = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 px-4">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-600/30 mb-4">
          <GraduationCap className="w-9 h-9 text-white" />
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">PerformIQ AI</h1>
        <p className="mt-2 text-sm text-slate-400">
          Student Performance Prediction & Early-Intervention Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl sm:px-10 border border-slate-100">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Email Address
              </label>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@school.com"
                  className="block w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Password
              </label>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* ── Demo Accounts Quick-Fill Box ──────────────────────────────── */}
          {showDemoLogins && (
            <div className="mt-8 pt-6 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Demo Accounts (Click to Fill)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Click an account below to automatically fill the login credentials:
              </p>

              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => fillCredentials('admin@performiq.ai', 'AdminDemo123!')}
                  className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border border-slate-200 rounded-lg text-left transition-colors group"
                >
                  <div>
                    <p className="text-xs font-semibold text-slate-800 group-hover:text-indigo-700">
                      Administrator
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono">admin@performiq.ai</p>
                  </div>
                  <span className="text-[10px] bg-purple-100 text-purple-700 font-medium px-2 py-0.5 rounded">
                    Admin
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => fillCredentials('teacher1@performiq.ai', 'TeacherDemo123!')}
                  className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border border-slate-200 rounded-lg text-left transition-colors group"
                >
                  <div>
                    <p className="text-xs font-semibold text-slate-800 group-hover:text-indigo-700">
                      Dr. Sarah Jenkins
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono">teacher1@performiq.ai</p>
                  </div>
                  <span className="text-[10px] bg-indigo-100 text-indigo-700 font-medium px-2 py-0.5 rounded">
                    Teacher (1,667 Students)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => fillCredentials('teacher2@performiq.ai', 'TeacherDemo123!')}
                  className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border border-slate-200 rounded-lg text-left transition-colors group"
                >
                  <div>
                    <p className="text-xs font-semibold text-slate-800 group-hover:text-indigo-700">
                      Prof. Marcus Chen
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono">teacher2@performiq.ai</p>
                  </div>
                  <span className="text-[10px] bg-indigo-100 text-indigo-700 font-medium px-2 py-0.5 rounded">
                    Teacher (1,667 Students)
                  </span>
                </button>
              </div>

              <p className="mt-3 text-[11px] text-slate-400 italic text-center">
                Demo passwords are for local evaluation only. Change in .env before public deployment.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
