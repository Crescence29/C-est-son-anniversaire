import React from 'react';

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent?: 'accent' | 'emerald' | 'amber' | 'rose';
  sublabel?: string;
}

const ACCENT_STYLES: Record<NonNullable<KpiCardProps['accent']>, { icon: string; ring: string }> = {
  accent: { icon: 'bg-[color:var(--dd-accent-soft)] text-[color:var(--dd-accent)]', ring: 'from-[color:var(--dd-accent)]/10' },
  emerald: { icon: 'bg-emerald-500/15 text-emerald-400', ring: 'from-emerald-500/10' },
  amber: { icon: 'bg-amber-500/15 text-amber-400', ring: 'from-amber-500/10' },
  rose: { icon: 'bg-rose-500/15 text-rose-400', ring: 'from-rose-500/10' },
};

export const KpiCard: React.FC<KpiCardProps> = ({ label, value, icon: Icon, accent = 'accent', sublabel }) => {
  const style = ACCENT_STYLES[accent];

  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 border dd-fade-in`} style={{ background: 'var(--dd-panel)', borderColor: 'var(--dd-border)' }}>
      <div className={`absolute -top-8 -right-8 w-28 h-28 rounded-full bg-gradient-to-br ${style.ring} to-transparent blur-2xl pointer-events-none`} />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wide" style={{ color: 'var(--dd-ink-soft)' }}>
            {label}
          </span>
          <div className="font-mono text-xl sm:text-2xl font-bold mt-1.5" style={{ color: 'var(--dd-ink)' }}>
            {value}
          </div>
          {sublabel && (
            <span className="text-[10px] mt-1 block" style={{ color: 'var(--dd-ink-faint)' }}>
              {sublabel}
            </span>
          )}
        </div>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${style.icon}`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
      </div>
    </div>
  );
};
