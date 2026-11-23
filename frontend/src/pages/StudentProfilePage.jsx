import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import ImpactModal from '../components/ImpactModal';
import ScoreGauge from '../components/ScoreGauge';
import RiskBadge from '../components/RiskBadge';
import Skeleton from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { useChartTheme } from '../context/ThemeContext';
import { formatDate } from '../utils/format';
import {
  ArrowLeft,
  Play,
  Plus,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ClipboardList,
  Calendar,
  X,
  Clock,
  Sparkles,
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
  ReferenceArea,
} from 'recharts';
import {
  INTERVENTION_TYPES,
  INTERVENTION_STATUSES,
  ASSESSMENT_TYPES,
} from '../constants/studentFields';

/**
 * StudentProfilePage
 * Comprehensive student diagnostic profile:
 * 1. Score gauge with 50 and 60 risk bands.
 * 2. "Why this risk" chips row strictly from recommendation rules.
 * 3. Combined assessment & intervention impact chart (with vertical intervention lines and shaded after-period).
 * 4. Interventions & predictions audit logs.
 * 5. Academic & lifestyle feature definitions.
 */
export default function StudentProfilePage() {
  const { id } = useParams();
  const chartTheme = useChartTheme();

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

  // Assessment modal
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [newAssessment, setNewAssessment] = useState({
    title: '',
    type: 'Quiz',
    score: '',
    maxScore: 100,
    date: new Date().toISOString().split('T')[0],
  });
  const [assessmentSubmitting, setAssessmentSubmitting] = useState(false);

  // Intervention modal
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

  // Fetch student details
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

  // Run ML prediction
  const handleRunPrediction = async () => {
    setPredicting(true);
    setPredictError(null);
    setPredictSuccess(null);

    try {
      const res = await api.post(`/students/${id}/predict`);
      if (res.data?.success) {
        const pred = res.data.data.prediction;
        setPredictSuccess(
          `Prediction complete: score ${pred.predictedScore?.toFixed(2)} (${pred.riskLevel} risk).`
        );
        await fetchStudentData();
      } else {
        setPredictError(res.data?.message || 'Prediction failed.');
      }
    } catch (err) {
      if (err.response?.status === 503) {
        setPredictError('ML Service is unavailable. Please verify the FastAPI service on port 8000.');
      } else {
        setPredictError(err.response?.data?.message || 'Prediction request failed.');
      }
    } finally {
      setPredicting(false);
    }
  };

  // Add assessment
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

  // Add intervention
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

  // Update intervention status
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
      <div className="space-y-6">
        <Skeleton height="60px" className="w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton height="200px" className="w-full" />
          <Skeleton height="200px" className="w-full md:col-span-2" />
        </div>
        <Skeleton height="320px" className="w-full" />
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="max-w-md mx-auto my-12 text-center p-8 bg-panel border border-border rounded-xl">
        <XCircle className="w-10 h-10 text-risk-high-text mx-auto mb-3" />
        <h2 className="text-base font-bold text-text-primary">Student profile unavailable</h2>
        <p className="text-xs text-text-muted mt-1 mb-4">{error || 'Student record not found.'}</p>
        <Link
          to="/students"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-teal text-navy text-xs font-semibold rounded-lg"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to students
        </Link>
      </div>
    );
  }

  const latestPrediction = predictions[0] || null;
  // Recommendations come strictly from backend prediction rules
  const recommendationReasons = latestPrediction?.recommendations || [];

  // Prepare chronological assessment data for combined chart
  const sortedAssessments = [...assessments].sort((a, b) => new Date(a.date) - new Date(b.date));
  const chartData = sortedAssessments.map((a) => ({
    rawDate: a.date,
    date: new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: a.score,
    title: a.title,
    type: a.type,
  }));

  // Identify active/earliest intervention start marker
  const primaryIntervention = interventions.find((i) => i.status === 'ongoing' || i.status === 'completed');
  let interventionMarkerDate = null;
  let lastAssessmentDate = null;

  if (primaryIntervention && chartData.length > 0) {
    const intStart = new Date(primaryIntervention.startDate);
    // Find matching or nearest chart node
    const match = chartData.find((d) => new Date(d.rawDate) >= intStart);
    if (match) {
      interventionMarkerDate = match.date;
      lastAssessmentDate = chartData[chartData.length - 1].date;
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Top Breadcrumb & Actions Bar ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div className="flex items-center gap-3">
          <Link
            to="/students"
            className="p-1.5 rounded-lg border border-border bg-panel text-text-muted hover:text-text-primary hover:bg-subtle transition-colors"
            title="Back to student directory"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-text-primary">{student.name}</h1>
              <RiskBadge level={student.latestRiskLevel} />
            </div>
            <p className="text-xs text-text-muted mt-0.5 font-mono-num">
              ID: {student.studentId} · Assigned: {student.assignedTeacher?.name || 'Assigned Teacher'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRunPrediction}
            disabled={predicting}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-navy bg-teal hover:bg-accent-hover rounded-lg transition-colors disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${predicting ? 'animate-spin' : ''}`} />
            <span>{predicting ? 'Forecasting...' : 'Run prediction'}</span>
          </button>
        </div>
      </div>

      {/* Simulated Demo Notice */}
      <div className="p-3 bg-subtle/80 border border-border rounded-lg flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-panel border border-border text-text-primary">
            Simulated demo data
          </span>
          <span>
            Assessment scores and intervention trajectory are generated for demonstration purposes.
          </span>
        </div>
      </div>

      {/* Notifications */}
      {predictSuccess && (
        <div className="p-3 bg-risk-low-bg border border-risk-low-border rounded-lg text-xs text-risk-low-text flex items-center justify-between">
          <span>{predictSuccess}</span>
          <button type="button" onClick={() => setPredictSuccess(null)}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {predictError && (
        <div className="p-3 bg-risk-high-bg border border-risk-high-border rounded-lg text-xs text-risk-high-text flex items-center justify-between">
          <span>{predictError}</span>
          <button type="button" onClick={() => setPredictError(null)}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Forecast & "Why This Risk" Section ───────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Score Gauge */}
        <div className="flex flex-col">
          <ScoreGauge
            score={student.latestPredictedScore}
            riskLevel={student.latestRiskLevel}
            className="h-full justify-between"
          />
        </div>

        {/* Why This Risk: Chips from Recommendation Rules */}
        <div className="md:col-span-2 p-5 bg-panel border border-border rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-border-subtle">
              <div>
                <h2 className="text-base font-semibold text-text-primary tracking-tight">
                  Why this risk
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Rule-based causal factors flagged by the model's feature analysis
                </p>
              </div>
              <span className="text-[11px] text-text-subtle font-mono-num">
                {recommendationReasons.length} flagged
              </span>
            </div>

            {recommendationReasons.length === 0 ? (
              <p className="text-xs text-text-subtle italic py-6 text-center">
                No active risk factors identified. The student demonstrates consistent attendance and
                study habits.
              </p>
            ) : (
              <div className="space-y-2.5">
                {recommendationReasons.map((reason, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-subtle/70 border border-border-subtle rounded-lg text-xs text-text-primary leading-relaxed flex items-start gap-2.5"
                  >
                    <span className="w-4 h-4 rounded-full bg-panel border border-border text-text-muted flex-shrink-0 text-[10px] font-mono-num flex items-center justify-center font-bold mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {latestPrediction && (
            <div className="pt-3 mt-3 border-t border-border-subtle flex items-center justify-between text-[11px] text-text-subtle font-mono-num">
              <span>Source: {latestPrediction.source}</span>
              <span>
                Forecasted: {formatDate(latestPrediction.createdAt)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── ONE Combined Assessment & Intervention Impact Chart ──────────── */}
      <section className="p-5 bg-panel border border-border rounded-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b border-border-subtle">
          <div>
            <h2 className="text-base font-semibold text-text-primary tracking-tight">
              Progress & intervention impact timeline
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Historical assessments marked against risk thresholds (50 and 60). Vertical line marks
              intervention launch.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAssessmentModal(true)}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-primary bg-panel hover:bg-subtle border border-border rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-accent" />
            <span>Add assessment</span>
          </button>
        </div>

        <div className="h-64 w-full">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-text-subtle italic">
              No recorded assessments yet. Click "Add assessment" to log the first score.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 15, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                <XAxis
                  dataKey="date"
                  stroke={chartTheme.text}
                  tick={{ fill: chartTheme.text, fontSize: 11, fontFamily: 'DM Sans' }}
                />
                <YAxis
                  domain={[0, 100]}
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
                  formatter={(val, name, props) => [
                    `${val}/100 (${props.payload.title} · ${props.payload.type})`,
                    'Score',
                  ]}
                />

                {/* Risk Boundaries */}
                <ReferenceLine
                  y={60}
                  stroke={chartTheme.mint}
                  strokeDasharray="4 4"
                  label={{ value: 'Low risk (≥60)', fill: chartTheme.mint, fontSize: 10, position: 'right' }}
                />
                <ReferenceLine
                  y={50}
                  stroke={chartTheme.coral}
                  strokeDasharray="4 4"
                  label={{ value: 'High risk (<50)', fill: chartTheme.coral, fontSize: 10, position: 'right' }}
                />

                {/* Intervention Start Vertical Marker & After-Period Shading */}
                {interventionMarkerDate && (
                  <ReferenceLine
                    x={interventionMarkerDate}
                    stroke={chartTheme.teal}
                    strokeWidth={2}
                    label={{
                      value: `Intervention: ${primaryIntervention.type}`,
                      fill: chartTheme.teal,
                      fontSize: 10,
                      position: 'top',
                    }}
                  />
                )}
                {interventionMarkerDate && lastAssessmentDate && (
                  <ReferenceArea
                    x1={interventionMarkerDate}
                    x2={lastAssessmentDate}
                    fill={chartTheme.teal}
                    fillOpacity={0.07}
                  />
                )}

                {/* Assessment Score Line */}
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke={chartTheme.teal}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: chartTheme.teal, strokeWidth: 2, stroke: chartTheme.tooltipBg }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* ── Interventions & Predictions History ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interventions Section */}
        <section className="p-5 bg-panel border border-border rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-border-subtle">
              <div>
                <h2 className="text-base font-semibold text-text-primary tracking-tight">
                  Assigned interventions
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Targeted academic and psychological support programs
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowInterventionModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-navy bg-teal hover:bg-accent-hover rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Intervene</span>
              </button>
            </div>

            {interventions.length === 0 ? (
              <p className="text-xs text-text-subtle italic py-6 text-center">
                No interventions assigned for this student yet.
              </p>
            ) : (
              <div className="space-y-2.5">
                {interventions.map((iv) => (
                  <div
                    key={iv._id}
                    className="p-3 rounded-lg bg-subtle/60 border border-border-subtle space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-text-primary">{iv.type}</span>
                      <div className="flex items-center gap-2">
                        <select
                          value={iv.status}
                          onChange={(e) => handleUpdateInterventionStatus(iv._id, e.target.value)}
                          className="text-xs font-medium py-0.5 px-2 bg-panel border border-border rounded capitalize text-text-primary"
                        >
                          {INTERVENTION_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setSelectedInterventionForImpact(iv)}
                          className="text-xs font-medium text-accent-text hover:underline"
                        >
                          Impact ↗
                        </button>
                      </div>
                    </div>
                    {iv.description && (
                      <p className="text-xs text-text-muted">{iv.description}</p>
                    )}
                    <span className="text-[11px] font-mono-num text-text-subtle block">
                      Started: {formatDate(iv.startDate)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Prediction Audit History */}
        <section className="p-5 bg-panel border border-border rounded-xl flex flex-col justify-between">
          <div>
            <div className="pb-3 mb-3 border-b border-border-subtle">
              <h2 className="text-base font-semibold text-text-primary tracking-tight">
                Prediction history
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Chronological log of model runs and manual adjustments
              </p>
            </div>

            {predictions.length === 0 ? (
              <p className="text-xs text-text-subtle italic py-6 text-center">
                No prediction runs recorded yet.
              </p>
            ) : (
              <div className="space-y-2">
                {predictions.slice(0, 5).map((pred) => (
                  <div
                    key={pred._id}
                    className="flex items-center justify-between p-2.5 bg-subtle/50 border border-border-subtle rounded-lg text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono-num font-bold text-text-primary">
                        {pred.predictedScore?.toFixed(2)}
                      </span>
                      <RiskBadge level={pred.riskLevel} size="xs" />
                      <span className="text-text-subtle font-mono-num">
                        {pred.missingFieldsCount} imputed
                      </span>
                    </div>
                    <span className="text-[11px] font-mono-num text-text-subtle">
                      {formatDate(pred.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ── Student Academic & Lifestyle Details ─────────────────────────── */}
      <section className="p-5 bg-panel border border-border rounded-xl">
        <h2 className="text-base font-semibold text-text-primary tracking-tight pb-3 mb-4 border-b border-border-subtle">
          Student background & academic habits
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-text-subtle">Attendance</span>
            <p className="font-semibold text-text-primary font-mono-num mt-0.5">
              {student.attendance_percentage != null ? `${student.attendance_percentage}%` : 'N/A'}
            </p>
          </div>
          <div>
            <span className="text-text-subtle">Study hours / day</span>
            <p className="font-semibold text-text-primary font-mono-num mt-0.5">
              {student.study_hours_per_day != null ? `${student.study_hours_per_day}h` : 'N/A'}
            </p>
          </div>
          <div>
            <span className="text-text-subtle">Previous exam score</span>
            <p className="font-semibold text-text-primary font-mono-num mt-0.5">
              {student.previous_exam_score != null ? `${student.previous_exam_score}` : 'N/A'}
            </p>
          </div>
          <div>
            <span className="text-text-subtle">Assignment rate</span>
            <p className="font-semibold text-text-primary font-mono-num mt-0.5">
              {student.assignment_completion_rate != null ? `${student.assignment_completion_rate}%` : 'N/A'}
            </p>
          </div>
          <div>
            <span className="text-text-subtle">Sleep hours</span>
            <p className="font-semibold text-text-primary font-mono-num mt-0.5">
              {student.sleep_hours != null ? `${student.sleep_hours}h` : 'N/A'}
            </p>
          </div>
          <div>
            <span className="text-text-subtle">Daily screen time</span>
            <p className="font-semibold text-text-primary font-mono-num mt-0.5">
              {student.daily_screen_time != null ? `${student.daily_screen_time}h` : 'N/A'}
            </p>
          </div>
          <div>
            <span className="text-text-subtle">Exam anxiety level</span>
            <p className="font-semibold text-text-primary font-mono-num mt-0.5">
              {student.exam_anxiety_level != null ? `${student.exam_anxiety_level}/10` : 'N/A'}
            </p>
          </div>
          <div>
            <span className="text-text-subtle">Revision frequency</span>
            <p className="font-semibold text-text-primary mt-0.5">
              {student.revision_frequency || 'N/A'}
            </p>
          </div>
        </div>
      </section>

      {/* ── Add Assessment Modal ─────────────────────────────────────────── */}
      {showAssessmentModal && (
        <div className="fixed inset-0 z-50 bg-navy/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-panel border border-border rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-bold text-text-primary">Record assessment score</h3>
              <button
                type="button"
                onClick={() => setShowAssessmentModal(false)}
                className="p-1 text-text-muted hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddAssessment} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-text-primary mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Unit 3 Quiz"
                  value={newAssessment.title}
                  onChange={(e) => setNewAssessment({ ...newAssessment, title: e.target.value })}
                  className="w-full text-xs py-2 px-3 bg-panel border border-border rounded-lg text-text-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-primary mb-1">Type</label>
                  <select
                    value={newAssessment.type}
                    onChange={(e) => setNewAssessment({ ...newAssessment, type: e.target.value })}
                    className="w-full text-xs py-2 px-3 bg-panel border border-border rounded-lg text-text-primary"
                  >
                    {ASSESSMENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-primary mb-1">Score (0–100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    required
                    value={newAssessment.score}
                    onChange={(e) => setNewAssessment({ ...newAssessment, score: e.target.value })}
                    className="w-full text-xs py-2 px-3 bg-panel border border-border rounded-lg text-text-primary font-mono-num"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-primary mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={newAssessment.date}
                  onChange={(e) => setNewAssessment({ ...newAssessment, date: e.target.value })}
                  className="w-full text-xs py-2 px-3 bg-panel border border-border rounded-lg text-text-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAssessmentModal(false)}
                  className="px-3.5 py-1.5 text-xs text-text-muted hover:text-text-primary bg-panel border border-border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assessmentSubmitting}
                  className="px-4 py-1.5 text-xs font-semibold text-navy bg-teal hover:bg-accent-hover rounded-lg transition-colors"
                >
                  {assessmentSubmitting ? 'Saving...' : 'Save score'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Intervention Modal ───────────────────────────────────────── */}
      {showInterventionModal && (
        <div className="fixed inset-0 z-50 bg-navy/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-panel border border-border rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-bold text-text-primary">Assign intervention</h3>
              <button
                type="button"
                onClick={() => setShowInterventionModal(false)}
                className="p-1 text-text-muted hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddIntervention} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-text-primary mb-1">Program type</label>
                <select
                  value={newIntervention.type}
                  onChange={(e) => setNewIntervention({ ...newIntervention, type: e.target.value })}
                  className="w-full text-xs py-2 px-3 bg-panel border border-border rounded-lg text-text-primary"
                >
                  {INTERVENTION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-primary mb-1">Start date</label>
                  <input
                    type="date"
                    required
                    value={newIntervention.startDate}
                    onChange={(e) =>
                      setNewIntervention({ ...newIntervention, startDate: e.target.value })
                    }
                    className="w-full text-xs py-2 px-3 bg-panel border border-border rounded-lg text-text-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-primary mb-1">Status</label>
                  <select
                    value={newIntervention.status}
                    onChange={(e) =>
                      setNewIntervention({ ...newIntervention, status: e.target.value })
                    }
                    className="w-full text-xs py-2 px-3 bg-panel border border-border rounded-lg text-text-primary capitalize"
                  >
                    {INTERVENTION_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-primary mb-1">Description</label>
                <textarea
                  rows={3}
                  value={newIntervention.description}
                  onChange={(e) =>
                    setNewIntervention({ ...newIntervention, description: e.target.value })
                  }
                  placeholder="Targeted academic support goals..."
                  className="w-full text-xs py-2 px-3 bg-panel border border-border rounded-lg text-text-primary placeholder:text-text-subtle"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowInterventionModal(false)}
                  className="px-3.5 py-1.5 text-xs text-text-muted hover:text-text-primary bg-panel border border-border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={interventionSubmitting}
                  className="px-4 py-1.5 text-xs font-semibold text-navy bg-teal hover:bg-accent-hover rounded-lg transition-colors"
                >
                  {interventionSubmitting ? 'Saving...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Impact Evaluation Modal */}
      {selectedInterventionForImpact && (
        <ImpactModal
          intervention={selectedInterventionForImpact}
          onClose={() => setSelectedInterventionForImpact(null)}
        />
      )}
    </div>
  );
}
