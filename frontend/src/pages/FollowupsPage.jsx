import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import ImpactModal from '../components/ImpactModal';
import Skeleton from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { formatDate } from '../utils/format';
import {
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  X,
} from 'lucide-react';
import { INTERVENTION_STATUSES } from '../constants/studentFields';

/**
 * FollowupsPage (Formerly Interventions)
 * Central hub for Act and Review phases of the support loop:
 * 1. "Ready to review" showcase: ongoing interventions with post-assessments ready for verdict evaluation.
 * 2. Complete interventions directory with status filtering, server pagination, and direct student links.
 * 3. Loop closure: "Review impact & conclude" sets status to 'completed' and records outcome note.
 */
export default function FollowupsPage() {
  // Followups overview state (Ready to review & loop metrics)
  const [followupsData, setFollowupsData] = useState(null);
  const [followupsLoading, setFollowupsLoading] = useState(true);

  // Directory table states
  const [interventions, setInterventions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 10 });
  const [statusFilter, setStatusFilter] = useState('all');
  const [directoryLoading, setDirectoryLoading] = useState(true);
  const [directoryError, setDirectoryError] = useState(null);

  // Modals state
  const [selectedInterventionForImpact, setSelectedInterventionForImpact] = useState(null);
  const [concludingIntervention, setConcludingIntervention] = useState(null);
  const [conclusionOutcome, setConclusionOutcome] = useState('');
  const [isConcluding, setIsConcluding] = useState(false);
  const [concludeSuccess, setConcludeSuccess] = useState(false);

  // Fetch ready-to-review followups from GET /api/dashboard/followups
  const fetchFollowupsSummary = useCallback(async () => {
    setFollowupsLoading(true);
    try {
      const res = await api.get('/dashboard/followups');
      if (res.data?.success) {
        setFollowupsData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch followups summary:', err);
    } finally {
      setFollowupsLoading(false);
    }
  }, []);

  // Fetch paginated directory from GET /api/interventions
  const fetchInterventions = useCallback(
    async (page = 1, status = statusFilter) => {
      setDirectoryLoading(true);
      setDirectoryError(null);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '10',
        });
        if (status !== 'all') {
          params.append('status', status);
        }

        const res = await api.get(`/interventions?${params.toString()}`);
        if (res.data?.success) {
          setInterventions(res.data.data.interventions || []);
          setPagination(res.data.data.pagination || { page: 1, pages: 1, total: 0, limit: 10 });
        } else {
          setDirectoryError(res.data?.message || 'Failed to load interventions.');
        }
      } catch (err) {
        setDirectoryError(err.response?.data?.message || 'Error fetching interventions list.');
      } finally {
        setDirectoryLoading(false);
      }
    },
    [statusFilter]
  );

  useEffect(() => {
    fetchFollowupsSummary();
    fetchInterventions(1, statusFilter);
  }, [fetchFollowupsSummary, fetchInterventions, statusFilter]);

  const handleStatusChange = (newStatus) => {
    setStatusFilter(newStatus);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      fetchInterventions(newPage, statusFilter);
    }
  };

  // Open Conclusion dialog
  const handleOpenConclude = (item) => {
    setConcludingIntervention(item);
    setConcludeSuccess(false);

    let defaultNote = '';
    if (item.verdict === 'improved' && typeof item.delta === 'number') {
      defaultNote = `Student improved by ${item.delta > 0 ? '+' : ''}${item.delta.toFixed(1)} points after completing ${item.type}.`;
    } else if (item.verdict === 'declined' && typeof item.delta === 'number') {
      defaultNote = `Score declined by ${item.delta.toFixed(1)} points. Recommended to adjust support strategy.`;
    } else if (item.verdict === 'no clear change') {
      defaultNote = `No significant score change observed after ${item.type}. Strategy under review.`;
    } else {
      defaultNote = `Concluded ${item.type} follow-up program.`;
    }
    setConclusionOutcome(defaultNote);
  };

  // Submit Conclusion (Close the loop)
  const handleSubmitConclude = async (e) => {
    e.preventDefault();
    if (!concludingIntervention) return;

    setIsConcluding(true);
    try {
      const payload = {
        status: 'completed',
        outcome: conclusionOutcome.trim() || 'Concluded and recorded progress.',
      };

      const res = await api.patch(`/interventions/${concludingIntervention._id}`, payload);
      if (res.data?.success) {
        setConcludeSuccess(true);
        setTimeout(() => {
          setConcludingIntervention(null);
          setConcludeSuccess(false);
          // Refresh both datasets — item leaves ready-to-review list
          fetchFollowupsSummary();
          fetchInterventions(1, statusFilter);
        }, 900);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to conclude intervention.');
    } finally {
      setIsConcluding(false);
    }
  };

  const readyToReview = followupsData?.readyToReview || [];
  const counts = followupsData?.counts || {};

  return (
    <div className="space-y-6">
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary">
            Follow-ups directory
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Act and review: track student support programs and evaluate academic outcomes.
          </p>
        </div>

        {/* Quick loop counter pills */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-subtle border border-border text-text-muted">
            Active: <strong className="text-text-primary font-mono-num">{counts.act || 0}</strong>
          </span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-accent-bg border border-teal/40 text-accent-text">
            Ready to review: <strong className="font-mono-num">{counts.review || 0}</strong>
          </span>
        </div>
      </div>

      {/* ── 1. Ready to Review Showcase (Top Priority Loop Stage) ──────────── */}
      <section aria-labelledby="ready-to-review-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="ready-to-review-heading" className="text-base font-semibold text-text-primary tracking-tight flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal" />
              <span>Ready to review</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-teal text-navy font-bold font-mono-num">
                {readyToReview.length}
              </span>
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Ongoing interventions that have new assessment scores recorded since their start date.
            </p>
          </div>
          {(counts.review > readyToReview.length || counts.review > 10) && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter('ongoing');
                document.getElementById('directory-heading')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-xs font-semibold text-teal hover:underline flex items-center gap-1"
            >
              <span>View all {counts.review} items</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {followupsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Skeleton height="110px" className="w-full" />
            <Skeleton height="110px" className="w-full" />
          </div>
        ) : readyToReview.length === 0 ? (
          <div className="p-5 bg-panel border border-border rounded-xl text-center space-y-1">
            <p className="text-xs font-semibold text-text-primary">No follow-ups pending review right now</p>
            <p className="text-xs text-text-muted max-w-md mx-auto">
              When new test scores are entered for students with ongoing support programs, they will automatically appear here for verdict review.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {readyToReview.map((item) => {
              const student = item.student;
              const hasDelta = typeof item.delta === 'number';

              let verdictClass =
                item.verdict === 'improved'
                  ? 'bg-risk-low-bg text-risk-low-text border-risk-low-border'
                  : item.verdict === 'declined'
                  ? 'bg-risk-high-bg text-risk-high-text border-risk-high-border'
                  : item.verdict === 'no clear change'
                  ? 'bg-risk-med-bg text-risk-med-text border-risk-med-border'
                  : 'bg-subtle text-text-muted border-border';

              return (
                <div
                  key={item._id}
                  className="p-4 bg-panel border border-border rounded-xl flex flex-col justify-between gap-3 hover:border-teal/50 transition-colors shadow-2xs"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Link
                          to={`/students/${student._id}`}
                          className="text-sm font-semibold text-text-primary hover:text-accent transition-colors truncate"
                        >
                          {student.name}
                        </Link>
                        <span className="text-xs font-mono-num text-text-subtle">
                          {student.studentId}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border capitalize ${verdictClass}`}>
                          {item.verdict}
                        </span>
                        {item.assessmentsAfter === 1 && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-subtle border border-border text-text-muted">
                            Preliminary
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-text-muted flex-wrap">
                      <span className="font-medium text-text-primary">{item.type}</span>
                      <span>•</span>
                      <span>Started: {formatDate(item.startDate)}</span>
                      {item.isSimulated && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-subtle border border-border text-text-subtle">
                          Simulated
                        </span>
                      )}
                    </div>

                    {/* Pre vs Post Score Delta */}
                    {item.verdict === 'insufficient data' ? (
                      <div className="p-2.5 bg-subtle/60 rounded-lg border border-border-subtle text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-text-subtle font-medium">Pre-intervention baseline</span>
                          <span className="font-mono-num text-text-muted">No baseline score</span>
                        </div>
                        <p className="text-[11px] text-text-muted italic">
                          Baseline score missing before intervention start date. Record a pre-test or additional assessments to compute score delta.
                        </p>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-subtle/60 rounded-lg border border-border-subtle flex items-center justify-between text-xs">
                        <div>
                          <span className="text-[11px] text-text-subtle block">Before</span>
                          <span className="font-mono-num font-semibold text-text-primary">
                            {typeof item.beforeAvg === 'number' ? `${item.beforeAvg.toFixed(1)} / 100` : '—'}
                          </span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-text-subtle" />
                        <div>
                          <span className="text-[11px] text-text-subtle block">After</span>
                          <span className="font-mono-num font-semibold text-text-primary">
                            {typeof item.afterAvg === 'number' ? `${item.afterAvg.toFixed(1)} / 100` : '—'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] text-text-subtle block">Score delta</span>
                          <span
                            className={`font-mono-num font-bold ${
                              hasDelta && item.delta > 0
                                ? 'text-risk-low-text'
                                : hasDelta && item.delta < 0
                                ? 'text-risk-high-text'
                                : 'text-text-primary'
                            }`}
                          >
                            {hasDelta ? `${item.delta > 0 ? '+' : ''}${item.delta.toFixed(1)}` : '—'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action to close the loop */}
                  <div className="pt-2 border-t border-border-subtle flex items-center justify-between gap-2">
                    <span className="text-[11px] text-text-muted">
                      {item.assessmentsAfter} new {item.assessmentsAfter === 1 ? 'assessment' : 'assessments'} recorded
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenConclude(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-navy bg-teal hover:bg-accent-hover rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Review impact & conclude</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {(counts.review > readyToReview.length || counts.review > 10) && (
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => {
                setStatusFilter('ongoing');
                document.getElementById('directory-heading')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-xs font-semibold text-teal hover:underline inline-flex items-center gap-1"
            >
              <span>Showing 10 most recent. View all {counts.review} ready-to-review items in directory</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </section>

      {/* ── 2. All Assigned Interventions Directory ────────────────────────── */}
      <section aria-labelledby="directory-heading" className="bg-panel border border-border rounded-xl overflow-hidden space-y-0">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-subtle/40">
          <div>
            <h2 id="directory-heading" className="text-sm font-bold text-text-primary">
              All assigned interventions
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Browse, filter by status, and inspect historical intervention records.
            </p>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 p-1 bg-panel border border-border rounded-lg text-xs">
            <button
              type="button"
              onClick={() => handleStatusChange('all')}
              className={`px-3 py-1 rounded-md transition-colors ${
                statusFilter === 'all'
                  ? 'bg-subtle text-text-primary font-semibold border border-border'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              All ({statusFilter === 'all' ? pagination.total : '•'})
            </button>
            {INTERVENTION_STATUSES.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => handleStatusChange(st)}
                className={`px-3 py-1 rounded-md capitalize transition-colors ${
                  statusFilter === st
                    ? 'bg-subtle text-text-primary font-semibold border border-border'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Directory Table */}
        {directoryLoading ? (
          <div className="p-8 space-y-3">
            <Skeleton height="36px" className="w-full" />
            <Skeleton height="36px" className="w-full" />
            <Skeleton height="36px" className="w-full" />
          </div>
        ) : directoryError ? (
          <div className="p-12 text-center text-xs text-risk-high-text">{directoryError}</div>
        ) : interventions.length === 0 ? (
          <EmptyState
            title="No interventions found"
            description="No interventions match the selected status filter."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-subtle/60 border-b border-border text-text-muted font-sans font-medium">
                <tr>
                  <th className="py-3 px-4 font-sans font-medium">Student</th>
                  <th className="py-3 px-4 font-sans font-medium">Student ID</th>
                  <th className="py-3 px-4 font-sans font-medium">Program type</th>
                  <th className="py-3 px-4 font-sans font-medium">Status</th>
                  <th className="py-3 px-4 font-sans font-medium">Start date</th>
                  <th className="py-3 px-4 font-sans font-medium">Outcome note</th>
                  <th className="py-3 px-4 text-right font-sans font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {interventions.map((iv) => {
                  const student = iv.student;
                  const isSimulated = iv.isSimulated;

                  let statusBadgeClass =
                    iv.status === 'completed'
                      ? 'bg-teal text-navy font-semibold border-transparent'
                      : iv.status === 'ongoing'
                      ? 'bg-accent-bg text-accent-text border border-teal/40'
                      : 'bg-transparent text-text-muted border border-border';

                  return (
                    <tr key={iv._id} className="hover:bg-subtle/40 transition-colors">
                      <td className="py-3 px-4">
                        {student ? (
                          <Link
                            to={`/students/${student._id}`}
                            className="font-semibold text-text-primary hover:text-accent transition-colors"
                          >
                            {student.name}
                          </Link>
                        ) : (
                          <span className="text-text-subtle italic">Unknown</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono-num text-text-muted">
                        {student?.studentId || '—'}
                      </td>
                      <td className="py-3 px-4 font-medium text-text-primary">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{iv.type}</span>
                          {isSimulated && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-subtle border border-border text-text-subtle">
                              Simulated
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${statusBadgeClass}`}
                        >
                          {iv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono-num text-text-muted">
                        {formatDate(iv.startDate)}
                      </td>
                      <td className="py-3 px-4 text-text-muted max-w-xs truncate">
                        {iv.outcome || iv.description || '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedInterventionForImpact(iv)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-accent-text hover:underline"
                        >
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>Evaluate ↗</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Directory Pagination */}
        {pagination.pages > 1 && (
          <div className="p-3 border-t border-border flex items-center justify-between text-xs text-text-muted bg-subtle/30">
            <span>
              Page <strong className="text-text-primary font-mono-num">{pagination.page}</strong> of{' '}
              <strong className="text-text-primary font-mono-num">{pagination.pages}</strong> ({pagination.total} records)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => handlePageChange(pagination.page - 1)}
                className="p-1 rounded border border-border bg-panel disabled:opacity-40 hover:bg-subtle"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.pages}
                onClick={() => handlePageChange(pagination.page + 1)}
                className="p-1 rounded border border-border bg-panel disabled:opacity-40 hover:bg-subtle"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── Modal 1: Standard Impact Evaluation ────────────────────────────── */}
      {selectedInterventionForImpact && (
        <ImpactModal
          intervention={selectedInterventionForImpact}
          onClose={() => setSelectedInterventionForImpact(null)}
        />
      )}

      {/* ── Modal 2: Review Impact & Conclude (Loop Closure) ───────────────── */}
      {concludingIntervention && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-navy/60 flex items-center justify-center p-4 backdrop-blur-xs"
        >
          <div className="bg-panel border border-border rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-teal" />
                <div>
                  <h3 className="text-sm font-bold text-text-primary">
                    Review impact & conclude follow-up
                  </h3>
                  <p className="text-xs text-text-muted">
                    Student: {concludingIntervention.student?.name} ({concludingIntervention.type})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConcludingIntervention(null)}
                className="p-1 rounded-md text-text-muted hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {concludeSuccess ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-risk-low-text mx-auto" />
                <h4 className="text-sm font-bold text-text-primary">Follow-up concluded successfully</h4>
                <p className="text-xs text-text-muted">
                  The intervention has been marked completed and archived into the directory.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitConclude} className="space-y-4 text-xs">
                {/* Score Summary Snapshot */}
                <div className="p-3 bg-subtle/70 rounded-lg border border-border flex items-center justify-around text-center">
                  <div>
                    <span className="text-[11px] text-text-subtle block">Before</span>
                    <span className="text-sm font-bold font-mono-num text-text-primary">
                      {typeof concludingIntervention.beforeAvg === 'number'
                        ? `${concludingIntervention.beforeAvg.toFixed(1)} / 100`
                        : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-text-subtle block">After</span>
                    <span className="text-sm font-bold font-mono-num text-text-primary">
                      {typeof concludingIntervention.afterAvg === 'number'
                        ? `${concludingIntervention.afterAvg.toFixed(1)} / 100`
                        : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-text-subtle block">Verdict</span>
                    <span className="text-sm font-bold capitalize text-accent-text">
                      {concludingIntervention.verdict}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-text-primary mb-1">
                    Outcome summary note (saved to record)
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={conclusionOutcome}
                    onChange={(e) => setConclusionOutcome(e.target.value)}
                    placeholder="Enter observation notes on student progress..."
                    className="w-full p-2.5 bg-panel border border-border rounded-lg text-text-primary focus:ring-1 focus:ring-accent"
                  />
                  <p className="text-[11px] text-text-subtle mt-1">
                    Concluded follow-ups are marked completed and removed from the active review queue.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setConcludingIntervention(null)}
                    className="px-3.5 py-1.5 border border-border bg-panel text-text-muted hover:text-text-primary rounded-lg font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isConcluding}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-teal hover:bg-accent-hover text-navy font-semibold rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isConcluding ? 'Concluding...' : 'Confirm & complete follow-up'}
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
