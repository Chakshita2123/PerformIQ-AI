import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Plus } from 'lucide-react';
import RiskBadge from './RiskBadge';

/**
 * AttentionRow
 * Student row with the signature "Severity Rail" (4px left border).
 * Displays key details, top recommendation short labels as chips, and quick action buttons.
 *
 * Left border colors:
 * - High risk: border-l-coral (red rail)
 * - Medium risk: border-l-amber (amber rail)
 * - Low risk / other: border-l-mint
 *
 * Uses border-l-4 and border-l-* only (no border-coral on other sides) to ensure no full outline.
 */
export default function AttentionRow({
  student,
  onPredict,
  onIntervene,
  isPredicting = false,
}) {
  if (!student) return null;

  const risk = (student.latestRiskLevel || '').toLowerCase();
  const score = student.latestPredictedScore;
  const isHigh = risk === 'high' || (typeof score === 'number' && score < 50);
  const isMed = risk === 'medium' || (!isHigh && typeof score === 'number' && score < 60);

  const railColorClass = isHigh
    ? 'border-l-coral'
    : isMed
    ? 'border-l-amber'
    : 'border-l-mint';

  // Use short reasonLabels if available from GET /api/dashboard/attention, otherwise fallback to reasons
  const displayChips =
    student.reasonLabels && student.reasonLabels.length > 0
      ? student.reasonLabels
      : student.reasons && student.reasons.length > 0
      ? student.reasons
      : [];

  return (
    <div
      className={`p-4 bg-panel border-l-4 ${railColorClass} hover:bg-subtle/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3`}
    >
      {/* Student Details & Reason Chips */}
      <div className="space-y-1.5 flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to={`/students/${student._id}`}
            className="text-sm font-semibold text-text-primary hover:text-accent transition-colors truncate"
          >
            {student.name}
          </Link>
          <span className="text-xs font-mono-num text-text-subtle">
            {student.studentId}
          </span>
          <RiskBadge level={student.latestRiskLevel} size="xs" />
          <span className="text-xs text-text-muted ml-auto md:ml-0">
            Score:{' '}
            <span className="font-mono-num font-semibold text-text-primary">
              {typeof student.latestPredictedScore === 'number'
                ? `${student.latestPredictedScore.toFixed(2)} / 100`
                : 'N/A'}
            </span>
          </span>
        </div>

        {/* Short Reason Chips (from backend recommendation rules) */}
        {displayChips.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {displayChips.map((chip, idx) => (
              <span
                key={idx}
                title={student.reasons?.[idx] || chip}
                className="inline-flex items-center text-xs text-text-muted bg-subtle border border-border rounded px-2 py-0.5 max-w-full truncate"
              >
                {chip}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-text-subtle italic">No primary risk factors flagged.</p>
        )}
      </div>

      {/* Quick Action Buttons */}
      <div className="flex items-center gap-2 self-end md:self-center flex-shrink-0">
        <button
          type="button"
          onClick={() => onPredict && onPredict(student)}
          disabled={isPredicting}
          title="Run model prediction"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-primary bg-panel hover:bg-subtle border border-border rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
        >
          <Play className="w-3.5 h-3.5 text-accent" />
          <span>Predict</span>
        </button>

        <button
          type="button"
          onClick={() => onIntervene && onIntervene(student)}
          title="Assign intervention"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-navy bg-teal hover:bg-accent-hover rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Intervene</span>
        </button>
      </div>
    </div>
  );
}
