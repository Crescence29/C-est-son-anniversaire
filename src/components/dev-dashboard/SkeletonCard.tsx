import React from 'react';

interface SkeletonCardProps {
  lines?: number;
  height?: number;
  className?: string;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ lines = 3, height, className = '' }) => {
  if (height) {
    return <div className={`dd-skeleton ${className}`} style={{ height }} />;
  }

  return (
    <div
      className={`rounded-2xl p-5 border space-y-3 ${className}`}
      style={{ background: 'var(--dd-panel)', borderColor: 'var(--dd-border)' }}
    >
      <div className="dd-skeleton h-3 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="dd-skeleton h-5" style={{ width: `${100 - i * 12}%` }} />
      ))}
    </div>
  );
};
