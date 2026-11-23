import React from 'react';
import { Link } from 'react-router-dom';
import { Search, Compass, PlayCircle, CheckCircle2, ChevronRight } from 'lucide-react';

/**
 * FlowStrip
 * Visual four-step pedagogical sequence at the top of the dashboard:
 * 1. Identify: High-risk students needing urgent attention
 * 2. Understand: High-risk students with no intervention assigned yet
 * 3. Act: Active interventions currently planned or ongoing
 * 4. Review: Interventions ready for impact review (post-assessments recorded)
 *
 * All numbers are real and derived from database aggregation.
 */
export default function FlowStrip({ counts = {} }) {
  const identifyCount = counts.identify ?? counts.highRiskCount ?? 0;
  const understandCount = counts.understand ?? counts.highRiskWithoutIntervention ?? 0;
  const actCount = counts.act ?? (counts.plannedCount || 0) + (counts.ongoingCount || 0);
  const reviewCount = counts.review ?? counts.readyToReviewCount ?? 0;

  const steps = [
    {
      step: '1. Identify',
      count: identifyCount,
      label: identifyCount === 1 ? 'student at high risk' : 'students at high risk',
      actionText: 'Filter high risk',
      link: '/students?riskLevel=High',
      icon: Search,
      badgeColor: 'text-risk-high-text bg-risk-high-bg border-risk-high-border',
    },
    {
      step: '2. Understand',
      count: understandCount,
      label: understandCount === 1 ? 'high-risk student unassigned' : 'high-risk students unassigned',
      actionText: 'Open profiles',
      link: '/students?riskLevel=High',
      icon: Compass,
      badgeColor: 'text-risk-med-text bg-risk-med-bg border-risk-med-border',
    },
    {
      step: '3. Act',
      count: actCount,
      label: actCount === 1 ? 'support action underway' : 'support actions underway',
      actionText: 'View follow-ups',
      link: '/follow-ups',
      icon: PlayCircle,
      badgeColor: 'text-accent-text bg-accent-bg border-teal/30',
    },
    {
      step: '4. Review',
      count: reviewCount,
      label: reviewCount === 1 ? 'follow-up ready to review' : 'follow-ups ready to review',
      actionText: 'Evaluate impact',
      link: '/follow-ups',
      icon: CheckCircle2,
      badgeColor: reviewCount > 0
        ? 'text-accent-text bg-accent-bg border-teal/40 font-bold'
        : 'text-text-muted bg-subtle border-border',
    },
  ];

  return (
    <section aria-label="Support loop progress" className="space-y-2">
      <div className="flex items-center justify-between text-xs text-text-muted">
        <span className="font-medium text-text-primary">Support loop: four-step workflow</span>
        <span className="text-[11px] text-text-subtle">Identify → Understand → Act → Review</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {steps.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.step}
              to={item.link}
              className="p-3.5 bg-panel border border-border rounded-xl hover:border-teal/50 hover:shadow-xs transition-all flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-semibold text-text-muted group-hover:text-text-primary transition-colors">
                  {item.step}
                </span>
                <Icon className="w-4 h-4 text-text-subtle group-hover:text-accent transition-colors" />
              </div>

              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-mono-num text-text-primary">
                    {item.count}
                  </span>
                  <span className="text-xs text-text-muted truncate">
                    {item.label}
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-border-subtle flex items-center justify-between text-[11px] font-medium text-accent-text group-hover:underline">
                <span>{item.actionText}</span>
                <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
