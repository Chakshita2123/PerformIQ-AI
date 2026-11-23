import React from 'react';

/**
 * ScoreGauge
 * Half-circle SVG gauge displaying the ML predicted score (0 to 100).
 * Marked with 50 and 60 risk threshold bands:
 *   - 0 to 50: High risk (coral)
 *   - 50 to 60: Medium risk (amber)
 *   - 60 to 100: Low risk (mint)
 */
export default function ScoreGauge({ score = null, riskLevel = null, className = '' }) {
  const hasScore = typeof score === 'number' && !isNaN(score);
  const clampedScore = hasScore ? Math.min(100, Math.max(0, score)) : 0;

  // Half-circle geometry (180 degrees)
  // Center: (100, 100), Radius: 70
  // Arc starts at angle Math.PI (180deg, left) and goes to 0 (0deg, right)
  const radius = 70;
  const cx = 100;
  const cy = 90;
  const circumference = Math.PI * radius; // Half-circle circumference: ~219.91

  // Fraction of arc for score: [0, 1]
  const scoreFraction = clampedScore / 100;
  const progressStrokeDashoffset = circumference * (1 - scoreFraction);

  // Band boundaries along the half circle
  // 50% = Math.PI/2 (top: (100, 20))
  // 60% = Math.PI * (1 - 0.6) = 0.4 * Math.PI
  const angle50 = Math.PI * 0.5;
  const tick50X = cx + radius * Math.cos(Math.PI - angle50);
  const tick50Y = cy - radius * Math.sin(angle50);

  const angle60 = Math.PI * 0.6;
  const tick60X = cx + radius * Math.cos(Math.PI - angle60);
  const tick60Y = cy - radius * Math.sin(angle60);

  // Color for the score fill based on risk level
  let strokeColor = '#94A3B8'; // unassessed
  let textColorClass = 'text-text-muted';
  let labelText = 'Unassessed';

  if (hasScore) {
    if (clampedScore < 50 || riskLevel === 'High') {
      strokeColor = '#E05C4B'; // coral
      textColorClass = 'text-risk-high-text';
      labelText = 'High risk';
    } else if (clampedScore < 60 || riskLevel === 'Medium') {
      strokeColor = '#D4891A'; // amber
      textColorClass = 'text-risk-med-text';
      labelText = 'Medium risk';
    } else {
      strokeColor = '#2EAB72'; // mint
      textColorClass = 'text-risk-low-text';
      labelText = 'Low risk';
    }
  }

  return (
    <div className={`flex flex-col items-center justify-center p-4 bg-panel border border-border rounded-xl ${className}`}>
      <div className="relative w-48 h-28 flex items-center justify-center">
        <svg viewBox="0 0 200 110" className="w-full h-full overflow-visible" aria-hidden="true">
          {/* Background Track (Grey) */}
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke="var(--border)"
            strokeWidth="14"
            strokeLinecap="round"
          />

          {/* High risk band indicator (0 to 50) */}
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx} ${cy - radius}`}
            fill="none"
            stroke="#E05C4B"
            strokeWidth="14"
            opacity="0.25"
          />

          {/* Medium risk band indicator (50 to 60) */}
          <path
            d={`M ${cx} ${cy - radius} A ${radius} ${radius} 0 0 1 ${tick60X} ${tick60Y}`}
            fill="none"
            stroke="#D4891A"
            strokeWidth="14"
            opacity="0.25"
          />

          {/* Low risk band indicator (60 to 100) */}
          <path
            d={`M ${tick60X} ${tick60Y} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke="#2EAB72"
            strokeWidth="14"
            opacity="0.25"
          />

          {/* Active Score Arc */}
          {hasScore && (
            <path
              d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
              fill="none"
              stroke={strokeColor}
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={progressStrokeDashoffset}
              className="transition-all duration-700 ease-out"
            />
          )}

          {/* Threshold Mark 50 */}
          <line
            x1={cx}
            y1={cy - radius - 10}
            x2={cx}
            y2={cy - radius + 10}
            stroke="var(--text-muted)"
            strokeWidth="2"
          />
          <text
            x={cx}
            y={cy - radius - 13}
            textAnchor="middle"
            fill="var(--text-muted)"
            fontSize="10"
            fontFamily="DM Mono"
          >
            50
          </text>

          {/* Threshold Mark 60 */}
          <line
            x1={tick60X + 2}
            y1={tick60Y - 8}
            x2={tick60X - 2}
            y2={tick60Y + 8}
            stroke="var(--text-muted)"
            strokeWidth="2"
          />
          <text
            x={tick60X + 7}
            y={tick60Y - 11}
            textAnchor="middle"
            fill="var(--text-muted)"
            fontSize="10"
            fontFamily="DM Mono"
          >
            60
          </text>

          {/* Start and End Labels */}
          <text x={cx - radius} y={cy + 16} textAnchor="middle" fill="var(--text-subtle)" fontSize="9" fontFamily="DM Mono">
            0
          </text>
          <text x={cx + radius} y={cy + 16} textAnchor="middle" fill="var(--text-subtle)" fontSize="9" fontFamily="DM Mono">
            100
          </text>
        </svg>

        {/* Center Score Display */}
        <div className="absolute top-10 flex flex-col items-center">
          <span className="text-2xl font-bold font-mono-num text-text-primary tracking-tight">
            {hasScore ? clampedScore.toFixed(2) : 'N/A'}
          </span>
          <span className="text-[11px] text-text-muted">out of 100</span>
        </div>
      </div>

      {/* Risk Badge Label */}
      <div className="mt-2 text-center">
        <span className={`text-xs font-semibold ${textColorClass} uppercase tracking-wider`}>
          {labelText}
        </span>
        <p className="text-[11px] text-text-subtle mt-0.5">
          {hasScore
            ? clampedScore < 50
              ? 'High risk boundary (< 50)'
              : clampedScore < 60
              ? 'Medium risk boundary (50–59)'
              : 'Low risk boundary (≥ 60)'
            : 'Pending ML forecast'}
        </p>
      </div>
    </div>
  );
}
