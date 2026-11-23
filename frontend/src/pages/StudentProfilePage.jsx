import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import ImpactModal from '../components/ImpactModal';
import {
  ArrowLeft,
  GraduationCap,
  Sparkles,
  AlertTriangle,
  Play,
  Plus,
  Calendar,
  Activity,
  BookOpen,
  Clock,
  Heart,
  Wifi,
  Laptop,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ClipboardList,
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
} from 'recharts';
import {
  INTERVENTION_TYPES,
  INTERVENTION_STATUSES,
  ASSESSMENT_TYPES,
} from '../constants/studentFields';

/**
 * StudentProfilePage: In-depth student profile displaying:
 * 1. Demographic & academic feature metrics.
 * 2. Real-time ML score prediction trigger with missing-field confidence warnings.
 * 3. Assessment history line chart with an assessment creation form.
 * 4. Assigned interventions with status update controls and impact evaluation.
 * 5. Full prediction audit log.
 */
export default function StudentProfilePage() {
  const { id } = useParams();

  const [student, setStudent] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [interventions, setInterventions] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Predicting state
  const [predicting, setPredicting] = useState(false);
  const [predictError, setPredictError] = useState(null);
  const [predictSuccess, setPredictSuccess] = useState(null);

  // Forms modals/state
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [newAssessment, setNewAssessment] = useState({
    title: '',
    type: 'Quiz',
    score: '',
    maxScore: 100,
    date: new Date().toISOString().split('T')[0],
  });
  const [assessmentSubmitting, setAssessmentSubmitting] = useState(false);

  const [showInterventionModal, setShowInterventionModal] = useState(false);
  const [newIntervention, setNewIntervention] = useState({
    type: 'Mentoring',
    startDate: new Date().toISOString().split('T')[0],
    status: 'planned',
    description: '',
    notes: '',
  });
  const [interventionSubmitting, setInterventionSubmitting] = useState(false);

  // Impact modal
  const [selectedInterventionForImpact, setSelectedInterventionForImpact] = useState(null);

  // Fetch full student details
  const fetchStudentData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [stuRes, assessRes, intervRes, predRes] = await Promise.all([
        api.get(`/students/${id}`),
        api.get(`/students/${id}/assessments`),
        api.get(`/students/${id}/interventions`),
        api.get(`/students/${id}/predictions`),
      ]);

      if (stuRes.data?.success) {
        setStudent(stuRes.data.data.student);
      }
      if (assessRes.data?.success) {
        setAssessments(assessRes.data.data.assessments || []);
      }
      if (intervRes.data?.success) {
        setInterventions(intervRes.data.data.interventions || []);
      }
      if (predRes.data?.success) {
        setPredictions(predRes.data.data.predictions || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load student details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchStudentData();
  }, [fetchStudentData]);

  // Run live prediction via POST /api/students/:id/predict
  const handleRunPrediction = async () => {
    setPredicting(true);
    setPredictError(null);
    setPredictSuccess(null);

    try {
      const res = await api.post(`/students/${id}/predict`);
      if (res.data?.success) {
        const pred = res.data.data.prediction;
        setPredictSuccess(
          `Prediction complete! Score: ${pred.predictedScore.toFixed(2)} (${pred.riskLevel} Risk)`
        );
        // Refresh student & predictions list
        await fetchStudentData();
      } else {
        setPredictError(res.data?.message || 'Prediction failed.');
      }
    } catch (err) {
      if (err.response?.status === 503) {
        setPredictError(
          'ML Service is unavailable. Please check that the Python FastAPI service is running on port 8000.'
        );
      } else {
        setPredictError(err.response?.data?.message || 'Prediction request failed.');
      }
    } finally {
      setPredicting(false);
    }
  };

  // Add assessment handler
  const handleAddAssessment = async (e) => {
    e.preventDefault();
    if (!newAssessment.title || newAssessment.score === '') return;

    setAssessmentSubmitting(true);
    try {
      const payload = {
        title: newAssessment.title,
        type: newAssessment.type,
        score: parseFloat(newAssessment.score),
        maxScore: parseFloat(newAssessment.maxScore) || 100,
        date: newAssessment.date,
      };

      const res = await api.post(`/students/${id}/assessments`, payload);
      if (res.data?.success) {
        setShowAssessmentModal(false);
        setNewAssessment({
          title: '',
          type: 'Quiz',
          score: '',
          maxScore: 100,
          date: new Date().toISOString().split('T')[0],
        });
        await fetchStudentData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add assessment');
    } finally {
      setAssessmentSubmitting(false);
    }
  };

  // Add intervention handler
  const handleAddIntervention = async (e) => {
    e.preventDefault();
    setInterventionSubmitting(true);
    try {
      const payload = {
        student: id,
        type: newIntervention.type,
        startDate: newIntervention.startDate,
        status: newIntervention.status,
        description: newIntervention.description,
        notes: newIntervention.notes,
      };

      const res = await api.post('/interventions', payload);
      if (res.data?.success) {
        setShowInterventionModal(false);
        setNewIntervention({
          type: 'Mentoring',
          startDate: new Date().toISOString().split('T')[0],
          status: 'planned',
          description: '',
          notes: '',
        });
        await fetchStudentData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create intervention');
    } finally {
      setInterventionSubmitting(false);
    }
  };

  // Quick update intervention status
  const handleUpdateInterventionStatus = async (interventionId, newStatus) => {
    try {
      const res = await api.patch(`/interventions/${interventionId}`, { status: newStatus });
      if (res.data?.success) {
        await fetchStudentData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update intervention status');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-500">Loading student profile...</p>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="max-w-3xl mx-auto my-12 p-8 bg-white rounded-2xl shadow-sm border border-slate-200 text-center">
        <XCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900">Student Record Unavailable</h2>
        <p className="text-sm text-slate-500 mt-2 mb-6">{error || 'Student not found.'}</p>
        <Link
          to="/students"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Students
        </Link>
      </div>
    );
  }

  // Find latest prediction
  const latestPrediction = predictions[0] || null;
  const isHighRisk = student.latestRiskLevel === 'High';
  const isMediumRisk = student.latestRiskLevel === 'Medium';
  const isLowRisk = student.latestRiskLevel === 'Low';

  // Format assessments for chart
  const chartData = assessments.map((a, idx) => ({
    name: a.title || `Assessment ${idx + 1}`,
    scorePercent: parseFloat(((a.score / a.maxScore) * 100).toFixed(1)),
    date: new Date(a.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    type: a.type,
  }));

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link to="/students" className="hover:text-indigo-600 flex items-center gap-1 font-medium">
          <ArrowLeft className="w-4 h-4" /> Students Directory
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold">{student.name}</span>
      </div>

      {/* ── Student Header Card ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0 text-indigo-700 font-bold text-2xl">
            {student.name.charAt(0)}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {student.name}
              </h1>
              <span className="font-mono text-xs px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg font-bold">
                {student.studentId}
              </span>
              {student.isSimulated && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200">
                  <Sparkles className="w-3 h-3" /> Simulated Demo Data
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1.5 flex flex-wrap items-center gap-3">
              <span>Age: <strong className="text-slate-700">{student.age ?? 'N/A'}</strong></span>
              <span>•</span>
              <span>Gender: <strong className="text-slate-700">{student.gender ?? 'N/A'}</strong></span>
              <span>•</span>
              <span>Education: <strong className="text-slate-700">{student.education_level ?? 'N/A'}</strong></span>
              <span>•</span>
              <span>
                Assigned Teacher:{' '}
                <strong className="text-slate-700">
                  {typeof student.assignedTeacher === 'object'
                    ? student.assignedTeacher?.name
                    : 'Assigned'}
                </strong>
              </span>
            </p>
          </div>
        </div>

        {/* Action: Run Prediction Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={handleRunPrediction}
            disabled={predicting}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-bold rounded-xl shadow-sm transition-all group"
          >
            {predicting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Running Prediction...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Run Prediction</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Prediction Feedback Alerts */}
      {predictError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-rose-800">Prediction Service Notice</p>
            <p className="text-xs text-rose-600 mt-0.5">{predictError}</p>
          </div>
        </div>
      )}

      {predictSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <p className="text-sm font-semibold text-emerald-800">{predictSuccess}</p>
        </div>
      )}

      {/* ── Latest Prediction & Risk Overview Card ─────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Risk Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Assessed Risk Level
            </span>
            <div className="mt-3 flex items-center gap-3">
              <span
                className={`inline-flex items-center px-4 py-1.5 rounded-full text-base font-extrabold ${
                  isHighRisk
                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                    : isMediumRisk
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : isLowRisk
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {student.latestRiskLevel ? `${student.latestRiskLevel} Risk` : 'Unassessed'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              {isHighRisk && 'Urgent attention required. High probability of failing upcoming exams.'}
              {isMediumRisk && 'Moderate concern. Needs targeted interventions to stabilise performance.'}
              {isLowRisk && 'On track. Student is performing comfortably above passing grade thresholds.'}
              {!student.latestRiskLevel && 'Click "Run Prediction" to compute real-time risk assessment.'}
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 text-[11px] text-slate-400">
            Source:{' '}
            <strong className="text-slate-600">
              {latestPrediction?.source === 'manual' ? 'Admin Override' : 'HistGradientBoosting (Module 1)'}
            </strong>
          </div>
        </div>

        {/* Predicted Score Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Latest Predicted Score
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-black text-slate-900 tracking-tight">
                {student.latestPredictedScore !== null
                  ? student.latestPredictedScore.toFixed(2)
                  : 'N/A'}
              </span>
              <span className="text-sm font-semibold text-slate-400">/ 100</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Regression estimate clipped strictly between 0 and 100.
            </p>
          </div>

          {/* Missing Fields Confidence Warning */}
          {latestPrediction?.missingFieldsCount > 10 && (
            <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-amber-800 font-medium">
                <strong>Low confidence:</strong> {latestPrediction.missingFieldsCount} fields missing. Preprocessing pipeline imputed values using dataset medians/modes.
              </p>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-slate-100 text-[11px] text-slate-400">
            Last evaluated:{' '}
            <strong className="text-slate-600">
              {latestPrediction?.createdAt
                ? new Date(latestPrediction.createdAt).toLocaleString()
                : 'Never'}
            </strong>
          </div>
        </div>

        {/* Academic Baseline Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Key Academic Baselines
            </span>
            <div className="mt-3 space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Previous Exam Score:</span>
                <span className="font-bold text-slate-800">
                  {student.previous_exam_score !== null ? `${student.previous_exam_score}/100` : '—'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Attendance Rate:</span>
                <span className="font-bold text-slate-800">
                  {student.attendance_percentage !== null ? `${student.attendance_percentage}%` : '—'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-100">
                <span className="text-slate-500">Study Consistency:</span>
                <span className="font-bold text-slate-800">{student.study_consistency ?? '—'}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500">Daily Study Hours:</span>
                <span className="font-bold text-slate-800">
                  {student.study_hours_per_day !== null ? `${student.study_hours_per_day} hrs` : '—'}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 text-[11px] text-slate-400">
            Assessments on file: <strong className="text-slate-600">{assessments.length}</strong>
          </div>
        </div>
      </div>

      {/* ── Actionable Recommendations ───────────────────────────────────────── */}
      {latestPrediction?.recommendations && latestPrediction.recommendations.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Recommended Teacher Actions</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {latestPrediction.recommendations.map((rec, idx) => (
              <div
                key={idx}
                className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl flex items-start gap-3 hover:border-indigo-200 transition-colors"
              >
                <div className="p-2 bg-indigo-100/70 text-indigo-700 rounded-lg flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800">{rec.reason}</h3>
                  <p className="text-xs text-indigo-900 mt-1 font-medium">{rec.action}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Student Feature Attributes Grid ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <h2 className="text-base font-bold text-slate-900 mb-5 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-600" /> Comprehensive Student Profile Details
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-xs">
          {/* Group 1: Academics & Engagement */}
          <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-100">
            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-indigo-700">
              <GraduationCap className="w-4 h-4" /> Academic Metrics
            </h3>
            <div className="space-y-1.5 text-slate-600">
              <p>Previous GPA: <strong className="text-slate-800">{student.previous_gpa ?? 'N/A'}</strong></p>
              <p>Assignment Completion: <strong className="text-slate-800">{student.assignment_completion_rate ? `${student.assignment_completion_rate}%` : 'N/A'}</strong></p>
              <p>Class Participation: <strong className="text-slate-800">{student.class_participation ?? 'N/A'}</strong></p>
              <p>Practice Tests Done: <strong className="text-slate-800">{student.practice_tests_completed ?? 'N/A'}</strong></p>
              <p>Notes Quality: <strong className="text-slate-800">{student.notes_quality ?? 'N/A'}</strong></p>
            </div>
          </div>

          {/* Group 2: Study Habits */}
          <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-100">
            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-indigo-700">
              <Clock className="w-4 h-4" /> Study Habits
            </h3>
            <div className="space-y-1.5 text-slate-600">
              <p>Study Method: <strong className="text-slate-800">{student.study_method ?? 'N/A'}</strong></p>
              <p>Self Study Hours: <strong className="text-slate-800">{student.self_study_hours ? `${student.self_study_hours} hrs` : 'N/A'}</strong></p>
              <p>Revision Frequency: <strong className="text-slate-800">{student.revision_frequency ?? 'N/A'}</strong></p>
              <p>Study Environment: <strong className="text-slate-800">{student.study_environment ?? 'N/A'}</strong></p>
              <p>Private Tuition: <strong className="text-slate-800">{student.private_tuition === 1 ? 'Yes' : 'No'}</strong></p>
            </div>
          </div>

          {/* Group 3: Wellbeing & Lifestyle */}
          <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-100">
            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-indigo-700">
              <Heart className="w-4 h-4" /> Lifestyle & Wellbeing
            </h3>
            <div className="space-y-1.5 text-slate-600">
              <p>Sleep Hours: <strong className="text-slate-800">{student.sleep_hours ? `${student.sleep_hours} hrs` : 'N/A'}</strong></p>
              <p>Sleep Quality: <strong className="text-slate-800">{student.sleep_quality ?? 'N/A'}</strong></p>
              <p>Daily Screen Time: <strong className="text-slate-800">{student.daily_screen_time ? `${student.daily_screen_time} hrs` : 'N/A'}</strong></p>
              <p>Physical Activity: <strong className="text-slate-800">{student.physical_activity_hours ? `${student.physical_activity_hours} hrs` : 'N/A'}</strong></p>
              <p>Stress Level: <strong className="text-slate-800">{student.stress_level ? `${student.stress_level} / 10` : 'N/A'}</strong></p>
            </div>
          </div>

          {/* Group 4: Environment & Tech */}
          <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-100">
            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-indigo-700">
              <Laptop className="w-4 h-4" /> Environment & Tech
            </h3>
            <div className="space-y-1.5 text-slate-600">
              <p>Device Availability: <strong className="text-slate-800">{student.device_availability ?? 'N/A'}</strong></p>
              <p>Internet Access: <strong className="text-slate-800">{student.internet_access === 1 ? 'Yes' : 'No'}</strong></p>
              <p>App Usage: <strong className="text-slate-800">{student.educational_app_usage ?? 'N/A'}</strong></p>
              <p>Family Income: <strong className="text-slate-800">{student.family_income ?? 'N/A'}</strong></p>
              <p>Parent Education: <strong className="text-slate-800">{student.parent_education ?? 'N/A'}</strong></p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Assessments & Performance Trajectory Section ─────────────────────── */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600" /> Assessment Trajectory & History
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Chronological assessment results (normalized to 100-point scale).
            </p>
          </div>
          <button
            onClick={() => setShowAssessmentModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold rounded-xl border border-indigo-200 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Assessment
          </button>
        </div>

        {/* Assessment Line Chart */}
        {chartData.length > 0 ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip
                  formatter={(val) => [`${val} / 100`, 'Score']}
                  labelFormatter={(name) => `Assessment: ${name}`}
                />
                <Line
                  type="monotone"
                  dataKey="scorePercent"
                  stroke="#4F46E5"
                  strokeWidth={3}
                  dot={{ r: 5, fill: '#4F46E5', stroke: '#fff', strokeWidth: 2 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="py-12 text-center bg-slate-50 rounded-xl border border-slate-100">
            <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-600">No assessments on record</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Click &quot;Add Assessment&quot; to log scores and track improvement over time.
            </p>
          </div>
        )}
      </div>

      {/* ── Interventions & Impact Tracking Section ──────────────────────────── */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-indigo-600" /> Assigned Interventions
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Targeted teacher actions assigned to improve student performance.
            </p>
          </div>
          <button
            onClick={() => setShowInterventionModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Assign Intervention
          </button>
        </div>

        {interventions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {interventions.map((iv) => (
              <div
                key={iv._id}
                className="p-5 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col justify-between space-y-4 hover:border-indigo-200 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-bold text-slate-900 text-sm">{iv.type}</span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Started: {new Date(iv.startDate).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {iv.isSimulated && (
                        <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-semibold">
                          Simulated
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded capitalize ${
                          iv.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : iv.status === 'ongoing'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {iv.status}
                      </span>
                    </div>
                  </div>

                  {iv.description && (
                    <p className="text-xs text-slate-600 mt-2.5 bg-white p-2.5 rounded-lg border border-slate-100">
                      {iv.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-2">
                  {/* Status Dropdown Control */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500 text-[11px]">Status:</span>
                    <select
                      value={iv.status}
                      onChange={(e) => handleUpdateInterventionStatus(iv._id, e.target.value)}
                      className="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-800 focus:ring-1 focus:ring-indigo-500"
                    >
                      {INTERVENTION_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st.charAt(0).toUpperCase() + st.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* View Impact Trigger */}
                  <button
                    onClick={() => setSelectedInterventionForImpact(iv)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                  >
                    View Impact Analysis <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-10 text-center bg-slate-50 rounded-xl border border-slate-100">
            <ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-600">No interventions assigned yet</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Assign targeted interventions like mentoring or extra practice to boost student outcomes.
            </p>
          </div>
        )}
      </div>

      {/* ── Prediction Audit Log Section ────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-600" /> Prediction Audit Log
        </h2>

        {predictions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Predicted Score</th>
                  <th className="py-3 px-4">Risk Level</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Missing Fields</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {predictions.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono text-[11px]">
                      {new Date(p.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {p.predictedScore.toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.riskLevel === 'High'
                            ? 'bg-rose-100 text-rose-800'
                            : p.riskLevel === 'Medium'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {p.riskLevel}
                      </span>
                    </td>
                    <td className="py-3 px-4 capitalize font-medium">{p.source}</td>
                    <td className="py-3 px-4">
                      {p.missingFieldsCount > 0 ? (
                        <span className="text-amber-700 font-semibold">
                          {p.missingFieldsCount} imputed
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">No historical predictions recorded.</p>
        )}
      </div>

      {/* ── Modal: Add Assessment ────────────────────────────────────────────── */}
      {showAssessmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-900 text-base">Add Student Assessment</h3>
              <button
                onClick={() => setShowAssessmentModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddAssessment} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Assessment Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Unit 3 Calculus Quiz"
                  value={newAssessment.title}
                  onChange={(e) => setNewAssessment({ ...newAssessment, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Type</label>
                  <select
                    value={newAssessment.type}
                    onChange={(e) => setNewAssessment({ ...newAssessment, type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  >
                    {ASSESSMENT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={newAssessment.date}
                    onChange={(e) => setNewAssessment({ ...newAssessment, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Score *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    required
                    placeholder="e.g. 85"
                    value={newAssessment.score}
                    onChange={(e) => setNewAssessment({ ...newAssessment, score: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Max Score</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newAssessment.maxScore}
                    onChange={(e) => setNewAssessment({ ...newAssessment, maxScore: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAssessmentModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assessmentSubmitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-indigo-400"
                >
                  {assessmentSubmitting ? 'Saving...' : 'Save Assessment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Add Intervention ──────────────────────────────────────────── */}
      {showInterventionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-900 text-base">Assign Intervention</h3>
              <button
                onClick={() => setShowInterventionModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddIntervention} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Type *</label>
                  <select
                    value={newIntervention.type}
                    onChange={(e) => setNewIntervention({ ...newIntervention, type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                  >
                    {INTERVENTION_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={newIntervention.status}
                    onChange={(e) => setNewIntervention({ ...newIntervention, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 capitalize"
                  >
                    {INTERVENTION_STATUSES.map((st) => (
                      <option key={st} value={st}>{st.charAt(0).toUpperCase() + st.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Start Date *</label>
                <input
                  type="date"
                  required
                  value={newIntervention.startDate}
                  onChange={(e) => setNewIntervention({ ...newIntervention, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows="2"
                  placeholder="Outline intervention goals and plan..."
                  value={newIntervention.description}
                  onChange={(e) => setNewIntervention({ ...newIntervention, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows="2"
                  placeholder="Additional context or scheduling details..."
                  value={newIntervention.notes}
                  onChange={(e) => setNewIntervention({ ...newIntervention, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowInterventionModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={interventionSubmitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-indigo-400"
                >
                  {interventionSubmitting ? 'Assigning...' : 'Assign Intervention'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Intervention Impact Analysis ──────────────────────────────── */}
      {selectedInterventionForImpact && (
        <ImpactModal
          intervention={selectedInterventionForImpact}
          onClose={() => setSelectedInterventionForImpact(null)}
        />
      )}
    </div>
  );
}
