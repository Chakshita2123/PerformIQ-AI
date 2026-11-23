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
 * AddStudentPage
 * Form for enrolling new students with the 37 model input features.
 * Validates identity fields client-side.
 * No field is silently pre-filled: all optional fields default to "" (Not set)
 * so users must explicitly choose values or leave them un-set for imputation.
 */
export default function AddStudentPage() {
  const navigate = useNavigate();

  // Form State — strictly empty by default (no silent pre-fills)
  const [formData, setFormData] = useState({
    // 1. Identity & Demographics
    name: '',
    studentId: '',
    age: '',
    gender: '',
    education_level: '', // Strictly empty ("Not set")
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

    // 5. Digital & Exam Preparation
    internet_access: '',
    device_availability: '',
    educational_app_usage: '',
    online_course_hours: '',
    exam_difficulty: '',
    exam_preparation_days: '',
    time_management_score: '',
    exam_anxiety_level: '',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(null);

  // Success modal state
  const [createdStudent, setCreatedStudent] = useState(null);
  const [predicting, setPredicting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Full name is required';
    if (!formData.studentId.trim()) errs.studentId = 'Student ID is required';

    // Range validations
    if (formData.age && (formData.age < 10 || formData.age > 25)) {
      errs.age = 'Age must be between 10 and 25';
    }
    if (
      formData.previous_exam_score &&
      (formData.previous_exam_score < 0 || formData.previous_exam_score > 100)
    ) {
      errs.previous_exam_score = 'Score must be between 0 and 100';
    }
    if (formData.previous_gpa && (formData.previous_gpa < 0 || formData.previous_gpa > 4.0)) {
      errs.previous_gpa = 'GPA must be between 0.0 and 4.0';
    }
    if (
      formData.attendance_percentage &&
      (formData.attendance_percentage < 0 || formData.attendance_percentage > 100)
    ) {
      errs.attendance_percentage = 'Attendance must be between 0 and 100%';
    }
    if (
      formData.assignment_completion_rate &&
      (formData.assignment_completion_rate < 0 || formData.assignment_completion_rate > 100)
    ) {
      errs.assignment_completion_rate = 'Assignment rate must be between 0 and 100%';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {};
      for (const [key, value] of Object.entries(formData)) {
        if (value === '') {
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
            'online_learning_hours',
            'practice_tests_completed',
            'sleep_hours',
            'daily_screen_time',
            'physical_activity_hours',
            'stress_level',
            'online_course_hours',
            'exam_preparation_days',
            'time_management_score',
            'exam_anxiety_level',
          ].includes(key)
        ) {
          payload[key] = parseFloat(value);
        } else {
          payload[key] = value;
        }
      }

      const res = await api.post('/students', payload);
      if (res.data?.success) {
        setCreatedStudent(res.data.data.student);
      } else {
        setServerError(res.data?.message || 'Failed to enroll student.');
      }
    } catch (err) {
      setServerError(
        err.response?.data?.message || 'Error occurred while communicating with backend.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRunImmediatePrediction = async () => {
    if (!createdStudent?._id) return;
    setPredicting(true);
    try {
      await api.post(`/students/${createdStudent._id}/predict`);
      navigate(`/students/${createdStudent._id}`);
    } catch (err) {
      navigate(`/students/${createdStudent._id}`);
    } finally {
      setPredicting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-3">
          <Link
            to="/students"
            className="p-1.5 rounded-lg border border-border bg-panel text-text-muted hover:text-text-primary hover:bg-subtle transition-colors"
            title="Back to student directory"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-text-primary">Enroll new student</h1>
            <p className="text-xs text-text-muted mt-0.5">
              Enter student demographic, academic, and behavioral features for model tracking.
            </p>
          </div>
        </div>
      </div>

      {serverError && (
        <div
          role="alert"
          className="p-3 bg-risk-high-bg border border-risk-high-border rounded-xl text-xs text-risk-high-text flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{serverError}</span>
        </div>
      )}

      {/* ── Form Card ───────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Basic Identity */}
        <section className="bg-panel rounded-xl p-5 border border-border space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border-subtle">
            <GraduationCap className="w-4 h-4 text-teal" />
            <h2 className="text-sm font-semibold text-text-primary">1. Identity & demographics</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="sm:col-span-2">
              <label className="block font-medium text-text-primary mb-1">Full name *</label>
              <input
                type="text"
                name="name"
                required
                placeholder="Full student name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-1.5 border border-border rounded-lg bg-panel text-text-primary focus:ring-1 focus:ring-accent"
              />
              {errors.name && <p className="text-[11px] text-risk-high-text mt-1">{errors.name}</p>}
            </div>

            <div className="sm:col-span-2">
              <label className="block font-medium text-text-primary mb-1">Student ID *</label>
              <input
                type="text"
                name="studentId"
                required
                placeholder="Institutional student identifier"
                value={formData.studentId}
                onChange={handleChange}
                className="w-full px-3 py-1.5 border border-border rounded-lg bg-panel text-text-primary font-mono-num focus:ring-1 focus:ring-accent"
              />
              {errors.studentId && (
                <p className="text-[11px] text-risk-high-text mt-1">{errors.studentId}</p>
              )}
            </div>

            <div>
              <label className="block font-medium text-text-primary mb-1">Age (10–25)</label>
              <input
                type="number"
                name="age"
                min="10"
                max="25"
                placeholder="e.g. 17"
                value={formData.age}
                onChange={handleChange}
                className="w-full px-3 py-1.5 border border-border rounded-lg bg-panel text-text-primary font-mono-num"
              />
            </div>

            <div>
              <label className="block font-medium text-text-primary mb-1">Gender</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-3 py-1.5 border border-border rounded-lg bg-panel text-text-primary"
              >
                <option value="">Not set</option>
                {GENDER_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-text-primary mb-1">Education level</label>
              <select
                name="education_level"
                value={formData.education_level}
                onChange={handleChange}
                className="w-full px-3 py-1.5 border border-border rounded-lg bg-panel text-text-primary"
              >
                <option value="">Not set</option>
                {EDUCATION_LEVEL_OPTIONS.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-text-primary mb-1">Urban / rural</label>
              <select
                name="urban_rural"
                value={formData.urban_rural}
                onChange={handleChange}
                className="w-full px-3 py-1.5 border border-border rounded-lg bg-panel text-text-primary"
              >
                <option value="">Not set</option>
                {URBAN_RURAL_OPTIONS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Section 2: Academics & Engagement */}
        <section className="bg-panel rounded-xl p-5 border border-border space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border-subtle">
            <BookOpen className="w-4 h-4 text-teal" />
            <h2 className="text-sm font-semibold text-text-primary">2. Academics & engagement</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-medium text-text-primary mb-1">Previous exam score (0–100)</label>
              <input
                type="number"
                name="previous_exam_score"
                min="0"
                max="100"
                step="0.1"
                placeholder="e.g. 68.5"
                value={formData.previous_exam_score}
                onChange={handleChange}
                className="w-full px-3 py-1.5 border border-border rounded-lg bg-panel text-text-primary font-mono-num"
              />
            </div>

            <div>
              <label className="block font-medium text-text-primary mb-1">Attendance percentage (0–100%)</label>
              <input
                type="number"
                name="attendance_percentage"
                min="0"
                max="100"
                placeholder="e.g. 82"
                value={formData.attendance_percentage}
                onChange={handleChange}
                className="w-full px-3 py-1.5 border border-border rounded-lg bg-panel text-text-primary font-mono-num"
              />
            </div>

            <div>
              <label className="block font-medium text-text-primary mb-1">Assignment rate (0–100%)</label>
              <input
                type="number"
                name="assignment_completion_rate"
                min="0"
                max="100"
                placeholder="e.g. 90"
                value={formData.assignment_completion_rate}
                onChange={handleChange}
                className="w-full px-3 py-1.5 border border-border rounded-lg bg-panel text-text-primary font-mono-num"
              />
            </div>
          </div>
        </section>

        {/* Section 3: Study Habits */}
        <section className="bg-panel rounded-xl p-5 border border-border space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border-subtle">
            <Activity className="w-4 h-4 text-teal" />
            <h2 className="text-sm font-semibold text-text-primary">3. Study habits</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-medium text-text-primary mb-1">Study hours / day</label>
              <input
                type="number"
                name="study_hours_per_day"
                min="0"
                max="16"
                step="0.5"
                placeholder="e.g. 3.0"
                value={formData.study_hours_per_day}
                onChange={handleChange}
                className="w-full px-3 py-1.5 border border-border rounded-lg bg-panel text-text-primary font-mono-num"
              />
            </div>

            <div>
              <label className="block font-medium text-text-primary mb-1">Study consistency</label>
              <select
                name="study_consistency"
                value={formData.study_consistency}
                onChange={handleChange}
                className="w-full px-3 py-1.5 border border-border rounded-lg bg-panel text-text-primary"
              >
                <option value="">Not set</option>
                {STUDY_CONSISTENCY_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-text-primary mb-1">Revision frequency</label>
              <select
                name="revision_frequency"
                value={formData.revision_frequency}
                onChange={handleChange}
                className="w-full px-3 py-1.5 border border-border rounded-lg bg-panel text-text-primary"
              >
                <option value="">Not set</option>
                {REVISION_FREQUENCY_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Section 4: Wellbeing & Digital Habits */}
        <section className="bg-panel rounded-xl p-5 border border-border space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border-subtle">
            <Heart className="w-4 h-4 text-teal" />
            <h2 className="text-sm font-semibold text-text-primary">4. Wellbeing & digital habits</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-medium text-text-primary mb-1">Sleep hours</label>
              <input
                type="number"
                name="sleep_hours"
                min="0"
                max="16"
                step="0.5"
                placeholder="e.g. 7.0"
                value={formData.sleep_hours}
                onChange={handleChange}
                className="w-full px-3 py-1.5 border border-border rounded-lg bg-panel text-text-primary font-mono-num"
              />
            </div>

            <div>
              <label className="block font-medium text-text-primary mb-1">Daily screen time</label>
              <input
                type="number"
                name="daily_screen_time"
                min="0"
                max="16"
                step="0.5"
                placeholder="e.g. 4.5"
                value={formData.daily_screen_time}
                onChange={handleChange}
                className="w-full px-3 py-1.5 border border-border rounded-lg bg-panel text-text-primary font-mono-num"
              />
            </div>

            <div>
              <label className="block font-medium text-text-primary mb-1">Exam anxiety (1–10)</label>
              <input
                type="number"
                name="exam_anxiety_level"
                min="1"
                max="10"
                step="0.1"
                placeholder="e.g. 4.0"
                value={formData.exam_anxiety_level}
                onChange={handleChange}
                className="w-full px-3 py-1.5 border border-border rounded-lg bg-panel text-text-primary font-mono-num"
              />
            </div>

            <div>
              <label className="block font-medium text-text-primary mb-1">Device availability</label>
              <select
                name="device_availability"
                value={formData.device_availability}
                onChange={handleChange}
                className="w-full px-3 py-1.5 border border-border rounded-lg bg-panel text-text-primary"
              >
                <option value="">Not set</option>
                {DEVICE_AVAILABILITY_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            to="/students"
            className="px-4 py-2 border border-border bg-panel text-text-muted hover:text-text-primary rounded-lg text-xs font-medium transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 bg-teal hover:bg-accent-hover text-navy rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? 'Registering student...' : 'Save & register student'}
          </button>
        </div>
      </form>

      {/* ── Post-Creation Success Modal ─────────────────────────────────────── */}
      {createdStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 backdrop-blur-xs p-4">
          <div className="bg-panel rounded-xl max-w-md w-full p-6 text-center border border-border space-y-4 shadow-xl">
            <div className="w-12 h-12 bg-risk-low-bg text-risk-low-text rounded-full mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-base font-bold text-text-primary">Student enrolled successfully</h2>
              <p className="text-xs text-text-muted mt-1 font-mono-num">
                {createdStudent.name} ({createdStudent.studentId})
              </p>
            </div>

            <div className="p-3 bg-subtle/80 rounded-lg border border-border text-xs text-text-muted text-left flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-teal flex-shrink-0 mt-0.5" />
              <p>
                Would you like to run the machine learning prediction model now to immediately forecast
                this student's upcoming score and risk level?
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => navigate(`/students/${createdStudent._id}`)}
                className="flex-1 px-4 py-2 border border-border text-text-muted hover:text-text-primary bg-panel rounded-lg text-xs font-medium transition-colors"
              >
                View profile
              </button>
              <button
                type="button"
                onClick={handleRunImmediatePrediction}
                disabled={predicting}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-teal hover:bg-accent-hover text-navy rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {predicting ? (
                  <span>Forecasting...</span>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-navy" />
                    <span>Run prediction</span>
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
