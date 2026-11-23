import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import {
  UserPlus,
  ArrowLeft,
  GraduationCap,
  BookOpen,
  Heart,
  Laptop,
  Activity,
  CheckCircle2,
  AlertCircle,
  Play,
  Sparkles,
} from 'lucide-react';
import {
  GENDER_OPTIONS,
  EDUCATION_LEVEL_OPTIONS,
  SCHOOL_TYPE_OPTIONS,
  FAMILY_INCOME_OPTIONS,
  PARENT_EDUCATION_OPTIONS,
  URBAN_RURAL_OPTIONS,
  CLASS_PARTICIPATION_OPTIONS,
  STUDY_CONSISTENCY_OPTIONS,
  STUDY_ENVIRONMENT_OPTIONS,
  STUDY_METHOD_OPTIONS,
  REVISION_FREQUENCY_OPTIONS,
  NOTES_QUALITY_OPTIONS,
  SLEEP_QUALITY_OPTIONS,
  BREAK_FREQUENCY_OPTIONS,
  MOTIVATION_LEVEL_OPTIONS,
  DEVICE_AVAILABILITY_OPTIONS,
  EDUCATIONAL_APP_USAGE_OPTIONS,
  EXAM_DIFFICULTY_OPTIONS,
} from '../constants/studentFields';

/**
 * AddStudentPage: Sectioned student enrollment form configured directly
 * from canonical dataset attributes. Enforces client-side validation on
 * required identity fields while permitting optional attributes to remain empty
 * (which the ML preprocessing pipeline gracefully imputes).
 */
export default function AddStudentPage() {
  const navigate = useNavigate();

  // Form State
  const [formData, setFormData] = useState({
    // 1. Identity & Demographics
    name: '',
    studentId: '',
    age: '',
    gender: '',
    education_level: 'High School',
    school_type: '',
    family_income: '',
    parent_education: '',
    urban_rural: '',

    // 2. Academics & Engagement
    previous_exam_score: '',
    previous_gpa: '',
    attendance_percentage: '',
    assignment_completion_rate: '',
    class_participation: '',

    // 3. Study Habits
    study_hours_per_day: '',
    self_study_hours: '',
    private_tuition: '',
    study_consistency: '',
    study_method: '',
    revision_frequency: '',
    study_environment: '',
    practice_tests_completed: '',
    notes_quality: '',

    // 4. Wellbeing & Lifestyle
    sleep_hours: '',
    sleep_quality: '',
    daily_screen_time: '',
    physical_activity_hours: '',
    break_frequency: '',
    stress_level: '',
    motivation_level: '',

    // 5. Tech & Environment
    device_availability: '',
    internet_access: '',
    educational_app_usage: '',

    // 6. Exam Context
    exam_difficulty: '',
    exam_preparation_days: '',
    exam_anxiety_level: '',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);

  // Success state with prediction option
  const [createdStudent, setCreatedStudent] = useState(null);
  const [predicting, setPredicting] = useState(false);

  // Field change helper
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear validation error on edit
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  // Client-side validation
  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Student full name is required.';
    if (!formData.studentId.trim()) errs.studentId = 'Student ID is required.';

    if (formData.age !== '' && (Number(formData.age) < 10 || Number(formData.age) > 25)) {
      errs.age = 'Age must be between 10 and 25.';
    }
    if (formData.previous_exam_score !== '' && (Number(formData.previous_exam_score) < 0 || Number(formData.previous_exam_score) > 100)) {
      errs.previous_exam_score = 'Score must be between 0 and 100.';
    }
    if (formData.attendance_percentage !== '' && (Number(formData.attendance_percentage) < 0 || Number(formData.attendance_percentage) > 100)) {
      errs.attendance_percentage = 'Attendance must be between 0% and 100%.';
    }
    if (formData.previous_gpa !== '' && (Number(formData.previous_gpa) < 0 || Number(formData.previous_gpa) > 4.0)) {
      errs.previous_gpa = 'GPA must be between 0 and 4.0.';
    }
    if (formData.stress_level !== '' && (Number(formData.stress_level) < 0 || Number(formData.stress_level) > 10)) {
      errs.stress_level = 'Stress level must be between 0 and 10.';
    }
    if (formData.exam_anxiety_level !== '' && (Number(formData.exam_anxiety_level) < 0 || Number(formData.exam_anxiety_level) > 10)) {
      errs.exam_anxiety_level = 'Anxiety level must be between 0 and 10.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit student creation
  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) return;

    setLoading(true);

    try {
      // Build payload, converting empty strings to null so mongoose/fastapi can impute
      const payload = {};
      Object.keys(formData).forEach((key) => {
        const val = formData[key];
        if (val === '') {
          // Send null for optional fields to allow imputation
          payload[key] = null;
        } else if (
          [
            'age',
            'previous_exam_score',
            'previous_gpa',
            'attendance_percentage',
            'assignment_completion_rate',
            'study_hours_per_day',
            'self_study_hours',
            'private_tuition',
            'practice_tests_completed',
            'sleep_hours',
            'daily_screen_time',
            'physical_activity_hours',
            'stress_level',
            'internet_access',
            'exam_preparation_days',
            'exam_anxiety_level',
          ].includes(key)
        ) {
          payload[key] = Number(val);
        } else {
          payload[key] = val;
        }
      });

      const res = await api.post('/students', payload);
      if (res.data?.success && res.data?.data?.student) {
        setCreatedStudent(res.data.data.student);
      } else {
        setServerError(res.data?.message || 'Failed to register student.');
      }
    } catch (err) {
      setServerError(err.response?.data?.message || 'Error communicating with backend.');
    } finally {
      setLoading(false);
    }
  };

  // Run prediction on the newly registered student
  const handleRunImmediatePrediction = async () => {
    if (!createdStudent?._id) return;
    setPredicting(true);
    try {
      await api.post(`/students/${createdStudent._id}/predict`);
      navigate(`/students/${createdStudent._id}`);
    } catch {
      // Navigate anyway so the user sees profile with notice
      navigate(`/students/${createdStudent._id}`);
    } finally {
      setPredicting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* ── Breadcrumb & Title ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link to="/students" className="hover:text-indigo-600 flex items-center gap-1 font-medium">
          <ArrowLeft className="w-4 h-4" /> Students Directory
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold">Enroll New Student</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <UserPlus className="w-7 h-7 text-indigo-600" /> Enroll New Student Record
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Complete the student profile below. Optional academic or environmental attributes may be left blank for imputation by the ML pipeline.
          </p>
        </div>
      </div>

      {serverError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-rose-800">Enrollment Error</p>
            <p className="text-xs text-rose-600 mt-0.5">{serverError}</p>
          </div>
        </div>
      )}

      {/* ── Form Card ───────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Basic Identity */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-2">
            <GraduationCap className="w-4 h-4" /> 1. Identity & Demographics
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                name="name"
                required
                placeholder="e.g. Jordan Mitchell"
                value={formData.name}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-indigo-500 ${
                  errors.name ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200'
                }`}
              />
              {errors.name && <p className="text-[11px] text-rose-600 mt-1">{errors.name}</p>}
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Student ID *</label>
              <input
                type="text"
                name="studentId"
                required
                placeholder="e.g. STU-2026-901"
                value={formData.studentId}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-indigo-500 font-mono ${
                  errors.studentId ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200'
                }`}
              />
              {errors.studentId && <p className="text-[11px] text-rose-600 mt-1">{errors.studentId}</p>}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Age (10 - 25)</label>
              <input
                type="number"
                name="age"
                min="10"
                max="25"
                placeholder="e.g. 17"
                value={formData.age}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
              />
              {errors.age && <p className="text-[11px] text-rose-600 mt-1">{errors.age}</p>}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Gender</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Leave empty (optional)</option>
                {GENDER_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Education Level</label>
              <select
                name="education_level"
                value={formData.education_level}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
              >
                {EDUCATION_LEVEL_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">School Type</label>
              <select
                name="school_type"
                value={formData.school_type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Leave empty (optional)</option>
                {SCHOOL_TYPE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Academics */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-2">
            <Activity className="w-4 h-4" /> 2. Academic Metrics & Engagement
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Previous Exam Score (0 - 100)
              </label>
              <input
                type="number"
                name="previous_exam_score"
                min="0"
                max="100"
                step="0.1"
                placeholder="e.g. 68.5"
                value={formData.previous_exam_score}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
              />
              {errors.previous_exam_score && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.previous_exam_score}</p>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Previous GPA (0.0 - 4.0)</label>
              <input
                type="number"
                name="previous_gpa"
                min="0"
                max="4.0"
                step="0.01"
                placeholder="e.g. 3.25"
                value={formData.previous_gpa}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
              />
              {errors.previous_gpa && <p className="text-[11px] text-rose-600 mt-1">{errors.previous_gpa}</p>}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Attendance Percentage (%)
              </label>
              <input
                type="number"
                name="attendance_percentage"
                min="0"
                max="100"
                placeholder="e.g. 88"
                value={formData.attendance_percentage}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
              />
              {errors.attendance_percentage && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.attendance_percentage}</p>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Assignment Completion (%)
              </label>
              <input
                type="number"
                name="assignment_completion_rate"
                min="0"
                max="100"
                placeholder="e.g. 92"
                value={formData.assignment_completion_rate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Class Participation</label>
              <select
                name="class_participation"
                value={formData.class_participation}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Leave empty (optional)</option>
                {CLASS_PARTICIPATION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Study Habits */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> 3. Study Habits & Methods
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Study Hours / Day</label>
              <input
                type="number"
                name="study_hours_per_day"
                min="0"
                max="24"
                step="0.5"
                placeholder="e.g. 3.5"
                value={formData.study_hours_per_day}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Study Consistency</label>
              <select
                name="study_consistency"
                value={formData.study_consistency}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Leave empty (optional)</option>
                {STUDY_CONSISTENCY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Primary Study Method</label>
              <select
                name="study_method"
                value={formData.study_method}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Leave empty (optional)</option>
                {STUDY_METHOD_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Revision Frequency</label>
              <select
                name="revision_frequency"
                value={formData.revision_frequency}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Leave empty (optional)</option>
                {REVISION_FREQUENCY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Study Environment</label>
              <select
                name="study_environment"
                value={formData.study_environment}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Leave empty (optional)</option>
                {STUDY_ENVIRONMENT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Practice Tests Completed</label>
              <input
                type="number"
                name="practice_tests_completed"
                min="0"
                max="50"
                placeholder="e.g. 8"
                value={formData.practice_tests_completed}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Wellbeing */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-2">
            <Heart className="w-4 h-4" /> 4. Wellbeing & Lifestyle
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Sleep Hours / Night</label>
              <input
                type="number"
                name="sleep_hours"
                min="0"
                max="24"
                step="0.5"
                placeholder="e.g. 7.5"
                value={formData.sleep_hours}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Sleep Quality</label>
              <select
                name="sleep_quality"
                value={formData.sleep_quality}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Leave empty (optional)</option>
                {SLEEP_QUALITY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Daily Screen Time (hrs)</label>
              <input
                type="number"
                name="daily_screen_time"
                min="0"
                max="24"
                step="0.5"
                placeholder="e.g. 4.0"
                value={formData.daily_screen_time}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Stress Level (0 - 10)</label>
              <input
                type="number"
                name="stress_level"
                min="0"
                max="10"
                placeholder="e.g. 6"
                value={formData.stress_level}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
              />
              {errors.stress_level && <p className="text-[11px] text-rose-600 mt-1">{errors.stress_level}</p>}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Motivation Level</label>
              <select
                name="motivation_level"
                value={formData.motivation_level}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Leave empty (optional)</option>
                {MOTIVATION_LEVEL_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 5: Tech & Environment */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-2">
            <Laptop className="w-4 h-4" /> 5. Technology Access & Environment
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Device Availability</label>
              <select
                name="device_availability"
                value={formData.device_availability}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Leave empty (optional)</option>
                {DEVICE_AVAILABILITY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Internet Access</label>
              <select
                name="internet_access"
                value={formData.internet_access}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Leave empty (optional)</option>
                <option value="1">1 — Yes (High Speed)</option>
                <option value="0">0 — No Internet</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Family Income Level</label>
              <select
                name="family_income"
                value={formData.family_income}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Leave empty (optional)</option>
                {FAMILY_INCOME_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Link
            to="/students"
            className="px-5 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors disabled:bg-indigo-400"
          >
            {loading ? 'Registering Student...' : 'Save & Register Student'}
          </button>
        </div>
      </form>

      {/* ── Post-Creation Success Modal ─────────────────────────────────────── */}
      {createdStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center border border-slate-100 space-y-5">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl mx-auto flex items-center justify-center shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Student Enrolled Successfully!</h2>
              <p className="text-xs text-slate-500 mt-1">
                <strong>{createdStudent.name}</strong> ({createdStudent.studentId}) is now active in your roster.
              </p>
            </div>

            <div className="p-4 bg-indigo-50/80 rounded-xl border border-indigo-100 text-xs text-indigo-900 flex items-start gap-2.5 text-left">
              <Sparkles className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
              <p>
                Would you like to run the machine learning prediction model now to immediately calculate this student&apos;s predicted score and risk level?
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => navigate(`/students/${createdStudent._id}`)}
                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors"
              >
                View Profile Only
              </button>
              <button
                onClick={handleRunImmediatePrediction}
                disabled={predicting}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors disabled:bg-indigo-400"
              >
                {predicting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Predicting...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Run Prediction Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
