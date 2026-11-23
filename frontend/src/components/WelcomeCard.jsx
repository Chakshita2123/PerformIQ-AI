import React, { useState, useEffect } from 'react';
import { Sparkles, X, ArrowRight } from 'lucide-react';

const STORAGE_KEY = 'performiq_welcome_dismissed';

/**
 * WelcomeCard
 * Dismissible first-time onboarding card introducing the 4-step pedagogical workflow.
 * State is remembered in localStorage so educators only see it until dismissed.
 */
export default function WelcomeCard() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const isDismissed = localStorage.getItem(STORAGE_KEY);
    if (!isDismissed) {
      setDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div className="relative p-5 bg-subtle/80 border border-teal/40 rounded-xl space-y-3 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal text-navy flex items-center justify-center font-bold flex-shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-text-primary">
              Welcome to PerformIQ AI: how the four-step workflow works
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              An early intervention system designed to help busy educators spot who needs support and track progress.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-panel transition-colors"
          title="Dismiss welcome guide"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-1">
        <div className="p-3 bg-panel rounded-lg border border-border space-y-1">
          <span className="font-semibold text-text-primary block">1. Identify</span>
          <p className="text-text-muted text-[11px] leading-relaxed">
            Spot students projected below the pass mark before exam day arrives.
          </p>
        </div>

        <div className="p-3 bg-panel rounded-lg border border-border space-y-1">
          <span className="font-semibold text-text-primary block">2. Understand</span>
          <p className="text-text-muted text-[11px] leading-relaxed">
            Open the student's profile to review flagged factors (attendance, assignments, revision).
          </p>
        </div>

        <div className="p-3 bg-panel rounded-lg border border-border space-y-1">
          <span className="font-semibold text-text-primary block">3. Act</span>
          <p className="text-text-muted text-[11px] leading-relaxed">
            Assign a support program (such as mentoring or extra practice) directly from the profile.
          </p>
        </div>

        <div className="p-3 bg-panel rounded-lg border border-border space-y-1">
          <span className="font-semibold text-text-primary block">4. Review</span>
          <p className="text-text-muted text-[11px] leading-relaxed">
            Record subsequent assessment scores to evaluate score deltas and confirm improvement.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-1">
        <button
          type="button"
          onClick={handleDismiss}
          className="px-3.5 py-1 text-xs font-semibold text-navy bg-teal hover:bg-accent-hover rounded-lg transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
