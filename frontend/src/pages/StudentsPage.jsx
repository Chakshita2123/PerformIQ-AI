import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Users,
  UserPlus,
  AlertCircle,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';

/**
 * Risk badge styling mapping
 */
const RISK_BADGES = {
  High: 'bg-rose-100 text-rose-700 border-rose-200',
  Medium: 'bg-amber-100 text-amber-700 border-amber-200',
  Low: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  unassessed: 'bg-slate-100 text-slate-600 border-slate-200',
};

/**
 * StudentsPage: Provides full student directory with server-side pagination,
 * instant text search, risk level filtering, and dynamic sorting.
 */
export default function StudentsPage() {
  const { isAdmin } = useAuth();

  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters & Controls
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [sortField, setSortField] = useState('latestPredictedScore:desc');

  const fetchStudents = async (targetPage = 1) => {
    setLoading(true);
    setError('');
    try {
      const [field, dir] = sortField.split(':');
      const params = {
        page: targetPage,
        limit: pagination.limit,
        sortBy: field,
        sortOrder: dir || 'desc',
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
    <div className="space-y-5">
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Student Directory</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAdmin
              ? 'Administrator View: Showing all students across the entire institution.'
              : 'Teacher View: Showing only students assigned directly to you.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <div className="text-xs font-semibold px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg">
            Total Records: {pagination.total.toLocaleString()}
          </div>
          <Link
            to="/students/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" /> Enroll Student
          </Link>
        </div>
      </div>

      {/* ── Filter & Search Toolbar ────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name or ID..."
            className="w-full pl-9 pr-20 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button
            type="submit"
            className="absolute right-1 top-1 bottom-1 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-md transition-colors"
          >
            Search
          </button>
        </form>

        {/* Filters & Sorters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Risk Level Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Risk Levels</option>
              <option value="High">High Risk (&lt; 50%)</option>
              <option value="Medium">Medium Risk (50-59%)</option>
              <option value="Low">Low Risk (&ge; 60%)</option>
              <option value="unassessed">Unassessed Only</option>
            </select>
          </div>

          {/* Sort By Field */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="latestPredictedScore:desc">Score: High to Low</option>
              <option value="latestPredictedScore:asc">Score: Low to High</option>
              <option value="name:asc">Name: A to Z</option>
              <option value="name:desc">Name: Z to A</option>
              <option value="attendance_percentage:asc">Attendance: Low to High</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Students Table ─────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs font-medium text-slate-500">Retrieving student records...</p>
          </div>
        ) : error ? (
          <div className="py-16 px-4 text-center">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-800">{error}</p>
            <button
              onClick={() => fetchStudents(pagination.page)}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700 rounded-lg"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        ) : students.length === 0 ? (
          <div className="py-20 px-4 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No students found</p>
            <p className="text-xs text-slate-400 mt-1">
              Try adjusting your search query or risk level filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Student ID</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4 text-center">Predicted Score</th>
                  <th className="py-3 px-4 text-center">Risk Level</th>
                  <th className="py-3 px-4 text-center">Attendance</th>
                  <th className="py-3 px-4 text-center">Study Hours</th>
                  {isAdmin && <th className="py-3 px-4">Assigned Teacher</th>}
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {students.map((stu) => {
                  const risk = stu.latestRiskLevel || 'unassessed';
                  const badgeClass = RISK_BADGES[risk] || RISK_BADGES.unassessed;

                  return (
                    <tr key={stu._id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Student ID */}
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-indigo-600">
                        {stu.studentId}
                      </td>

                      {/* Name */}
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {stu.name}
                      </td>

                      {/* Predicted Score */}
                      <td className="py-3 px-4 text-center font-bold">
                        {typeof stu.latestPredictedScore === 'number' ? (
                          <span className="text-slate-800">{stu.latestPredictedScore.toFixed(2)}</span>
                        ) : (
                          <span className="text-xs text-slate-400 font-normal italic">Pending</span>
                        )}
                      </td>

                      {/* Risk Level Badge */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${badgeClass}`}
                        >
                          {risk}
                        </span>
                      </td>

                      {/* Attendance */}
                      <td className="py-3 px-4 text-center text-xs text-slate-600">
                        {stu.attendance_percentage != null ? `${stu.attendance_percentage}%` : '—'}
                      </td>

                      {/* Study Hours */}
                      <td className="py-3 px-4 text-center text-xs text-slate-600">
                        {stu.study_hours_per_day != null ? `${stu.study_hours_per_day} hrs/day` : '—'}
                      </td>

                      {/* Teacher (Admin only) */}
                      {isAdmin && (
                        <td className="py-3 px-4 text-xs text-slate-500">
                          {stu.assignedTeacher?.name || 'Assigned Teacher'}
                        </td>
                      )}

                      {/* Action Link */}
                      <td className="py-3 px-4 text-right">
                        <Link
                          to={`/students/${stu._id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          <span>Profile</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Server-Side Pagination Bar ────────────────────────────────────── */}
        {!loading && pagination.pages > 1 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              Showing Page <span className="font-semibold text-slate-800">{pagination.page}</span> of{' '}
              <span className="font-semibold text-slate-800">{pagination.pages}</span> (
              {pagination.total.toLocaleString()} total students)
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchStudents(pagination.page - 1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium shadow-2xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchStudents(pagination.page + 1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium shadow-2xs"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
