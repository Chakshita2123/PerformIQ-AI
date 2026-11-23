import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import { DEMO_ACCOUNTS } from '../constants/demoAccounts';
import { GraduationCap, Lock, Mail, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

/**
 * LoginPage
 * Split-screen layout featuring a deep navy brand showcase on the left
 * (with the real seeded cohort risk distribution and OULAD early-warning benchmark),
 * paired with a clean authentication form on the right.
 */
export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Show demo logins button only if VITE_SHOW_DEMO_LOGINS is true
  const showDemoLogins =
    import.meta.env.VITE_SHOW_DEMO_LOGINS !== 'false' &&
    import.meta.env.VITE_SHOW_DEMO_LOGINS !== false;

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
    <div className="min-h-screen bg-page flex flex-col md:flex-row transition-colors">
      {/* ── Left Showcase Panel (Deep Navy Base) ─────────────────────────── */}
      <div className="hidden md:flex md:w-1/2 lg:w-5/12 bg-[#0F1C2E] text-[#F4F6F9] p-8 lg:p-12 flex-col justify-between border-r border-[#263952]">
        {/* Brand Header */}
        <div className="flex items-center gap-3">
          <div className="bg-teal p-2.5 rounded-xl text-navy">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">PerformIQ AI</h1>
            <p className="text-xs text-slate-300">Early intervention intelligence</p>
          </div>
        </div>

        {/* Vertically Balanced Middle Content */}
        <div className="my-auto py-8 space-y-7">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white leading-snug">
              Who needs help today?
            </h2>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">
              Machine learning score forecasting paired with rule-based intervention guidance
              for teachers.
            </p>
          </div>

          {/* Real Seeded Cohort Risk Distribution */}
          <div className="p-4 rounded-xl bg-[#172437] border border-[#263952] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white">Sample class risk distribution</span>
              {/* Real seeded split from 5,000 students in MongoDB: High 16.8% (~17%), Medium 26.8% (~27%), Low 56.4% (~56%) */}
              <span className="text-slate-300 font-mono-num">5,000 cohort</span>
            </div>

            {/* Segmented Risk Bar (High 17%, Medium 27%, Low 56% totaling exactly 100%) */}
            <div
              className="w-full h-3 rounded-full flex overflow-hidden bg-[#1F3046]"
              role="progressbar"
              aria-label="Sample class risk distribution"
            >
              <div style={{ width: '17%' }} className="bg-coral h-full" title="High risk: 17%" />
              <div style={{ width: '27%' }} className="bg-amber h-full" title="Medium risk: 27%" />
              <div style={{ width: '56%' }} className="bg-mint h-full" title="Low risk: 56%" />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-300 pt-1 font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-coral flex-shrink-0" /> High (17%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber flex-shrink-0" /> Medium (27%)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-mint flex-shrink-0" /> Low (56%)
              </span>
            </div>
          </div>

          {/* OULAD Early-Warning Benchmark Telemetry Curve */}
          <div className="p-4 rounded-xl bg-[#172437] border border-[#263952] space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white">OULAD early-warning benchmark</span>
              <span className="text-xs font-mono-num text-teal font-semibold">ROC-AUC</span>
            </div>

            {/* Vector ROC-AUC Progression Curve */}
            <div className="py-2">
              <svg viewBox="0 0 260 70" className="w-full h-16 overflow-visible" aria-hidden="true">
                {/* Random Baseline (0.5) */}
                <line x1="20" y1="60" x2="240" y2="60" stroke="#334A68" strokeDasharray="3 3" />
                <text x="242" y="63" fill="#94A3B8" fontSize="9" fontFamily="DM Mono">0.5</text>

                {/* Benchmark Curve */}
                <path
                  d="M 20 60 Q 90 32 150 24 T 240 10"
                  fill="none"
                  stroke="#2AB4A0"
                  strokeWidth="2.5"
                />

                {/* Day 40 Marker */}
                <circle cx="80" cy="38" r="4" fill="#0F1C2E" stroke="#2AB4A0" strokeWidth="2" />
                <text x="70" y="53" fill="#CBD5E1" fontSize="9" fontFamily="DM Mono">Day 40</text>
                <text x="70" y="29" fill="#FFFFFF" fontSize="9" fontWeight="700" fontFamily="DM Mono">0.81</text>

                {/* Day 60 Marker */}
                <circle cx="150" cy="24" r="4" fill="#0F1C2E" stroke="#2AB4A0" strokeWidth="2" />
                <text x="140" y="39" fill="#CBD5E1" fontSize="9" fontFamily="DM Mono">Day 60</text>
                <text x="140" y="15" fill="#FFFFFF" fontSize="9" fontWeight="700" fontFamily="DM Mono">0.84</text>

                {/* Day 180 Marker */}
                <circle cx="230" cy="11" r="4" fill="#2AB4A0" />
                <text x="215" y="25" fill="#CBD5E1" fontSize="9" fontFamily="DM Mono">Day 180</text>
                <text x="215" y="3" fill="#FFFFFF" fontSize="9" fontWeight="700" fontFamily="DM Mono">0.94</text>
              </svg>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              Telemetry shows early model discrimination rising from 0.81 ROC-AUC at Day 40 to
              0.94 by day 180.
            </p>
          </div>
        </div>

        {/* Footer Note (High Contrast, Clean Spacing, No Middle Dot) */}
        <div className="pt-6 border-t border-[#263952] text-xs text-slate-400">
          PerformIQ AI platform for educators and academic advisors
        </div>
      </div>

      {/* ── Right Authentication Panel ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center p-6 sm:p-12 lg:p-16 max-w-lg mx-auto w-full">
        {/* Top bar with theme toggle */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2 md:hidden">
            <div className="bg-teal p-1.5 rounded-lg text-navy">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="font-bold tracking-tight text-base text-text-primary">
              PerformIQ AI
            </span>
          </div>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-text-primary">
              Sign in to PerformIQ
            </h2>
            <p className="text-xs text-text-muted mt-1">
              Enter your institutional credentials to access your dashboard.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="p-3 bg-risk-high-bg border border-risk-high-border rounded-lg text-xs text-risk-high-text flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-text-primary mb-1.5"
              >
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-subtle">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teacher1@performiq.ai"
                  className="w-full pl-9 pr-3.5 py-2 text-sm bg-panel border border-border rounded-lg text-text-primary placeholder:text-text-subtle focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-text-primary mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-subtle">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3.5 py-2 text-sm bg-panel border border-border rounded-lg text-text-primary placeholder:text-text-subtle focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-navy bg-teal hover:bg-accent-hover rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-navy border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Demo Logins (Connected directly to DEMO_ACCOUNTS) */}
          {showDemoLogins && (
            <div className="pt-6 border-t border-border space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-medium text-text-muted">
                <ShieldCheck className="w-3.5 h-3.5 text-teal" />
                <span>Demo accounts (click to fill):</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => fillCredentials(acc.email, acc.password)}
                    className="p-2 text-left bg-subtle hover:bg-active border border-border rounded-lg text-xs transition-colors focus-visible:ring-1 focus-visible:ring-accent"
                  >
                    <p className="font-semibold text-text-primary">{acc.role}</p>
                    <p className="text-[11px] text-text-muted truncate">{acc.email}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
