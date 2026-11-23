import React from 'react';
import { X, HelpCircle, AlertTriangle, ShieldCheck, Database, Info } from 'lucide-react';

/**
 * HelpDrawer
 * Slide-over drawer providing clear, plain-language guidance for teachers.
 * Adheres strictly to approved pedagogical explanations and transparency disclosures.
 */
export default function HelpDrawer({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Help and guidance drawer"
      className="fixed inset-0 z-50 overflow-hidden"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-navy/60 backdrop-blur-xs transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-md w-full bg-panel border-l border-border shadow-2xl flex flex-col z-50">
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-teal text-navy font-bold">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary">Help & guidance</h2>
              <p className="text-xs text-text-muted">Plain-language explanations for educators</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg border border-border text-text-muted hover:text-text-primary hover:bg-subtle transition-colors"
            title="Close help drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto text-xs leading-relaxed text-text-muted">
          {/* Section 1: Predicted Score */}
          <section className="space-y-1.5">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal" />
              What is the predicted score?
            </h3>
            <p>
              The predicted score is an estimate of a student's expected final exam performance (out of 100),
              calculated from past scores, study habits, attendance and exam details.
            </p>
          </section>

          {/* Section 2: Risk Bands */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-coral" />
              How are risk bands defined?
            </h3>
            <div className="space-y-2 pt-1">
              <div className="p-2.5 rounded-lg border border-risk-high-border bg-risk-high-bg text-risk-high-text">
                <strong>High risk (score under 50):</strong> predicted below the pass mark of 50. The prediction can be off by about 7 marks.
              </div>
              <div className="p-2.5 rounded-lg border border-risk-med-border bg-risk-med-bg text-risk-med-text">
                <strong>Medium risk (score 50 to 59):</strong> close to the borderline; proactive assistance helps prevent score decline.
              </div>
              <div className="p-2.5 rounded-lg border border-risk-low-border bg-risk-low-bg text-risk-low-text">
                <strong>Low risk (score 60 and above):</strong> on track to pass based on existing academic indicators.
              </div>
            </div>
          </section>

          {/* Section 3: Missing Fields & Ethical Safeguards */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal" />
              Missing details & ethical safeguards
            </h3>
            <p>
              When background fields are left un-set during enrollment, they are temporarily filled with
              typical values from the data the model was trained on. This allows the model to produce a preliminary score estimate without blocking your workflow.
            </p>
            <div className="p-3 bg-subtle/80 border border-border rounded-lg text-text-primary">
              <p className="font-medium">
                The model also receives background details (such as gender, family income and location). They are never used to explain a risk or to suggest actions, and in testing they had little effect.
              </p>
            </div>
          </section>

          {/* Section 4: Data Transparency */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Database className="w-4 h-4 text-text-subtle" />
              Simulated demonstration records
            </h3>
            <p>
              Student assessment trajectories and post-intervention outcome numbers are generated for demonstration purposes. They demonstrate system mechanics and do not prove real-world intervention efficacy.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-subtle/40 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-navy bg-teal hover:bg-accent-hover rounded-lg transition-colors"
          >
            Close guidance
          </button>
        </div>
      </div>
    </div>
  );
}
