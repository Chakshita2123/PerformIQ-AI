import React from 'react';

/**
 * RiskBadge
 * Accessible, WCAG AA compliant risk indicator.
 * Displays both a color dot and a clear text label.
 * Text uses high-contrast colors (>= 4.5:1 against light and dark mode surfaces).
 */
export default function RiskBadge({ level, showDot = true, size = 'sm', className = '' }) {
  const normLevel = level ? String(level).trim() : 'Unassessed';

  let config = {
    label: 'Unassessed',
    dotClass: 'bg-risk-unassessed-fill',
    badgeClass: 'bg-risk-unassessed-bg text-risk-unassessed-text border-risk-unassessed-border',
  };

  if (normLevel === 'High' || normLevel === 'High Risk') {
    config = {
      label: 'High risk',
      dotClass: 'bg-risk-high-fill',
      badgeClass: 'bg-risk-high-bg text-risk-high-text border-risk-high-border',
    };
  } else if (normLevel === 'Medium' || normLevel === 'Medium Risk') {
    config = {
      label: 'Medium risk',
      dotClass: 'bg-risk-med-fill',
      badgeClass: 'bg-risk-med-bg text-risk-med-text border-risk-med-border',
    };
  } else if (normLevel === 'Low' || normLevel === 'Low Risk') {
    config = {
      label: 'Low risk',
      dotClass: 'bg-risk-low-fill',
      badgeClass: 'bg-risk-low-bg text-risk-low-text border-risk-low-border',
    };
  }

  const sizeClasses =
    size === 'xs'
      ? 'px-2 py-0.5 text-xs font-medium gap-1'
      : size === 'lg'
      ? 'px-3 py-1 text-sm font-semibold gap-2'
      : 'px-2.5 py-0.5 text-xs font-semibold gap-1.5';

  return (
    <span
      className={`inline-flex items-center rounded-full border ${sizeClasses} ${config.badgeClass} ${className}`}
    >
      {showDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${config.dotClass}`}
          aria-hidden="true"
        />
      )}
      <span>{config.label}</span>
    </span>
  );
}
