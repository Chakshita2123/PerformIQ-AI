import React, { useEffect, useState } from 'react';
import api from '../api/client';
import {
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';

/**
 * ImpactModal
 * Evaluates intervention impact by comparing pre- and post-intervention assessment averages.
 * WCAG AA accessible with clear verdict labels and simulated demo notices.
 */
export default function ImpactModal({ intervention, onClose }) {
  const [impactData, setImpactData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!intervention?._id) return;

    const fetchImpact = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/interventions/${intervention._id}/impact`);
        if (res.data?.success) {
          setImpactData(res.data.data);
        } else {
          setError(res.data?.message || 'Failed to fetch impact details.');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Error connecting to impact endpoint.');
      } finally {
        setLoading(false);
      }
    };

    fetchImpact();
  }, [intervention]);

  if (!intervention) return null;

  const isSimulated = intervention.isSimulated || impactData?.isSimulated;

  const renderVerdictBadge = (verdict) => {
    switch (verdict) {
      case 'improved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-risk-low-bg text-risk-low-text border border-risk-low-border rounded-full font-bold text-xs">
            <TrendingUp className="w-3.5 h-3.5" /> Improved
          </span>
        );
      case 'declined':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-risk-high-bg text-risk-high-text border border-risk-high-border rounded-full font-bold text-xs">
            <TrendingDown className="w-3.5 h-3.5" /> Declined
          </span>
        );
      case 'not started yet':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-subtle text-text-muted border border-border rounded-full font-semibold text-xs">
            <Clock className="w-3.5 h-3.5" /> Not started yet
          </span>
        );
      case 'insufficient data':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-subtle text-text-muted border border-border rounded-full font-semibold text-xs">
            <AlertCircle className="w-3.5 h-3.5 text-text-subtle" /> Insufficient data
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-risk-med-bg text-risk-med-text border border-risk-med-border rounded-full font-bold text-xs">
            <Minus className="w-3.5 h-3.5" /> No clear change
          </span>
        );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-navy/60 flex items-center justify-center p-4 backdrop-blur-xs"
    >
      <div className="bg-panel border border-border rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div>
            <h3 className="text-sm font-bold text-text-primary">
              Intervention impact evaluation
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Program: {intervention.type} ({intervention.status})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-text-muted hover:text-text-primary"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Simulated Demo Notice */}
        {isSimulated && (
          <div className="p-3 bg-subtle/80 border border-border rounded-lg text-xs text-text-muted flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 text-teal mt-0.5 flex-shrink-0" />
            <span>
              Simulated demonstration record: Evaluated against seeded past assessment timeline.
            </span>
          </div>
        )}

        {loading ? (
          <div className="py-10 text-center space-y-2">
            <div className="w-6 h-6 border-2 border-teal border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-text-muted">Computing assessment outcome delta...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-risk-high-bg border border-risk-high-border rounded-lg text-xs text-risk-high-text">
            {error}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Verdict Centerpiece */}
            <div className="text-center py-3 bg-subtle/50 border border-border-subtle rounded-xl space-y-2">
              <span className="text-[11px] text-text-subtle">Outcome verdict</span>
              <div>{renderVerdictBadge(impactData?.verdict)}</div>
              {impactData?.message && (
                <p className="text-xs text-text-muted max-w-xs mx-auto">{impactData.message}</p>
              )}
            </div>

            {/* Pre vs Post Metric Cards */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-panel border border-border rounded-lg">
                <span className="text-[11px] text-text-subtle block">Pre-launch avg</span>
                <span className="text-lg font-bold font-mono-num text-text-primary">
                  {typeof impactData?.beforeAvg === 'number'
                    ? impactData.beforeAvg.toFixed(1)
                    : '—'}
                </span>
                <span className="text-[10px] text-text-subtle block mt-0.5">
                  {impactData?.beforeCount || 0} assessments
                </span>
              </div>

              <div className="p-3 bg-panel border border-border rounded-lg">
                <span className="text-[11px] text-text-subtle block">Post-launch avg</span>
                <span className="text-lg font-bold font-mono-num text-text-primary">
                  {typeof impactData?.afterAvg === 'number'
                    ? impactData.afterAvg.toFixed(1)
                    : '—'}
                </span>
                <span className="text-[10px] text-text-subtle block mt-0.5">
                  {impactData?.afterCount || 0} assessments
                </span>
              </div>

              <div className="p-3 bg-panel border border-border rounded-lg">
                <span className="text-[11px] text-text-subtle block">Score delta</span>
                <span
                  className={`text-lg font-bold font-mono-num ${
                    typeof impactData?.delta === 'number'
                      ? impactData.delta > 0
                        ? 'text-risk-low-text'
                        : impactData.delta < 0
                        ? 'text-risk-high-text'
                        : 'text-text-primary'
                      : 'text-text-subtle'
                  }`}
                >
                  {typeof impactData?.delta === 'number'
                    ? (impactData.delta > 0 ? `+${impactData.delta.toFixed(1)}` : impactData.delta.toFixed(1))
                    : '—'}
                </span>
                <span className="text-[10px] text-text-subtle block mt-0.5">Points</span>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 text-xs font-medium text-text-primary bg-subtle hover:bg-active border border-border rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
