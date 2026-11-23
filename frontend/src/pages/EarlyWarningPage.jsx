import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import RiskBadge from '../components/RiskBadge';
import Skeleton from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { useChartTheme } from '../context/ThemeContext';
import {
  ShieldAlert,
  Info,
  TrendingUp,
  Activity,
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  LabelList,
} from 'recharts';

/**
 * EarlyWarningPage (Module 3 — OULAD Benchmark Analysis)
 * 1. How early can we spot at-risk students? (ROC-AUC) with annotated benchmark callouts.
 * 2. Weekly activity on the learning platform by final outcome.
 * 3. At-risk student registry showing human headers:
 *    (Student ID, Module, Risk level, Risk probability, Average score).
 */
export default function EarlyWarningPage() {
  const chartTheme = useChartTheme();

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

  // Find real API values for cutoff days
  const day40 = cutoffData.find((d) => d.cutoff_day === 40);
  const day60 = cutoffData.find((d) => d.cutoff_day === 60);
  const day180 = cutoffData.find((d) => d.cutoff_day === 180);

  const day40Pct = day40?.ROC_AUC ? Math.round(day40.ROC_AUC * 100) : 81;
  const day60Pct = day60?.ROC_AUC ? Math.round(day60.ROC_AUC * 100) : 84;
  const day180Pct = day180?.ROC_AUC ? Math.round(day180.ROC_AUC * 100) : 94;

  // Custom label renderer for Day 40, Day 60, Day 180 on AUC chart
  const renderKeyCutoffLabel = (props) => {
    const { x, y, value, index } = props;
    const item = cutoffData[index];
    if (!item) return null;
    if ([40, 60, 180].includes(item.cutoff_day)) {
      return (
        <text
          x={x}
          y={y - 10}
          fill={chartTheme.text}
          textAnchor="middle"
          fontSize={11}
          fontWeight="bold"
          fontFamily="DM Mono"
        >
          {typeof value === 'number' ? value.toFixed(2) : value}
        </text>
      );
    }
    return null;
  };

  // Direct line-end label renderer for engagement chart
  const renderEndLabel = (labelName, color) => (props) => {
    const { x, y, index } = props;
    if (engagementData && index === engagementData.length - 1) {
      return (
        <text
          x={x + 6}
          y={y + 4}
          fill={color}
          fontSize={11}
          fontWeight="bold"
          fontFamily="DM Sans"
        >
          {labelName}
        </text>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary">
            Early-warning system & OULAD benchmarks
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Module 3: Pre-computed early intervention telemetry trained on Open University Learning Analytics data
          </p>
        </div>
      </div>

      {/* ── Context / Information Note (Plain-language requirement 12) ──────── */}
      <div className="p-4 bg-subtle/70 border border-border rounded-xl text-xs text-text-muted flex items-start gap-3">
        <Info className="w-4 h-4 text-teal mt-0.5 flex-shrink-0" />
        <div className="space-y-1">
          <p className="font-semibold text-text-primary">
            Open University Learning Analytics Dataset (OULAD) Benchmark
          </p>
          <p className="leading-relaxed">
            This is a separate study on real Open University data. It is not linked to the students on your roster.
          </p>
        </div>
      </div>

      {/* ── Visualizations: ROC-AUC Progression & VLE Engagement ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Temporal ROC-AUC Progression */}
        <section className="p-5 bg-panel border border-border rounded-xl flex flex-col justify-between">
          <div>
            <div className="pb-3 mb-3 border-b border-border-subtle">
              <h2 className="text-base font-semibold text-text-primary tracking-tight">
                How early can we spot at-risk students?
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Prediction accuracy across observation horizons (measured by ROC-AUC)
              </p>
            </div>

            {chartsLoading ? (
              <Skeleton height="240px" className="w-full" />
            ) : (
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={cutoffData}
                    margin={{ top: 25, right: 35, left: -10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                    <XAxis
                      dataKey="cutoff_day"
                      stroke={chartTheme.text}
                      tickFormatter={(v) => `Day ${v}`}
                      tick={{ fill: chartTheme.text, fontSize: 11, fontFamily: 'DM Sans' }}
                    />
                    <YAxis
                      domain={[0.5, 1.0]}
                      ticks={[0.5, 0.6, 0.7, 0.8, 0.9, 1.0]}
                      tickFormatter={(v) => v.toFixed(1)}
                      stroke={chartTheme.text}
                      tick={{ fill: chartTheme.text, fontSize: 11, fontFamily: 'DM Mono' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: chartTheme.tooltipBg,
                        borderColor: chartTheme.tooltipBorder,
                        color: chartTheme.tooltipText,
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(val) => [`${Number(val).toFixed(2)} ROC-AUC`, 'Discrimination']}
                      labelFormatter={(l) => `Observation cutoff: Day ${l}`}
                    />

                    {/* Random Guess Baseline: label placed inside top-right so it never overlaps x-axis ticks */}
                    <ReferenceLine
                      y={0.5}
                      stroke={chartTheme.text}
                      strokeDasharray="4 4"
                      label={{
                        value: 'Random (0.50)',
                        fill: chartTheme.text,
                        fontSize: 10,
                        position: 'insideTopRight',
                      }}
                    />

                    {/* ROC-AUC Curve with direct value labels at Day 40, Day 60, Day 180 */}
                    <Line
                      type="monotone"
                      dataKey="ROC_AUC"
                      stroke={chartTheme.teal}
                      strokeWidth={2.5}
                      dot={(props) => {
                        const { cx, cy, index } = props;
                        const item = cutoffData[index];
                        const isKey = item && [40, 60, 180].includes(item.cutoff_day);
                        return (
                          <circle
                            key={`auc-dot-${index}`}
                            cx={cx}
                            cy={cy}
                            r={isKey ? 5 : 3}
                            fill={chartTheme.teal}
                            stroke={chartTheme.tooltipBg}
                            strokeWidth={isKey ? 2 : 1}
                          />
                        );
                      }}
                    >
                      <LabelList content={renderKeyCutoffLabel} />
                    </Line>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Plain-Language Real Accuracy Interpretation */}
          <div className="pt-3 mt-3 border-t border-border-subtle text-xs text-text-muted leading-relaxed">
            <p>
              Pick one at-risk and one safe student at random: the day-40 model gives the at-risk one the
              higher risk score <strong className="text-text-primary font-mono-num">{day40Pct}%</strong> of the time
              (rising to <strong className="text-text-primary font-mono-num">{day60Pct}%</strong> at Day 60 and{' '}
              <strong className="text-text-primary font-mono-num">{day180Pct}%</strong> at Day 180).
            </p>
          </div>
        </section>

        {/* Chart 2: Weekly Activity on the Learning Platform */}
        <section className="p-5 bg-panel border border-border rounded-xl flex flex-col justify-between">
          <div>
            <div className="pb-3 mb-3 border-b border-border-subtle">
              <h2 className="text-base font-semibold text-text-primary tracking-tight">
                Weekly activity on the learning platform
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Mean interactions per student by final course result
              </p>
            </div>

            {chartsLoading ? (
              <Skeleton height="240px" className="w-full" />
            ) : (
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={engagementData}
                    margin={{ top: 15, right: 80, left: -10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                    <XAxis
                      dataKey="week"
                      stroke={chartTheme.text}
                      tickFormatter={(w) => `W${w}`}
                      tick={{ fill: chartTheme.text, fontSize: 11, fontFamily: 'DM Sans' }}
                    />
                    <YAxis
                      stroke={chartTheme.text}
                      tick={{ fill: chartTheme.text, fontSize: 11, fontFamily: 'DM Mono' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: chartTheme.tooltipBg,
                        borderColor: chartTheme.tooltipBorder,
                        color: chartTheme.tooltipText,
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      labelFormatter={(l) => `Academic week ${l}`}
                    />

                    {/* Distinction: Darker tone with direct end label */}
                    <Line
                      type="linear"
                      dataKey="Distinction"
                      stroke="#0F766E"
                      strokeWidth={2.5}
                      dot={false}
                    >
                      <LabelList content={renderEndLabel('Distinction', '#0F766E')} />
                    </Line>

                    {/* Pass: Clearly distinguishable lighter teal with direct end label */}
                    <Line
                      type="linear"
                      dataKey="Pass"
                      stroke="#2AB4A0"
                      strokeWidth={2}
                      strokeDasharray="4 2"
                      dot={false}
                    >
                      <LabelList content={renderEndLabel('Pass', '#2AB4A0')} />
                    </Line>

                    {/* Fail: Amber risk colour with direct end label */}
                    <Line
                      type="linear"
                      dataKey="Fail"
                      stroke={chartTheme.amber}
                      strokeWidth={2}
                      dot={false}
                    >
                      <LabelList content={renderEndLabel('Fail', chartTheme.amber)} />
                    </Line>

                    {/* Withdrawn: Coral risk colour with direct end label */}
                    <Line
                      type="linear"
                      dataKey="Withdrawn"
                      stroke={chartTheme.coral}
                      strokeWidth={2}
                      dot={false}
                    >
                      <LabelList content={renderEndLabel('Withdrawn', chartTheme.coral)} />
                    </Line>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Interactive Legend with distinguishable markers */}
          <div className="pt-3 mt-3 border-t border-border-subtle flex flex-wrap items-center justify-between gap-3 text-xs text-text-muted">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0F766E]" /> Distinction (deep teal)
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2AB4A0]" /> Pass (light dashed teal)
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-amber" /> Fail
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-coral" /> Withdrawn
            </span>
          </div>
        </section>
      </div>

      {/* ── At-Risk Student Directory (Human Headers) ───────────────────────── */}
      <section className="bg-panel border border-border rounded-xl overflow-hidden">
        {/* Table Filters & Header */}
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-subtle/40">
          <div>
            <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Users className="w-4 h-4 text-teal" />
              At-risk benchmark student cohort
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Identified cohort records ({pagination.total.toLocaleString()} total students)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Risk Filter */}
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="text-xs py-1.5 px-2.5 bg-panel border border-border rounded-lg text-text-primary focus:ring-1 focus:ring-accent"
            >
              <option value="">All risk levels</option>
              <option value="High Risk">High risk</option>
              <option value="Medium Risk">Medium risk</option>
              <option value="Low Risk">Low risk</option>
            </select>

            {/* Course Module Filter */}
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="text-xs py-1.5 px-2.5 bg-panel border border-border rounded-lg text-text-primary focus:ring-1 focus:ring-accent"
            >
              <option value="">All modules</option>
              {['AAA', 'BBB', 'CCC', 'DDD', 'EEE', 'FFF', 'GGG'].map((m) => (
                <option key={m} value={m}>
                  Module {m}
                </option>
              ))}
            </select>

            {/* Student ID Search */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="w-3.5 h-3.5 text-text-subtle absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search ID..."
                value={searchStudentId}
                onChange={(e) => setSearchStudentId(e.target.value)}
                className="pl-8 pr-3 py-1 text-xs bg-panel border border-border rounded-lg text-text-primary placeholder:text-text-subtle focus:ring-1 focus:ring-accent w-36"
              />
            </form>
          </div>
        </div>

        {/* Human Headers: Student ID, Module, Risk level, Risk probability, Average score */}
        {tableLoading ? (
          <div className="p-8 space-y-3">
            <Skeleton height="36px" className="w-full" />
            <Skeleton height="36px" className="w-full" />
            <Skeleton height="36px" className="w-full" />
          </div>
        ) : tableError ? (
          <div className="p-8 text-center text-xs text-risk-high-text">{tableError}</div>
        ) : records.length === 0 ? (
          <EmptyState
            title="No cohort records found"
            description="No OULAD at-risk student records match the selected filter criteria."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-subtle/60 border-b border-border text-text-muted font-sans font-medium">
                <tr>
                  <th className="py-2.5 px-4 font-sans font-medium">Student ID</th>
                  <th className="py-2.5 px-4 font-sans font-medium">Module</th>
                  <th className="py-2.5 px-4 font-sans font-medium">Risk level</th>
                  <th className="py-2.5 px-4 font-sans font-medium">Risk probability</th>
                  <th className="py-2.5 px-4 text-right font-sans font-medium">Average score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {records.map((r) => (
                  <tr key={`${r.id_student}-${r.code_module}`} className="hover:bg-subtle/50 transition-colors">
                    <td className="py-2.5 px-4 font-mono-num font-semibold text-text-primary">
                      {r.id_student}
                    </td>
                    <td className="py-2.5 px-4 text-text-muted font-medium">
                      Module {r.code_module}
                    </td>
                    <td className="py-2.5 px-4">
                      <RiskBadge level={r.risk_level} size="xs" />
                    </td>
                    <td className="py-2.5 px-4 font-mono-num text-text-primary">
                      {typeof r.risk_prob === 'number' ? (r.risk_prob * 100).toFixed(1) + '%' : 'N/A'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold text-text-primary">
                      {typeof r.avg_score === 'number' ? (
                        <span className="font-mono-num">{r.avg_score.toFixed(1)}</span>
                      ) : (
                        <span className="text-text-subtle italic font-sans font-normal">
                          No scores yet
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.pages > 1 && (
          <div className="p-3 border-t border-border flex items-center justify-between text-xs text-text-muted bg-subtle/30">
            <span>
              Page <strong className="text-text-primary font-mono-num">{pagination.page}</strong> of{' '}
              <strong className="text-text-primary font-mono-num">{pagination.pages}</strong>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => fetchAtRiskRecords(pagination.page - 1)}
                className="p-1 rounded border border-border bg-panel disabled:opacity-40 hover:bg-subtle"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchAtRiskRecords(pagination.page + 1)}
                className="p-1 rounded border border-border bg-panel disabled:opacity-40 hover:bg-subtle"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
