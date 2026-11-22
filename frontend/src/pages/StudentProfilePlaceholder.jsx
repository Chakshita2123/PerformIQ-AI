import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { ArrowLeft, User, Award, ShieldAlert, BookOpen, Clock } from 'lucide-react';

/**
 * StudentProfilePlaceholder: Displays student details and acts as a placeholder
 * for full assessment and intervention management coming in Phase 5b.
 */
export default function StudentProfilePlaceholder() {
  const { id } = useParams();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const res = await api.get(`/students/${id}`);
        if (res.data?.success && res.data?.data?.student) {
          setStudent(res.data.data.student);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load student profile.');
      } finally {
        setLoading(false);
      }
    };
    fetchStudent();
  }, [id]);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-slate-500">Loading student record...</p>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="p-6 bg-white border border-slate-200 rounded-xl text-center max-w-md mx-auto my-10">
        <p className="text-sm font-semibold text-rose-600">{error || 'Student not found.'}</p>
        <Link
          to="/students"
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Students
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          to="/students"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Directory
        </Link>
      </div>

      {/* Student Overview Header */}
      <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-xl">
            {student.name[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">{student.name}</h1>
              <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                {student.studentId}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {student.education_level || 'High School'} • {student.school_type || 'Public'} •{' '}
              {student.gender || 'Not specified'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Predicted Score
            </span>
            <span className="text-lg font-black text-slate-900">
              {typeof student.latestPredictedScore === 'number'
                ? student.latestPredictedScore.toFixed(2)
                : 'Pending'}
            </span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Risk Level
            </span>
            <span
              className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                student.latestRiskLevel === 'High'
                  ? 'bg-rose-100 text-rose-700'
                  : student.latestRiskLevel === 'Medium'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {student.latestRiskLevel || 'Unassessed'}
            </span>
          </div>
        </div>
      </div>

      {/* Feature Attributes Summary */}
      <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100">
          Academic & Behavioral Attributes
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block">Attendance:</span>
            <span className="font-semibold text-slate-800">{student.attendance_percentage}%</span>
          </div>
          <div>
            <span className="text-slate-400 block">Assignments:</span>
            <span className="font-semibold text-slate-800">{student.assignment_completion_rate}%</span>
          </div>
          <div>
            <span className="text-slate-400 block">Study Hours:</span>
            <span className="font-semibold text-slate-800">{student.study_hours_per_day} hrs/day</span>
          </div>
          <div>
            <span className="text-slate-400 block">Sleep Hours:</span>
            <span className="font-semibold text-slate-800">{student.sleep_hours} hrs/day</span>
          </div>
          <div>
            <span className="text-slate-400 block">Exam Anxiety:</span>
            <span className="font-semibold text-slate-800">{student.exam_anxiety_level} / 10</span>
          </div>
          <div>
            <span className="text-slate-400 block">Device Availability:</span>
            <span className="font-semibold text-slate-800">{student.device_availability || 'None'}</span>
          </div>
          <div>
            <span className="text-slate-400 block">Internet Access:</span>
            <span className="font-semibold text-slate-800">{student.internet_access === 1 ? 'Yes' : 'No'}</span>
          </div>
          <div>
            <span className="text-slate-400 block">Time Management:</span>
            <span className="font-semibold text-slate-800">{student.time_management_score ?? 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Notice for Phase 5b */}
      <div className="p-5 bg-indigo-50/50 border border-indigo-200 rounded-xl flex items-start gap-3">
        <Clock className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
            Phase 5b Preview Notice
          </h3>
          <p className="text-xs text-indigo-700 mt-1">
            The full assessment timeline, intervention workflow (create, update, outcome tracking),
            and live score prediction button will be hooked up in Phase 5b.
          </p>
        </div>
      </div>
    </div>
  );
}
