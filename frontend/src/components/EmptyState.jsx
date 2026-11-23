import React from 'react';
import { HelpCircle } from 'lucide-react';

/**
 * EmptyState
 * Clean, quiet empty state with icon, title, description, and an actionable button.
 */
export default function EmptyState({
  icon: Icon = HelpCircle,
  title = 'No records found',
  description = 'There is currently no data matching your criteria.',
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <div
      className={`p-8 text-center flex flex-col items-center justify-center bg-panel border border-border rounded-xl ${className}`}
    >
      <div className="w-10 h-10 rounded-full bg-subtle flex items-center justify-center text-text-muted mb-3 border border-border">
        <Icon className="w-5 h-5 text-text-muted" />
      </div>
      <h3 className="text-sm font-semibold text-text-primary mb-1">{title}</h3>
      <p className="text-xs text-text-muted max-w-sm mb-4">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-navy bg-teal hover:bg-accent-hover rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-accent"
        >
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
}
