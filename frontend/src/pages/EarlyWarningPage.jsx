import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import {
  ShieldAlert,
  Info,
  TrendingUp,
  Activity,
  Users,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

/**
 * EarlyWarningPage (Module 3 — OULAD Analysis):
 * Presents early-warning classification performance across temporal cutoffs,
 * weekly Virtual Learning Environment (VLE) interaction patterns by student outcome,
 * and a paginated directory of students flagged as academically at-risk.
 */
export default function EarlyWarningPage() {
  // Chart data states
  const [cutoffData, setCutoffData] = useState([]);
  const [engagementData, setEngagementData] = useState([]);
  const [chartsLoading, setChartsLoading] = useState(true);

  // At-risk table states
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 15 });
  const [riskFilter, setRiskFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [searchStudentId, setSearchStudentId] = useState('');
  const [tableLoading, setTableLoading] = useState(true);
  const [tableError, setTableError] = useState(null);

  // Fetch benchmark charts data on mount
  useEffect(() => {
    const fetchAnalytics = async () => {
      setChartsLoading(true);
      try {
        const [cutoffRes, engageRes] = await Promise.all([
          api.get('/oulad/cutoff-results'),
          api.get('/oulad/engagement'),
        ]);

        if (cutoffRes.data?.success) {
          setCutoffData(cutoffRes.data.data.results || []);
        }
        if (engageRes.data?.success) {
          setEngagementData(engageRes.data.data.engagement || []);
        }
      } catch (err) {
        console.error('Failed to load OULAD analytics charts:', err);
      } finally {
        setChartsLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  // Fetch at-risk records table with filters
  const fetchAtRiskRecords = useCallback(
    async (page = 1) => {
      setTableLoading(true);
      setTableError(null);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '15',
        });
        if (riskFilter) params.append('risk_level', riskFilter);
        if (moduleFilter) params.append('code_module', moduleFilter);
        if (searchStudentId.trim()) params.append('search', searchStudentId.trim());

        const res = await api.get(`/oulad/at-risk?${params.toString()}`);
        if (res.data?.success) {
          setRecords(res.data.data.records || []);
          setPagination(res.data.data.pagination || { page: 1, pages: 1, total: 0, limit: 15 });
        } else {
          setTableError(res.data?.message || 'Failed to retrieve at-risk records.');
        }
      } catch (err) {
        setTableError(err.response?.data?.message || 'Error fetching at-risk data.');
      } finally {
        setTableLoading(false);
      }
    },
    [riskFilter, moduleFilter, searchStudentId]
  );

  useEffect(() => {
    fetchAtRiskRecords(1);
  }, [fetchAtRiskRecords]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAtRiskRecords(1);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <ShieldAlert className="w-7 h-7 text-indigo-600" />
            Early-Warning System & OULAD Benchmarks
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Temporal cutoff evaluation, course interaction patterns, and at-risk student monitoring.
          </p>
        </div>
      </div>

      {/* ── Information / Disclaimer Box ───────────────────────────────────── */}
      <div className="p-4 bg-indigo-50/80 border border-indigo-200/80 rounded-2xl text-xs text-indigo-950 flex items-start gap-3 shadow-sm">
        <Info className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
        <div>
          <h2 className="font-bold text-indigo-900">Module 3 — Open University Learning Analytics Dataset (OULAD)</h2>
          <p className="mt-1 text-indigo-800 leading-relaxed">
            This module presents a standalone, pre-computed machine learning and engagement analysis
            trained on authentic university coursework logs. It functions as an independent early-warning
            benchmark and is separate from the synthetic Module 1 student performance records.
          </p>
        </div>
      </div>

      {/* ── Analytics Visualizations Grid ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Cutoff Benchmark */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                Model Discrimination by Cutoff Day
              </h2>
              <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                ROC-AUC vs Recall
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-6">
              Shows how prediction accuracy improves as the academic term progresses.
            </p>

            {chartsLoading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : cutoffData.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={cutoffData} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis
                      dataKey="cutoff_day"
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      label={{ value: 'Day of Term', position: 'insideBottomRight', offset: -5, fontSize: 10 }}
                    />
                    <YAxis domain={[0.4, 1.0]} tick={{ fontSize: 11, fill: '#64748B' }} />
                    <Tooltip
                      formatter={(val, name) => [
                        typeof val === 'number' ? val.toFixed(3) : val,
                        name === 'ROC_AUC' ? 'ROC-AUC' : 'Recall',
                      ]}
                      labelFormatter={(day) => `Cutoff: Day ${day}`}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    <Line
                      type="monotone"
                      dataKey="ROC_AUC"
                      name="ROC-AUC"
                      stroke="#4F46E5"
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Recall"
                      name="Recall"
                      stroke="#8B5CF6"
                      strokeWidth={2.5}
                      strokeDasharray="4 4"
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-xs text-slate-400 italic">
                No cutoff benchmark records found.
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Earliest high-confidence window: <strong>Day 20 - 40</strong></span>
            <span className="text-indigo-600 font-semibold">Pre-computed Benchmark</span>
          </div>
        </div>

        {/* Chart 2: Weekly Engagement */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                Weekly VLE Clicks by Final Outcome
              </h2>
              <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                Behavioral Divergence
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-6">
              Average weekly student portal interactions segmented by course completion outcome.
            </p>

            {chartsLoading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : engagementData.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={engagementData} margin={{ top: 10, right: 15, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis
                      dataKey="week"
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      label={{ value: 'Week', position: 'insideBottomRight', offset: -5, fontSize: 10 }}
                    />
                    <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                    <Tooltip
                      formatter={(val) => [`${val} clicks`, 'Avg Clicks']}
                      labelFormatter={(wk) => `Week ${wk}`}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    <Line
                      type="monotone"
                      dataKey="Distinction"
                      name="Distinction"
                      stroke="#059669"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="Pass"
                      name="Pass"
                      stroke="#4F46E5"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="Fail"
                      name="Fail"
                      stroke="#D97706"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="Withdrawn"
                      name="Withdrawn"
                      stroke="#E11D48"
                      strokeWidth={2}
                      strokeDasharray="3 3"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-xs text-slate-400 italic">
                No weekly engagement records found.
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Failing & Withdrawing students diverge by: <strong>Week 3</strong></span>
            <span className="text-emerald-600 font-semibold">Engagement Signal</span>
          </div>
        </div>
      </div>

      {/* ── At-Risk Student Directory ───────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Table Filters & Search Header */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              At-Risk Student Registry
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Identified students requiring proactive retention outreach ({pagination.total} records).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Risk Level Filter */}
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Risk Levels</option>
              <option value="High Risk">High Risk</option>
              <option value="Medium Risk">Medium Risk</option>
              <option value="Low Risk">Low Risk</option>
            </select>

            {/* Course Module Filter */}
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Modules</option>
              {['AAA', 'BBB', 'CCC', 'DDD', 'EEE', 'FFF', 'GGG'].map((m) => (
                <option key={m} value={m}>Module {m}</option>
              ))}
            </select>

            {/* Student ID Search Form */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search Student ID..."
                value={searchStudentId}
                onChange={(e) => setSearchStudentId(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:ring-1 focus:ring-indigo-500 w-44"
              />
            </form>
          </div>
        </div>

        {/* Table Content */}
        {tableLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs font-semibold text-slate-500">Loading at-risk registry...</p>
          </div>
        ) : tableError ? (
          <div className="p-12 text-center text-xs text-rose-600">{tableError}</div>
        ) : records.length === 0 ? (
          <div className="p-16 text-center text-xs text-slate-400">
            No at-risk student records found matching the applied filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Student ID</th>
                  <th className="py-3 px-4">Module & Term</th>
                  <th className="py-3 px-4">Risk Classification</th>
                  <th className="py-3 px-4">Failure Probability</th>
                  <th className="py-3 px-4">VLE Active Days</th>
                  <th className="py-3 px-4">Total Interactions</th>
                  <th className="py-3 px-4 text-right">Assessment Avg</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {r.id_student}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">
                      Module {r.code_module} ({r.code_presentation})
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
                          r.risk_level === 'High Risk'
                            ? 'bg-rose-100 text-rose-800'
                            : r.risk_level === 'Medium Risk'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {r.risk_level}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 font-mono">
                          {((r.risk_prob ?? 0) * 100).toFixed(1)}%
                        </span>
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              r.risk_prob > 0.65
                                ? 'bg-rose-500'
                                : r.risk_prob > 0.35
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, (r.risk_prob ?? 0) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono">{r.days_active ?? 'N/A'} days</td>
                    <td className="py-3 px-4 font-mono">{r.total_clicks ?? 'N/A'} clicks</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-800 font-mono">
                      {r.assessment_avg !== null && r.assessment_avg !== undefined
                        ? `${r.assessment_avg.toFixed(1)}%`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination Footer ──────────────────────────────────────────────── */}
        {!tableLoading && pagination.pages > 1 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing page <strong className="text-slate-800">{pagination.page}</strong> of{' '}
              <strong className="text-slate-800">{pagination.pages}</strong> ({pagination.total}{' '}
              total students)
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchAtRiskRecords(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg bg-white font-medium hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <button
                onClick={() => fetchAtRiskRecords(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg bg-white font-medium hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
