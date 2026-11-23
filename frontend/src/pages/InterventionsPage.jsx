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
} from 'lucide-react';
import { INTERVENTION_STATUSES } from '../constants/studentFields';

/**
 * InterventionsPage
 * Paginated table of all interventions assigned across students.
 * Supports filtering by status (planned, ongoing, completed), direct links to student profiles,
 * and one-click access to before/after impact evaluation modal.
 * Uses neutral/teal status pills (no risk colours for intervention status) and shows
 * a small "Simulated" tag for simulated demo records.
 */
export default function InterventionsPage() {
  const [interventions, setInterventions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 10 });
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Selected intervention for impact modal
  const [selectedIntervention, setSelectedIntervention] = useState(null);

  const fetchInterventions = useCallback(
    async (page = 1, status = statusFilter) => {
      setLoading(true);
      setError(null);
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
          setError(res.data?.message || 'Failed to load interventions.');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Error fetching interventions list.');
      } finally {
        setLoading(false);
      }
    },
    [statusFilter]
  );

  useEffect(() => {
    fetchInterventions(1, statusFilter);
  }, [fetchInterventions, statusFilter]);

  const handleStatusChange = (newStatus) => {
    setStatusFilter(newStatus);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      fetchInterventions(newPage, statusFilter);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header & Filter Tabs ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary">
            Interventions directory
          </h1>
          <p className="text-xs text-text-muted mt-0.5">
            Browse, track, and evaluate corrective actions assigned to at-risk students.
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

      {/* ── Academic Integrity & Simulated Data Notice ──────────────────────── */}
      <div className="p-3 bg-subtle/80 border border-border rounded-lg flex items-start gap-2.5 text-xs text-text-muted">
        <AlertCircle className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
        <div>
          <span className="font-semibold text-text-primary mr-1.5">Impact evaluation notice:</span>
          <span>
            Outcome deltas compare assessment scores recorded strictly before and after each intervention
            start date. Simulated demo records demonstrate system mechanics and do not prove real-world
            intervention efficacy.
          </span>
        </div>
      </div>

      {/* ── Interventions Table (Sans Headers, Neutral/Teal Statuses) ───────── */}
      <section className="bg-panel border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            <Skeleton height="36px" className="w-full" />
            <Skeleton height="36px" className="w-full" />
            <Skeleton height="36px" className="w-full" />
          </div>
        ) : error ? (
          <div className="p-12 text-center text-xs text-risk-high-text">{error}</div>
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
                  <th className="py-3 px-4 font-sans font-medium">Summary</th>
                  <th className="py-3 px-4 text-right font-sans font-medium">Impact analysis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {interventions.map((iv) => {
                  const student = iv.student;
                  const isSimulated = iv.isSimulated;

                  // Requirement 8: Risk colours only for risk.
                  // Status pills: planned = outline neutral, ongoing = light teal, completed = solid teal.
                  let statusBadgeClass =
                    iv.status === 'completed'
                      ? 'bg-teal text-navy font-semibold border-transparent'
                      : iv.status === 'ongoing'
                      ? 'bg-accent-bg text-accent-text border border-teal/40'
                      : 'bg-transparent text-text-muted border border-border';

                  // Requirement 11: Replace identical truncated description with clean summary.
                  // Only show specific reason if the backend already stores it; otherwise show the type only and say nothing invented.
                  const isGenericSeedDesc =
                    iv.description &&
                    iv.description.includes('Targeted') &&
                    iv.description.includes('to address academic risk factors');

                  const summaryText =
                    iv.description && !isGenericSeedDesc ? iv.description : iv.type;

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
                          {/* Requirement 11: small Simulated tag */}
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
                        {summaryText}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedIntervention(iv)}
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

        {/* Pagination Controls */}
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

      {/* Impact Evaluation Modal */}
      {selectedIntervention && (
        <ImpactModal
          intervention={selectedIntervention}
          onClose={() => setSelectedIntervention(null)}
        />
      )}
    </div>
  );
}
