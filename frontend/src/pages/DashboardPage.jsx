import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Award,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  TrendingUp,
  Activity,
  Lightbulb,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const RISK_COLORS = {
  High: '#ef4444',     // Rose / Red
  Medium: '#f59e0b',   // Amber
  Low: '#10b981',      // Emerald / Green
  unassessed: '#94a3b8'// Slate
};

const INTERVENTION_COLORS = {
  completed: '#10b981',
  ongoing: '#3b82f6',
  planned: '#8b5cf6',
};

/**
 * DashboardPage: Visualizes student risk distribution, interventions progress,
 * and top rule-based recommendations via Recharts and statistical summary cards.
 */
export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchSummary = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/dashboard/summary');
      if (res.data?.success && res.data?.data) {
        setData(res.data.data);
      } else {
        setError('Failed to load dashboard summary data.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error communicating with server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-500">Loading student analytics & risk models...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl max-w-xl mx-auto my-12 text-center">
        <AlertCircle className="w-10 h-10 text-rose-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-rose-800">Unable to load Dashboard</h3>
        <p className="text-sm text-rose-600 mt-1 mb-4">{error}</p>
        <button
          onClick={fetchSummary}
          className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  const { students, interventions, topRecommendations } = data || {};
  const byRisk = students?.byRiskLevel || {};

  // Prepare Pie Chart data
  const pieData = [
    { name: 'High Risk', value: byRisk.High || 0, color: RISK_COLORS.High },
    { name: 'Medium Risk', value: byRisk.Medium || 0, color: RISK_COLORS.Medium },
    { name: 'Low Risk', value: byRisk.Low || 0, color: RISK_COLORS.Low },
  ];
  if (byRisk.unassessed > 0) {
    pieData.push({ name: 'Unassessed', value: byRisk.unassessed, color: RISK_COLORS.unassessed });
  }

  // Prepare Bar Chart data
  const barData = [
    {
      status: 'Completed',
      count: interventions?.completed || 0,
      fill: INTERVENTION_COLORS.completed,
    },
    {
      status: 'Ongoing',
      count: interventions?.ongoing || 0,
      fill: INTERVENTION_COLORS.ongoing,
    },
    {
      status: 'Planned',
      count: interventions?.planned || 0,
      fill: INTERVENTION_COLORS.planned,
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Scope Notice Banner ────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Performance & Risk Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAdmin ? (
              <span className="text-purple-700 font-medium">
                Global Administrator view: Analytics aggregated across all teachers and students.
              </span>
            ) : (
              <span className="text-indigo-700 font-medium">
                Teacher view: Aggregated strictly for your assigned students ({students?.total} students).
              </span>
            )}
          </p>
        </div>

        <button
          onClick={fetchSummary}
          title="Refresh summary data"
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* ── Summary Metric Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Students */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Students</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-slate-900">{students?.total ?? 0}</p>
          <span className="text-[11px] text-slate-400 mt-1 font-medium">Assigned pool</span>
        </div>

        {/* Average Score */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg Score</span>
            <Award className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-slate-900">
            {typeof students?.avgPredictedScore === 'number'
              ? students.avgPredictedScore.toFixed(2)
              : 'N/A'}
          </p>
          <span className="text-[11px] text-emerald-600 mt-1 font-medium flex items-center gap-1">
            <TrendingUp className="w-3 h-3 inline" /> Score out of 100
          </span>
        </div>

        {/* High Risk */}
        <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-600 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">High Risk</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-700">{byRisk.High ?? 0}</p>
          <span className="text-[11px] text-rose-600 font-medium mt-1">Score &lt; 50%</span>
        </div>

        {/* Medium Risk */}
        <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Medium Risk</span>
            <Activity className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-700">{byRisk.Medium ?? 0}</p>
          <span className="text-[11px] text-amber-600 font-medium mt-1">Score 50–59%</span>
        </div>

        {/* Low Risk */}
        <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Low Risk</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-700">{byRisk.Low ?? 0}</p>
          <span className="text-[11px] text-emerald-600 font-medium mt-1">Score &ge; 60%</span>
        </div>

        {/* Unassessed */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Unassessed</span>
            <HelpCircle className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-600">{byRisk.unassessed ?? 0}</p>
          <span className="text-[11px] text-slate-400 font-medium mt-1">Pending predict</span>
        </div>
      </div>

      {/* ── Charts Grid ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Level Distribution Pie Chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Student Risk Breakdown</h2>
              <p className="text-xs text-slate-400">Classified by HistGradientBoostingRegressor model</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
              Pie Chart
            </span>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {students?.total === 0 ? (
              <p className="text-sm text-slate-400 italic">No student records available.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val, name) => [
                      `${val} students (${((val / (students?.total || 1)) * 100).toFixed(1)}%)`,
                      name,
                    ]}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Interventions by Status Bar Chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Interventions by Status</h2>
              <p className="text-xs text-slate-400">
                Total interventions assigned:{' '}
                {interventions?.total ??
                  (interventions?.completed || 0) +
                    (interventions?.ongoing || 0) +
                    (interventions?.planned || 0)}
              </p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
              Bar Chart
            </span>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {interventions?.total === 0 ? (
              <p className="text-sm text-slate-400 italic">No interventions assigned yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                  <XAxis dataKey="status" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip
                    formatter={(value) => [`${value} interventions`, 'Count']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ── Top Recommendations Reasons List ────────────────────────────────── */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Top Actionable Recommendations
            </h2>
            <p className="text-xs text-slate-500">
              Aggregated from High and Medium risk students' latest predictions (deduplicated per student)
            </p>
          </div>
        </div>

        {!topRecommendations || topRecommendations.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center italic">
            No recommendations generated yet.
          </p>
        ) : (
          <div className="space-y-3">
            {topRecommendations.map((rec, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between gap-4 p-3.5 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100/60 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <p className="text-sm font-medium text-slate-800 leading-snug">{rec.reason}</p>
                </div>
                <span className="flex-shrink-0 text-xs font-semibold px-2.5 py-1 bg-white border border-slate-200 rounded-full text-slate-700 shadow-2xs">
                  {rec.count} students
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
