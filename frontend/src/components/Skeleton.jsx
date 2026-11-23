import React from 'react';

/**
 * Skeleton
 * Accessible loading placeholder matching container dimensions.
 * Respects prefers-reduced-motion via CSS.
 */
export default function Skeleton({ className = '', height, width }) {
  const style = {};
  if (height) style.height = height;
  if (width) style.width = width;

  return (
    <div
      style={style}
      aria-hidden="true"
      className={`animate-pulse bg-subtle border border-border-subtle rounded-lg ${className}`}
    />
  );
}
