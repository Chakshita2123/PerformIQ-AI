import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import ImpactModal from '../components/ImpactModal';
import {
  ClipboardList,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  ExternalLink,
  Filter,
} from 'lucide-react';
import { INTERVENTION_STATUSES } from '../constants/studentFields';

/**
 * InterventionsPage: Paginated table of all interventions assigned across students.
 * Supports filtering by status (planned, ongoing, completed), direct links to student profiles,
 * and one-click access to the before/after impact evaluation modal.
 */
export default function InterventionsPage() {
  const [interventions, setInterventions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 10 });
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Selected intervention for impact modal
  const [selectedIntervention, setSelectedIntervention] = useState(null);

  const fetchInterventions = useCallback(async (page = 1, status = statusFilter) => {
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
  }, [statusFilter]);

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
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <ClipboardList className="w-7 h-7 text-indigo-600" />
            Interventions Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Browse, track, and evaluate corrective teacher actions assigned to at-risk students.
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-xl shadow-sm text-xs font-semibold">
          <button
            onClick={() => handleStatusChange('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white font-bold shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            All ({statusFilter === 'all' ? pagination.total : '•'})
          </button>
          {INTERVENTION_STATUSES.map((st) => (
            <button
              key={st}
              onClick={() => handleStatusChange(st)}
              className={`px-3 py-1.5 rounded-lg capitalize transition-colors ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* ── Academic Integrity & Simulated Data Notice ──────────────────────── */}
      <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-xs text-amber-900 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-bold">Evaluation & Academic Notice</p>
          <p className="mt-0.5 text-amber-800">
            Outcome metrics compare assessment scores recorded strictly before and after each intervention start date. Simulated records carry a visible <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold">Simulated</span> badge; simulated outcomes demonstrate system mechanics and do not prove real-world intervention efficacy.
          </p>
        </div>
      </div>

      {/* ── Interventions Table Card ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs font-semibold text-slate-500">Loading interventions...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-800">Unable to load interventions</p>
            <p className="text-xs text-slate-500 mt-1">{error}</p>
          </div>
        ) : interventions.length === 0 ? (
          <div className="p-16 text-center">
            <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-800">No interventions found</p>
            <p className="text-xs text-slate-500 mt-1">
              {statusFilter !== 'all'
                ? `No interventions currently matching status "${statusFilter}".`
                : 'No interventions have been assigned yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Start Date</th>
                  <th className="py-3.5 px-4">Assigned By</th>
                  <th className="py-3.5 px-4 text-center">Data Flag</th>
                  <th className="py-3.5 px-4 text-right">Impact Analysis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {interventions.map((iv) => (
                  <tr key={iv._id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Student Info */}
                    <td className="py-3.5 px-4">
                      {iv.student ? (
                        <Link
                          to={`/students/${iv.student._id}`}
                          className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 group"
                        >
                          <span>{iv.student.name}</span>
                          <span className="text-[10px] font-mono font-normal text-slate-400 group-hover:text-indigo-500">
                            ({iv.student.studentId})
                          </span>
                        </Link>
                      ) : (
                        <span className="text-slate-400 italic">Unlinked Student</span>
                      )}
                    </td>

                    {/* Type */}
                    <td className="py-3.5 px-4 font-semibold text-slate-800">{iv.type}</td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide capitalize ${
                          iv.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : iv.status === 'ongoing'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {iv.status}
                      </span>
                    </td>

                    {/* Start Date */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                      {new Date(iv.startDate).toLocaleDateString()}
                    </td>

                    {/* Assigned By */}
                    <td className="py-3.5 px-4 text-slate-700">
                      {iv.assignedBy?.name || 'Teacher'}
                    </td>

                    {/* Simulated Flag */}
                    <td className="py-3.5 px-4 text-center">
                      {iv.isSimulated ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200">
                          <Sparkles className="w-3 h-3" /> Simulated
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Real</span>
                      )}
                    </td>

                    {/* Impact Analysis Action */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedIntervention(iv)}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/80 rounded-lg text-xs font-bold transition-colors"
                      >
                        <TrendingUp className="w-3.5 h-3.5" /> View Impact
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination Controls ────────────────────────────────────────────── */}
        {!loading && pagination.pages > 1 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing page <strong className="text-slate-800">{pagination.page}</strong> of{' '}
              <strong className="text-slate-800">{pagination.pages}</strong> ({pagination.total}{' '}
              total interventions)
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg bg-white font-medium hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 rounded-lg bg-white font-medium hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Impact Modal ────────────────────────────────────────────────────── */}
      {selectedIntervention && (
        <ImpactModal
          intervention={selectedIntervention}
          onClose={() => setSelectedIntervention(null)}
        />
      )}
    </div>
  );
}
