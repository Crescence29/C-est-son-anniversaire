import React from 'react';
import { X, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface DevNavItem {
  key: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

export interface DevNavGroup {
  title: string;
  items: DevNavItem[];
}

interface DevSidebarProps {
  groups: DevNavGroup[];
  activeKey: string;
  onSelect: (key: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  brand?: React.ReactNode;
}

const NavButton: React.FC<{
  item: DevNavItem;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}> = ({ item, active, collapsed, onClick }) => {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={`group relative w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
        collapsed ? 'justify-center' : ''
      }`}
      style={{
        background: active ? 'var(--dd-accent-soft)' : 'transparent',
        color: active ? 'var(--dd-accent)' : 'var(--dd-ink-soft)',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(148,163,184,0.06)'; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full" style={{ background: 'var(--dd-accent)' }} />}
      <Icon className="w-4 h-4 shrink-0" />
      {!collapsed && <span className="flex-1 text-left whitespace-nowrap overflow-hidden text-ellipsis">{item.label}</span>}
      {!!item.badge && item.badge > 0 && (
        <span
          className={`shrink-0 text-[10px] font-mono font-bold rounded-full px-1.5 py-0.5 ${collapsed ? 'absolute -top-1 -right-1' : ''}`}
          style={{ background: '#f43f5e', color: 'white' }}
        >
          {item.badge}
        </span>
      )}

      {collapsed && (
        <span
          className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity z-50"
          style={{ background: 'var(--dd-panel-hover)', border: '1px solid var(--dd-border-strong)', color: 'var(--dd-ink)' }}
        >
          {item.label}
        </span>
      )}
    </button>
  );
};

const SidebarContent: React.FC<{
  groups: DevNavGroup[];
  activeKey: string;
  onSelect: (key: string) => void;
  collapsed: boolean;
}> = ({ groups, activeKey, onSelect, collapsed }) => (
  <nav className="flex-1 overflow-y-auto dd-scrollbar px-2.5 py-4 space-y-5">
    {groups.map((group) => (
      <div key={group.title}>
        {!collapsed && (
          <span className="block px-3 mb-1.5 text-[10px] font-mono font-bold uppercase tracking-wider" style={{ color: 'var(--dd-ink-faint)' }}>
            {group.title}
          </span>
        )}
        <div className="space-y-0.5">
          {group.items.map((item) => (
            <NavButton
              key={item.key}
              item={item}
              active={activeKey === item.key}
              collapsed={collapsed}
              onClick={() => onSelect(item.key)}
            />
          ))}
        </div>
      </div>
    ))}
  </nav>
);

export const DevSidebar: React.FC<DevSidebarProps> = ({
  groups,
  activeKey,
  onSelect,
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
  brand,
}) => {
  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="dd-sidebar hidden md:flex flex-col border-r overflow-hidden"
        style={{
          background: 'var(--dd-bg-soft)',
          borderColor: 'var(--dd-border)',
          flex: `0 0 ${collapsed ? 68 : 240}px`,
          width: collapsed ? 68 : 240,
          maxWidth: collapsed ? 68 : 240,
          minWidth: collapsed ? 68 : 240,
        }}
      >
        <div className="h-16 flex items-center justify-between px-3 border-b shrink-0" style={{ borderColor: 'var(--dd-border)' }}>
          {!collapsed && <div className="min-w-0">{brand}</div>}
          <button
            onClick={onToggleCollapsed}
            className="p-1.5 rounded-lg transition-colors shrink-0"
            style={{ color: 'var(--dd-ink-soft)' }}
            title={collapsed ? 'Étendre le menu' : 'Réduire le menu'}
          >
            {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
          </button>
        </div>
        <SidebarContent groups={groups} activeKey={activeKey} onSelect={onSelect} collapsed={collapsed} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCloseMobile} />
          <aside
            className="dd-drawer-in absolute left-0 top-0 bottom-0 w-72 flex flex-col border-r"
            style={{ background: 'var(--dd-bg-soft)', borderColor: 'var(--dd-border)' }}
          >
            <div className="h-16 flex items-center justify-between px-4 border-b shrink-0" style={{ borderColor: 'var(--dd-border)' }}>
              {brand}
              <button onClick={onCloseMobile} className="p-1.5 rounded-lg" style={{ color: 'var(--dd-ink-soft)' }} aria-label="Fermer le menu">
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
            <SidebarContent
              groups={groups}
              activeKey={activeKey}
              onSelect={(key) => {
                onSelect(key);
                onCloseMobile();
              }}
              collapsed={false}
            />
          </aside>
        </div>
      )}
    </>
  );
};
