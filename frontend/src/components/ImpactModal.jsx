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
  CheckCircle,
} from 'lucide-react';

/**
 * ImpactModal: Displays intervention outcome analysis calculated by
 * comparing assessment averages before and after the intervention start date.
 * Gracefully handles "insufficient data" and "not started yet" cases,
 * and prominently flags simulated records.
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
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-sm">
            <TrendingUp className="w-4 h-4" /> Improved
          </span>
        );
      case 'declined':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-rose-100 text-rose-800 rounded-full font-bold text-sm">
            <TrendingDown className="w-4 h-4" /> Declined
          </span>
        );
      case 'not started yet':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full font-bold text-sm">
            <Clock className="w-4 h-4" /> Not Started Yet
          </span>
        );
      case 'insufficient data':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-700 rounded-full font-bold text-sm">
            <AlertCircle className="w-4 h-4 text-slate-500" /> Insufficient Data
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-800 rounded-full font-bold text-sm">
            <Minus className="w-4 h-4" /> No Clear Change
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">Intervention Impact Analysis</h2>
              {isSimulated && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200">
                  <Sparkles className="w-3 h-3" /> Simulated Demo Data
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Type: <strong className="text-slate-700">{intervention.type}</strong> • Status:{' '}
              <span className="capitalize font-semibold text-slate-700">{intervention.status}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10">
              <div className="w-9 h-9 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs font-medium text-slate-500">Calculating impact metrics...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-rose-800">Could not calculate impact</p>
                <p className="text-xs text-rose-600 mt-0.5">{error}</p>
              </div>
            </div>
          ) : impactData ? (
            <div className="space-y-6">
              {/* Verdict Banner */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200/70">
                <span className="text-sm font-medium text-slate-700">Calculated Verdict:</span>
                {renderVerdictBadge(impactData.verdict)}
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60">
                  <span className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                    Before Average
                  </span>
                  <span className="block text-xl font-bold text-slate-800 mt-1">
                    {impactData.before !== null ? `${impactData.before.toFixed(2)}` : '—'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {impactData.assessmentsBefore ?? 0} assessment(s)
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60">
                  <span className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                    After Average
                  </span>
                  <span className="block text-xl font-bold text-slate-800 mt-1">
                    {impactData.after !== null ? `${impactData.after.toFixed(2)}` : '—'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {impactData.assessmentsAfter ?? 0} assessment(s)
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60">
                  <span className="block text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                    Net Delta
                  </span>
                  <span
                    className={`block text-xl font-extrabold mt-1 ${
                      impactData.delta > 0
                        ? 'text-emerald-600'
                        : impactData.delta < 0
                        ? 'text-rose-600'
                        : 'text-slate-700'
                    }`}
                  >
                    {impactData.delta !== null
                      ? `${impactData.delta > 0 ? '+' : ''}${impactData.delta.toFixed(2)}`
                      : '—'}
                  </span>
                  <span className="text-[10px] text-slate-400">Points</span>
                </div>
              </div>

              {/* Contextual Notes & Guidance */}
              {impactData.verdict === 'not started yet' && (
                <p className="text-xs text-indigo-700 bg-indigo-50 p-3 rounded-lg border border-indigo-100 flex items-center gap-2">
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  This intervention has a future start date. Impact will be evaluated as new assessments are recorded.
                </p>
              )}

              {impactData.verdict === 'insufficient data' && (
                <p className="text-xs text-slate-600 bg-slate-100 p-3 rounded-lg border border-slate-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  At least one assessment before and one assessment on/after the start date are required to measure score changes.
                </p>
              )}

              {/* Simulated Data Academic Disclaimer */}
              {isSimulated && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold block">Academic Integrity Notice:</span>
                    This is simulated demo data flagged with <code>isSimulated: true</code>. Simulated outcomes are generated for software prototyping and do not prove real-world intervention effectiveness.
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
