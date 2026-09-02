import React from 'react';
import { Menu, RefreshCw } from 'lucide-react';
import { User } from '../../types.ts';

interface DevTopbarProps {
  title: string;
  subtitle?: string;
  onOpenMobileSidebar: () => void;
  onRefresh: () => void;
  user: User | null;
  roleLabel: string;
}

export const DevTopbar: React.FC<DevTopbarProps> = ({ title, subtitle, onOpenMobileSidebar, onRefresh, user, roleLabel }) => {
  return (
    <header
      className="h-16 shrink-0 border-b flex items-center justify-between gap-3 px-4 sm:px-6 sticky top-0 z-30"
      style={{ background: 'var(--dd-bg-soft)', borderColor: 'var(--dd-border)' }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileSidebar}
          className="md:hidden p-2 rounded-lg shrink-0"
          style={{ color: 'var(--dd-ink-soft)' }}
          aria-label="Ouvrir le menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="font-serif font-bold text-base sm:text-lg leading-tight truncate" style={{ color: 'var(--dd-ink)' }}>
            {title}
          </h1>
          {subtitle && (
            <p className="text-[11px] truncate hidden sm:block" style={{ color: 'var(--dd-ink-faint)' }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-full text-xs font-semibold transition-all border"
          style={{ background: 'var(--dd-panel)', borderColor: 'var(--dd-border)', color: 'var(--dd-ink)' }}
        >
          <RefreshCw className="w-3.5 h-3.5" style={{ color: 'var(--dd-accent)' }} />
          <span className="hidden sm:inline">Actualiser</span>
        </button>

        {user && (
          <div className="flex items-center gap-2 pl-2.5 sm:border-l" style={{ borderColor: 'var(--dd-border)' }}>
            <img
              src={user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.full_name || 'U')}&backgroundColor=d94a76,4a2170`}
              alt={user.full_name}
              className="w-8 h-8 rounded-full object-cover border"
              style={{ borderColor: 'var(--dd-border-strong)' }}
            />
            <div className="hidden sm:block min-w-0">
              <p className="text-xs font-semibold truncate max-w-[140px]" style={{ color: 'var(--dd-ink)' }}>
                {user.full_name}
              </p>
              <p className="text-[10px] font-mono uppercase" style={{ color: 'var(--dd-accent)' }}>
                {roleLabel}
              </p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
