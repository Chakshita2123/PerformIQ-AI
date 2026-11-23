import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useChartTheme } from '../context/ThemeContext';
import RiskBar from '../components/RiskBar';
import AttentionRow from '../components/AttentionRow';
import FlowStrip from '../components/FlowStrip';
import WelcomeCard from '../components/WelcomeCard';
import Skeleton from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import {
  AlertTriangle,
  Lightbulb,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  X,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { INTERVENTION_TYPES } from '../constants/studentFields';

/**
 * DashboardPage
 * Redesigned teacher cockpit:
 * 1. Leads with "Needs attention today" (top 5 lowest score students with recommendation reasons & quick actions).
 * 2. Single class-health summary bar (proportional segmented distribution).
 * 3. Restyled quiet charts for interventions progress and top actionable recommendation reasons.
 */
export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const chartTheme = useChartTheme();

  const [summaryData, setSummaryData] = useState(null);
  const [attentionStudents, setAttentionStudents] = useState([]);
  const [followupsData, setFollowupsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Quick predict state
  const [predictingId, setPredictingId] = useState(null);
  const [predictNotice, setPredictNotice] = useState(null);

  // Quick intervention modal state
  const [selectedStudentForIntervention, setSelectedStudentForIntervention] = useState(null);
  const [interventionForm, setInterventionForm] = useState({
    type: 'Mentoring',
    startDate: new Date().toISOString().split('T')[0],
    status: 'planned',
    description: '',
  });
  const [interventionSubmitting, setInterventionSubmitting] = useState(false);
  const [interventionSuccess, setInterventionSuccess] = useState(false);

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const [sumRes, attRes, folRes] = await Promise.all([
        api.get('/dashboard/summary'),
        api.get('/dashboard/attention'),
        api.get('/dashboard/followups'),
      ]);

      if (sumRes.data?.success) {
        setSummaryData(sumRes.data.data);
      }
      if (attRes.data?.success) {
        setAttentionStudents(attRes.data.data || []);
      }
      if (folRes.data?.success) {
        setFollowupsData(folRes.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error connecting to the analytics server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Handle Quick Predict
  const handleQuickPredict = async (student) => {
    setPredictingId(student._id);
    setPredictNotice(null);
    try {
      const res = await api.post(`/students/${student._id}/predict`);
      if (res.data?.success) {
        setPredictNotice({
          type: 'success',
          message: `Prediction updated for ${student.name}: score ${res.data.data?.predictedScore?.toFixed(2)} (${res.data.data?.riskLevel} risk).`,
        });
        // Refresh attention list & summary
        fetchDashboardData(true);
      }
    } catch (err) {
      setPredictNotice({
        type: 'error',
        message: err.response?.data?.message || `Failed to run prediction for ${student.name}.`,
      });
    } finally {
      setPredictingId(null);
    }
  };

  // Handle Quick Intervention
  const handleQuickIntervention = (student) => {
    setSelectedStudentForIntervention(student);
    setInterventionForm({
      type: 'Mentoring',
      startDate: new Date().toISOString().split('T')[0],
      status: 'planned',
      description: `Targeted intervention assigned for ${student.name}`,
    });
    setInterventionSuccess(false);
  };

  const submitIntervention = async (e) => {
    e.preventDefault();
    if (!selectedStudentForIntervention) return;

    setInterventionSubmitting(true);
    try {
      const payload = {
        student: selectedStudentForIntervention._id,
        type: interventionForm.type,
        startDate: interventionForm.startDate,
        status: interventionForm.status,
        description: interventionForm.description,
      };

      const res = await api.post('/interventions', payload);
      if (res.data?.success) {
        setInterventionSuccess(true);
        setTimeout(() => {
          setSelectedStudentForIntervention(null);
          setInterventionSuccess(false);
          fetchDashboardData(true);
        }, 1200);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign intervention.');
    } finally {
      setInterventionSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton height="70px" className="w-full" />
        <Skeleton height="260px" className="w-full" />
        <Skeleton height="140px" className="w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton height="280px" className="w-full" />
          <Skeleton height="280px" className="w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-panel border border-border rounded-xl max-w-lg mx-auto my-12 text-center">
        <AlertCircle className="w-10 h-10 text-risk-high-text mx-auto mb-3" />
        <h3 className="text-base font-semibold text-text-primary">Unable to load dashboard</h3>
        <p className="text-xs text-text-muted mt-1 mb-4">{error}</p>
        <button
          onClick={() => fetchDashboardData()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal hover:bg-accent-hover text-navy text-xs font-semibold rounded-lg transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry connection</span>
        </button>
      </div>
    );
  }

  const { students, interventions, topRecommendations } = summaryData || {};
  const byRisk = students?.byRiskLevel || {};

  // Interventions bar chart data (neutral and teal tints only — no risk colours)
  const barData = [
    {
      status: 'Completed',
      count: interventions?.completed || 0,
      fill: chartTheme.teal, // Solid teal
    },
    {
      status: 'Ongoing',
      count: interventions?.ongoing || 0,
      fill: '#5EEAD4', // Light teal tint
    },
    {
      status: 'Planned',
      count: interventions?.planned || 0,
      fill: '#94A3B8', // Neutral tint
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Page Header & Scope Banner ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary">
            Performance & risk dashboard
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            {isAdmin ? (
              <span>Global administrator scope: Aggregated across all academic cohorts.</span>
            ) : (
              <span>
                Teacher scope: Aggregated for your assigned roster ({students?.total || 0} students).
              </span>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchDashboardData(true)}
          disabled={refreshing}
          title="Refresh analytics data"
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text-primary bg-panel hover:bg-subtle border border-border rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ── Welcome Onboarding Card (Dismissible with localStorage persistence) ── */}
      <WelcomeCard />

      {/* ── 4-Step Support Loop Progression (Identify → Understand → Act → Review) ── */}
      <FlowStrip counts={followupsData?.counts || {}} />

      {/* Slim single-line simulated demo data notice */}
      <div className="py-1 px-3 bg-subtle/70 border border-border rounded-md flex items-center gap-2 text-[11px] text-text-muted">
        <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-panel border border-border text-text-primary uppercase tracking-wider flex-shrink-0">
          Simulated demo data
        </span>
        <span className="truncate">
          Student assessment trajectories and intervention outcomes are generated for demonstration purposes.
        </span>
      </div>

      {/* Predict Alert Notification */}
      {predictNotice && (
        <div
          role="alert"
          className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
            predictNotice.type === 'success'
              ? 'bg-risk-low-bg border-risk-low-border text-risk-low-text'
              : 'bg-risk-high-bg border-risk-high-border text-risk-high-text'
          }`}
        >
          <span>{predictNotice.message}</span>
          <button
            type="button"
            onClick={() => setPredictNotice(null)}
            className="p-1 hover:opacity-75"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── 1. Needs Attention Today (5 Highest-Risk Students) ────────────── */}
      <section aria-labelledby="attention-heading" className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-coral flex-shrink-0" />
            <h2 id="attention-heading" className="text-base font-semibold text-text-primary tracking-tight">
              Needs attention today
            </h2>
          </div>
          <span className="text-xs text-text-muted">
            Top 5 priority students with lowest predicted scores
          </span>
        </div>

        {attentionStudents.length === 0 ? (
          <EmptyState
            title="No students requiring urgent attention"
            description="All active students in your scope currently have low risk levels or pending predictions."
          />
        ) : (
          <div className="rounded-xl border border-border overflow-hidden bg-panel divide-y divide-border-subtle">
            {attentionStudents.map((student) => (
              <AttentionRow
                key={student._id}
                student={student}
                onPredict={handleQuickPredict}
                onIntervene={handleQuickIntervention}
                isPredicting={predictingId === student._id}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── 2. Single Class Health Distribution (Proportional Bar) ────────── */}
      <section aria-label="Class health summary">
        <RiskBar
          byRisk={byRisk}
          total={students?.total || 0}
          avgPredictedScore={students?.avgPredictedScore}
        />
      </section>

      {/* ── 3. Bottom Row: Interventions & Top Recommendation Reasons ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interventions by Status (Quieter Bar Chart) */}
        <section
          aria-labelledby="interventions-heading"
          className="p-5 bg-panel border border-border rounded-xl flex flex-col"
        >
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-border-subtle">
            <div>
              <h2 id="interventions-heading" className="text-base font-semibold text-text-primary tracking-tight">
                Interventions by status
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Total interventions logged: {interventions?.total || 0}
              </p>
            </div>
            <Link
              to="/interventions"
              className="text-xs font-medium text-accent-text hover:underline"
            >
              View directory →
            </Link>
          </div>

          <div className="h-60 w-full flex items-center justify-center">
            {interventions?.total === 0 ? (
              <p className="text-xs text-text-subtle italic">No interventions logged yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
                  <XAxis
                    dataKey="status"
                    stroke={chartTheme.text}
                    tick={{ fill: chartTheme.text, fontSize: 12, fontFamily: 'DM Sans' }}
                    axisLine={{ stroke: chartTheme.grid }}
                    tickLine={{ stroke: chartTheme.grid }}
                  />
                  <YAxis
                    allowDecimals={false}
                    stroke={chartTheme.text}
                    tick={{ fill: chartTheme.text, fontSize: 12, fontFamily: 'DM Mono' }}
                    axisLine={{ stroke: chartTheme.grid }}
                    tickLine={{ stroke: chartTheme.grid }}
                  />
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{
                      backgroundColor: chartTheme.tooltipBg,
                      borderColor: chartTheme.tooltipBorder,
                      color: chartTheme.tooltipText,
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(val) => [`${val} interventions`, 'Total']}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* Top Recommendation Reasons to Act On */}
        <section
          aria-labelledby="recommendations-heading"
          className="p-5 bg-panel border border-border rounded-xl flex flex-col"
        >
          <div className="flex items-center gap-2 pb-3 mb-3 border-b border-border-subtle">
            <Lightbulb className="w-4 h-4 text-amber flex-shrink-0" />
            <div>
              <h2 id="recommendations-heading" className="text-base font-semibold text-text-primary tracking-tight">
                Top actionable recommendations
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Aggregated from High and Medium risk students' latest model predictions
              </p>
            </div>
          </div>

          {!topRecommendations || topRecommendations.length === 0 ? (
            <p className="text-xs text-text-subtle py-8 text-center italic">
              No recommendations generated yet.
            </p>
          ) : (
            <div className="space-y-2 flex-1">
              {topRecommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-subtle/60 border border-border-subtle hover:bg-subtle transition-colors"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-panel border border-border text-text-primary font-mono-num font-semibold text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <p className="text-xs font-medium text-text-primary leading-snug">
                      {rec.reason}
                    </p>
                  </div>
                  <span className="flex-shrink-0 text-[11px] font-mono-num font-semibold px-2 py-0.5 rounded bg-panel border border-border text-text-muted">
                    {rec.count} students
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── Quick Assign Intervention Modal ───────────────────────────────── */}
      {selectedStudentForIntervention && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-navy/60 flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div className="bg-panel border border-border rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="text-sm font-bold text-text-primary">Assign intervention</h3>
                <p className="text-xs text-text-muted">
                  For: {selectedStudentForIntervention.name} ({selectedStudentForIntervention.studentId})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudentForIntervention(null)}
                className="p-1 rounded-md text-text-muted hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {interventionSuccess ? (
              <div className="py-6 text-center space-y-2 text-risk-low-text">
                <CheckCircle2 className="w-10 h-10 mx-auto" />
                <p className="text-sm font-semibold">Intervention assigned successfully!</p>
              </div>
            ) : (
              <form onSubmit={submitIntervention} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-text-primary mb-1">
                    Intervention type
                  </label>
                  <select
                    value={interventionForm.type}
                    onChange={(e) =>
                      setInterventionForm({ ...interventionForm, type: e.target.value })
                    }
                    className="w-full text-xs py-2 px-3 bg-panel border border-border rounded-lg text-text-primary focus:ring-1 focus:ring-accent"
                  >
                    {INTERVENTION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-primary mb-1">
                    Start date
                  </label>
                  <input
                    type="date"
                    required
                    value={interventionForm.startDate}
                    onChange={(e) =>
                      setInterventionForm({ ...interventionForm, startDate: e.target.value })
                    }
                    className="w-full text-xs py-2 px-3 bg-panel border border-border rounded-lg text-text-primary focus:ring-1 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-primary mb-1">
                    Status
                  </label>
                  <select
                    value={interventionForm.status}
                    onChange={(e) =>
                      setInterventionForm({ ...interventionForm, status: e.target.value })
                    }
                    className="w-full text-xs py-2 px-3 bg-panel border border-border rounded-lg text-text-primary focus:ring-1 focus:ring-accent"
                  >
                    <option value="planned">Planned</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-primary mb-1">
                    Description & targeted goals
                  </label>
                  <textarea
                    rows={3}
                    value={interventionForm.description}
                    onChange={(e) =>
                      setInterventionForm({ ...interventionForm, description: e.target.value })
                    }
                    placeholder="E.g., Bi-weekly study skills tutoring to address time management..."
                    className="w-full text-xs py-2 px-3 bg-panel border border-border rounded-lg text-text-primary placeholder:text-text-subtle focus:ring-1 focus:ring-accent"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setSelectedStudentForIntervention(null)}
                    className="px-3.5 py-1.5 text-xs text-text-muted hover:text-text-primary bg-panel hover:bg-subtle border border-border rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={interventionSubmitting}
                    className="px-4 py-1.5 text-xs font-semibold text-navy bg-teal hover:bg-accent-hover rounded-lg transition-colors disabled:opacity-50"
                  >
                    {interventionSubmitting ? 'Saving...' : 'Confirm assignment'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
