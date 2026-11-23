import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * RiskBar
 * Single class-health summary.
 * Replaces the repetitive 6-card dashboard grid with a single proportional segmented bar.
 * Clicking a segment navigates to the student list filtered by that risk level.
 */
export default function RiskBar({
  byRisk = {},
  total = 0,
  avgPredictedScore = null,
  className = '',
}) {
  const navigate = useNavigate();

  const high = byRisk.High || 0;
  const medium = byRisk.Medium || 0;
  const low = byRisk.Low || 0;
  const unassessed = byRisk.unassessed || 0;
  const safeTotal = total > 0 ? total : high + medium + low + unassessed || 1;

  const highPct = ((high / safeTotal) * 100).toFixed(1);
  const medPct = ((medium / safeTotal) * 100).toFixed(1);
  const lowPct = ((low / safeTotal) * 100).toFixed(1);
  const unassessedPct = ((unassessed / safeTotal) * 100).toFixed(1);

  const handleFilterClick = (level) => {
    if (level === 'unassessed') {
      navigate('/students');
    } else {
      navigate(`/students?riskLevel=${level}`);
    }
  };

  return (
    <div className={`p-5 bg-panel border border-border rounded-xl ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-base font-semibold text-text-primary tracking-tight">
            Class health distribution
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Proportional risk breakdown across {total.toLocaleString()} enrolled students
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs text-text-muted">Class average</span>
            <p className="text-lg font-bold text-text-primary">
              <span className="font-mono-num">
                {typeof avgPredictedScore === 'number'
                  ? `${avgPredictedScore.toFixed(2)} / 100`
                  : 'N/A'}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Segmented Horizontal Bar */}
      <div
        className="w-full h-4 rounded-full overflow-hidden flex bg-subtle border border-border"
        role="progressbar"
        aria-label="Class risk level breakdown"
      >
        {high > 0 && (
          <button
            type="button"
            onClick={() => handleFilterClick('High')}
            style={{ width: `${highPct}%` }}
            title={`High risk: ${high} students (${highPct}%) — Click to filter`}
            className="h-full bg-coral hover:opacity-90 transition-opacity focus:outline-none"
          />
        )}
        {medium > 0 && (
          <button
            type="button"
            onClick={() => handleFilterClick('Medium')}
            style={{ width: `${medPct}%` }}
            title={`Medium risk: ${medium} students (${medPct}%) — Click to filter`}
            className="h-full bg-amber hover:opacity-90 transition-opacity focus:outline-none"
          />
        )}
        {low > 0 && (
          <button
            type="button"
            onClick={() => handleFilterClick('Low')}
            style={{ width: `${lowPct}%` }}
            title={`Low risk: ${low} students (${lowPct}%) — Click to filter`}
            className="h-full bg-mint hover:opacity-90 transition-opacity focus:outline-none"
          />
        )}
        {unassessed > 0 && (
          <button
            type="button"
            onClick={() => handleFilterClick('unassessed')}
            style={{ width: `${unassessedPct}%` }}
            title={`Unassessed: ${unassessed} students (${unassessedPct}%) — Click to filter`}
            className="h-full bg-slate-400 hover:opacity-90 transition-opacity focus:outline-none"
          />
        )}
      </div>

      {/* Interactive Legend with counts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border-subtle">
        <button
          type="button"
          onClick={() => handleFilterClick('High')}
          className="flex items-center justify-between p-2 rounded-lg bg-subtle hover:bg-active border border-border transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-coral flex-shrink-0" />
            <span className="text-xs font-medium text-text-primary">High risk</span>
          </div>
          <span className="text-xs font-bold font-mono-num text-risk-high-text">
            {high} <span className="font-normal text-text-subtle text-[11px]">({highPct}%)</span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleFilterClick('Medium')}
          className="flex items-center justify-between p-2 rounded-lg bg-subtle hover:bg-active border border-border transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber flex-shrink-0" />
            <span className="text-xs font-medium text-text-primary">Medium risk</span>
          </div>
          <span className="text-xs font-bold font-mono-num text-risk-med-text">
            {medium} <span className="font-normal text-text-subtle text-[11px]">({medPct}%)</span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleFilterClick('Low')}
          className="flex items-center justify-between p-2 rounded-lg bg-subtle hover:bg-active border border-border transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-mint flex-shrink-0" />
            <span className="text-xs font-medium text-text-primary">Low risk</span>
          </div>
          <span className="text-xs font-bold font-mono-num text-risk-low-text">
            {low} <span className="font-normal text-text-subtle text-[11px]">({lowPct}%)</span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleFilterClick('unassessed')}
          className="flex items-center justify-between p-2 rounded-lg bg-subtle hover:bg-active border border-border transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400 flex-shrink-0" />
            <span className="text-xs font-medium text-text-primary">Unassessed</span>
          </div>
          <span className="text-xs font-bold font-mono-num text-text-muted">
            {unassessed}{' '}
            <span className="font-normal text-text-subtle text-[11px]">({unassessedPct}%)</span>
          </span>
        </button>
      </div>
    </div>
  );
}
