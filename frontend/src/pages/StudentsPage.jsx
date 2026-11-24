import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import RiskBadge from '../components/RiskBadge';
import Skeleton from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  RefreshCw,
} from 'lucide-react';

/**
 * StudentsPage
 * Paginated student directory with server-side search, risk filtering, and sorting.
 * Default sort is set to lowest predicted score first so students needing help appear first.
 */
export default function StudentsPage() {
  const { isAdmin } = useAuth();

  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters — default sort is lowest predicted score first
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [sortField, setSortField] = useState('latestPredictedScore:asc');

  const fetchStudents = async (targetPage = 1) => {
    setLoading(true);
    setError('');
    try {
      const [field, dir] = sortField.split(':');
      const sortDirection = dir || 'asc';
      const params = {
        page: targetPage,
        limit: pagination.limit,
        sortBy: field,
        sortOrder: sortDirection,
        order: sortDirection,
      };

      if (search.trim()) {
        params.search = search.trim();
      }
      if (riskFilter) {
        params.riskLevel = riskFilter;
      }

      const res = await api.get('/students', { params });
      if (res.data?.success && res.data?.data) {
        setStudents(res.data.data.students);
        setPagination(res.data.data.pagination);
      } else {
        setError('Failed to fetch student records.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error communicating with server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents(1);
  }, [riskFilter, sortField]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchStudents(1);
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary">Student directory</h1>
          <p className="text-xs text-text-muted mt-0.5">
            {isAdmin
              ? 'Administrator scope: Displaying all students across the institution.'
              : 'Teacher scope: Displaying students assigned directly to you.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link
              to="/students/new"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-navy bg-teal hover:bg-accent-hover rounded-lg transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Enroll student</span>
            </Link>
          )}
        </div>
      </div>

      {/* ── Search & Filter Controls ───────────────────────────────────────── */}
      <div className="p-4 bg-panel border border-border rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-text-subtle absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by student name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-panel border border-border rounded-lg text-text-primary placeholder:text-text-subtle focus:ring-1 focus:ring-accent"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Risk Level Filter */}
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <Filter className="w-3.5 h-3.5 text-text-subtle" />
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="text-xs py-1.5 px-2.5 bg-panel border border-border rounded-lg text-text-primary focus:ring-1 focus:ring-accent"
            >
              <option value="">All risk levels</option>
              <option value="High">High risk</option>
              <option value="Medium">Medium risk</option>
              <option value="Low">Low risk</option>
            </select>
          </div>

          {/* Sort Controls: Default Lowest predicted score first */}
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value)}
            className="text-xs py-1.5 px-2.5 bg-panel border border-border rounded-lg text-text-primary focus:ring-1 focus:ring-accent"
          >
            <option value="latestPredictedScore:asc">Score: Low to High (Needs help first)</option>
            <option value="latestPredictedScore:desc">Score: High to Low</option>
            <option value="name:asc">Name: A to Z</option>
            <option value="name:desc">Name: Z to A</option>
            <option value="attendance_percentage:asc">Attendance: Low to High</option>
          </select>
        </div>
      </div>

      {/* ── Students Table (Sans Headers, Mono for Numbers) ────────────────── */}
      <section className="bg-panel border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            <Skeleton height="36px" className="w-full" />
            <Skeleton height="36px" className="w-full" />
            <Skeleton height="36px" className="w-full" />
            <Skeleton height="36px" className="w-full" />
          </div>
        ) : error ? (
          <div className="p-12 text-center text-xs text-risk-high-text">{error}</div>
        ) : students.length === 0 ? (
          <EmptyState
            title="No students found"
            description="No student records match the active search or filter parameters."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-subtle/60 border-b border-border text-text-muted font-sans font-medium">
                <tr>
                  <th className="py-3 px-4 font-sans font-medium">Student</th>
                  <th className="py-3 px-4 font-sans font-medium">Student ID</th>
                  <th className="py-3 px-4 font-sans font-medium">Risk level</th>
                  <th className="py-3 px-4 font-sans font-medium">Predicted score</th>
                  <th className="py-3 px-4 font-sans font-medium">Attendance</th>
                  <th className="py-3 px-4 font-sans font-medium">Study hours</th>
                  <th className="py-3 px-4 text-right font-sans font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {students.map((s) => (
                  <tr key={s._id} className="hover:bg-subtle/40 transition-colors">
                    <td className="py-3 px-4">
                      <Link
                        to={`/students/${s._id}`}
                        className="font-semibold text-text-primary hover:text-accent transition-colors"
                      >
                        {s.name}
                      </Link>
                    </td>
                    <td className="py-3 px-4 font-mono-num text-text-muted">
                      {s.studentId}
                    </td>
                    <td className="py-3 px-4">
                      <RiskBadge level={s.latestRiskLevel} size="xs" />
                    </td>
                    <td className="py-3 px-4 font-mono-num font-semibold text-text-primary">
                      {typeof s.latestPredictedScore === 'number'
                        ? `${s.latestPredictedScore.toFixed(2)} / 100`
                        : 'N/A'}
                    </td>
                    <td className="py-3 px-4 font-mono-num text-text-muted">
                      {s.attendance_percentage != null ? `${s.attendance_percentage}%` : 'Not recorded'}
                    </td>
                    <td className="py-3 px-4 font-mono-num text-text-muted">
                      {s.study_hours_per_day != null ? `${s.study_hours_per_day}h/d` : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/students/${s._id}`}
                        className="text-xs font-medium text-accent-text hover:underline"
                      >
                        View profile →
                      </Link>
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
              Showing page <strong className="text-text-primary font-mono-num">{pagination.page}</strong> of{' '}
              <strong className="text-text-primary font-mono-num">{pagination.pages}</strong> ({pagination.total.toLocaleString()} total students)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => fetchStudents(pagination.page - 1)}
                className="p-1 rounded border border-border bg-panel disabled:opacity-40 hover:bg-subtle"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchStudents(pagination.page + 1)}
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
