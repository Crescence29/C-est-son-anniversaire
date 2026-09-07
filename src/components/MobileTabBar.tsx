import React, { useEffect, useRef, useState } from 'react';
import { Home, Gift, User, Briefcase, Shield, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { MoreMenuSheet } from './MoreMenuSheet.tsx';
import { HelpContactModal } from './HelpContactModal.tsx';
import { CompanyModal } from './CompanyModal.tsx';
import { SupportMessageModal } from './SupportMessageModal.tsx';

interface MobileTabBarProps {
  currentView: string;
  onNavigate: (view: string, param?: string) => void;
}

type LiquidTabKey = 'home' | 'catalog' | 'company' | 'account';

interface LiquidTab {
  key: LiquidTabKey;
  label: string;
  active: boolean;
  onClick: () => void;
  renderIcon: (effectClassName: string, context: 'row' | 'chip') => React.ReactNode;
}

const ICON_SIZE = 'w-5 h-5';

// The active tab's icon sits in a small solid badge that rises out of a
// smooth hill in the bar's own silhouette (not a separate floating card
// dipped into a valley) — matching a standard "liquid tab bar" reference.
const BADGE_RADIUS = 20;
// How far above the bar's own flat top edge the hill peaks. Pages that
// render this bar must reserve matching bottom clearance (pb-28) so
// scrolling content never ends up underneath the raised badge.
const BUMP_HEIGHT = 26;
// Default (max) hill dimensions, used whenever a tab's true center has
// room for them. Never used to shift the hill's position — only its size
// adapts (see computeBumpGeometry), so the hill always sits exactly on
// the active tab's real center, for every tab, on every screen width.
const BUMP_RADIUS = 22;
const BUMP_CURVE = 14;

/**
 * The SVG hill must not cross the bar's own rounded end caps (radius `cr`
 * from each side). Rather than moving the hill off the tab's true center
 * to make room, this shrinks its horizontal reach (radius + curve) to
 * whatever space is actually available on its tighter side, keeping its
 * center exact.
 */
function computeBumpGeometry(width: number, pillHeight: number, bumpX: number): { radius: number; curve: number } {
  const cr = pillHeight / 2;
  const desiredHalfWidth = BUMP_RADIUS + BUMP_CURVE;
  const available = Math.min(bumpX - cr, width - cr - bumpX);
  const halfWidth = Math.max(0, Math.min(desiredHalfWidth, available));
  const scale = halfWidth / desiredHalfWidth;
  return { radius: BUMP_RADIUS * scale, curve: BUMP_CURVE * scale };
}

/**
 * Builds the bar's outline as a single SVG path: a rounded pill whose top
 * edge rises into a smooth hill centered exactly at `bumpX` — the active
 * tab's real, measured center (see updateIndicator). `pillHeight` is the
 * bar's own height *excluding* the hill's extra headroom; the path's total
 * height is `pillHeight + BUMP_HEIGHT`, with the pill itself starting at
 * y = BUMP_HEIGHT (the hill peaks at y = 0).
 */
function buildNavPath(width: number, pillHeight: number, bumpX: number): string {
  const cr = pillHeight / 2;
  const nx = bumpX;
  const top = BUMP_HEIGHT;
  const bottom = top + pillHeight;
  const { radius, curve } = computeBumpGeometry(width, pillHeight, bumpX);

  return `
    M ${cr},${top}
    L ${nx - radius - curve},${top}
    C ${nx - radius - curve * 0.4},${top} ${nx - radius},${top - BUMP_HEIGHT * 0.9} ${nx - radius * 0.55},${top - BUMP_HEIGHT}
    A ${radius || 0.01},${radius || 0.01} 0 0 1 ${nx + radius * 0.55},${top - BUMP_HEIGHT}
    C ${nx + radius},${top - BUMP_HEIGHT * 0.9} ${nx + radius + curve * 0.4},${top} ${nx + radius + curve},${top}
    L ${width - cr},${top}
    A ${cr},${cr} 0 0 1 ${width - cr},${bottom}
    L ${cr},${bottom}
    A ${cr},${cr} 0 0 1 ${cr},${top}
    Z
  `.trim();
}

export const MobileTabBar: React.FC<MobileTabBarProps> = ({ currentView, onNavigate }) => {
  const { user } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const [infoModal, setInfoModal] = useState<'help' | 'contact' | null>(null);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [supportMessagesOpen, setSupportMessagesOpen] = useState(false);
  // The company tab has no "page" of its own (it just opens a modal), so its
  // selected state is tracked manually instead of derived from currentView.
  const [manualTab, setManualTab] = useState<LiquidTabKey | null>(null);
  // The active tab's real, measured horizontal center — shared as-is by the
  // notch, the floating chip and its label, so all three are always exactly
  // aligned with each other and with the tab itself.
  const [indicatorX, setIndicatorX] = useState<number | null>(null);
  const [barSize, setBarSize] = useState({ width: 0, height: 0 });

  const barRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Partial<Record<LiquidTabKey, HTMLButtonElement | null>>>({});

  const isPrivileged = user?.role === 'staff' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';

  const goTo = (view: string, param?: string) => {
    setManualTab(null);
    onNavigate(view, param);
  };

  const liquidTabs: LiquidTab[] = [
    {
      key: 'home',
      label: 'Accueil',
      active: manualTab === null && currentView === 'home',
      onClick: () => goTo('home'),
      renderIcon: (effectClassName) => <Home className={`${ICON_SIZE} ${effectClassName}`} />,
    },
    {
      key: 'catalog',
      label: 'Catalogue',
      active: manualTab === null && (currentView === 'catalog' || currentView === 'service-detail'),
      onClick: () => goTo('catalog'),
      renderIcon: (effectClassName) => <Gift className={`${ICON_SIZE} ${effectClassName}`} />,
    },
    {
      key: 'company',
      label: 'CBTV',
      active: manualTab === 'company',
      onClick: () => {
        setManualTab('company');
        setCompanyOpen(true);
      },
      renderIcon: (effectClassName, context) => (
        <img
          src="/CORTEX.jpg"
          alt="Cortex Bénin TV"
          className={`${context === 'chip' ? 'w-8 h-8' : 'w-7 h-7'} rounded-full object-cover ${effectClassName}`}
        />
      ),
    },
    {
      key: 'account',
      label: isPrivileged ? (isAdmin ? 'Admin' : 'Staff') : 'Compte',
      active:
        manualTab === null &&
        (isPrivileged
          ? currentView === 'staff' || currentView === 'admin'
          : currentView === 'account' || currentView === 'login' || currentView === 'register' || currentView === 'order-detail'),
      onClick: () => goTo(isPrivileged ? (isAdmin ? 'admin' : 'staff') : user ? 'account' : 'login'),
      renderIcon: (effectClassName) => {
        const Icon = isPrivileged ? (isAdmin ? Shield : Briefcase) : User;
        return <Icon className={`${ICON_SIZE} ${effectClassName}`} />;
      },
    },
  ];

  const activeTab = liquidTabs.find((t) => t.active) ?? liquidTabs[0];

  // Read by updateIndicator instead of closing over `activeTab` directly, so
  // that callers holding an older closure of updateIndicator (the
  // ResizeObserver below is set up once at mount and never recreated) still
  // always measure the *current* active tab instead of snapping back to
  // whichever tab was active when their closure was captured.
  const activeTabKeyRef = useRef(activeTab.key);
  activeTabKeyRef.current = activeTab.key;

  const updateIndicator = () => {
    const btn = tabRefs.current[activeTabKeyRef.current];
    const bar = barRef.current;
    if (!btn || !bar) return;
    const btnRect = btn.getBoundingClientRect();
    const barRect = bar.getBoundingClientRect();
    // getBoundingClientRect gives the button's real on-screen position, so
    // this center is exact for every tab and every viewport width — never a
    // hardcoded offset.
    const center = btnRect.left - barRect.left + btnRect.width / 2;
    setIndicatorX(center);
    // barRect.height includes the extra top headroom reserved for the hill
    // (see the bar's paddingTop below); buildNavPath wants just the pill's
    // own height and adds BUMP_HEIGHT back internally.
    setBarSize({ width: barRect.width, height: barRect.height - BUMP_HEIGHT });
  };

  useEffect(() => {
    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab.key, currentView, user?.role]);

  // The bar's real width can settle after the first paint (Tailwind's dev
  // stylesheet loads asynchronously), so re-measure whenever its box changes
  // rather than trusting a single mount-time snapshot.
  useEffect(() => {
    const bar = barRef.current;
    if (!bar || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => updateIndicator());
    observer.observe(bar);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // CSS transitions on the SVG `d` attribute aren't reliably supported, so the
  // notch glide is tweened by hand: interpolate notchX every frame and write
  // the recomputed path straight to the DOM (no per-frame React re-render).
  const pathElRef = useRef<SVGPathElement | null>(null);
  const animatedXRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (indicatorX === null || barSize.width === 0) return;

    const from = animatedXRef.current ?? indicatorX;
    const to = indicatorX;
    const duration = 350;
    const start = performance.now();
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const x = from + (to - from) * easeOutCubic(t);
      animatedXRef.current = x;
      if (pathElRef.current) {
        pathElRef.current.setAttribute('d', buildNavPath(barSize.width, barSize.height, x));
      }
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [indicatorX, barSize.width, barSize.height]);

  const goToReviews = () => {
    setMoreOpen(false);
    onNavigate('home');
    window.setTimeout(() => {
      document.getElementById('temoignages')?.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  };

  const ready = indicatorX !== null && barSize.width > 0;

  return (
    <>
      <div className="md:hidden fixed bottom-3 inset-x-0 z-40 px-4 pointer-events-none">
        <div className="max-w-md mx-auto relative">
          {/* Hidden clip-path definition: the bar's own silhouette rises into a hill under the active tab */}
          <svg className="absolute w-0 h-0">
            <clipPath id="liquid-nav-clip" clipPathUnits="userSpaceOnUse">
              <path
                ref={pathElRef}
                className="liquid-nav-path"
                d={ready ? buildNavPath(barSize.width, barSize.height, animatedXRef.current ?? indicatorX!) : undefined}
              />
            </clipPath>
          </svg>

          {/* Active-tab badge: a solid circle rising out of the hill, always
              sharing the exact same measured center as the hill itself. */}
          {ready && (
            <div
              className="absolute rounded-full bg-cortex-red shadow-lg shadow-cortex-red/40 flex items-center justify-center text-white pointer-events-none liquid-follow"
              style={{
                width: BADGE_RADIUS * 2,
                height: BADGE_RADIUS * 2,
                transform: `translateX(${indicatorX! - BADGE_RADIUS}px)`,
                top: -6,
              }}
            >
              {activeTab.renderIcon('', 'chip')}
            </div>
          )}

          {/* Thin accent line hugging the pill's bottom edge — a sibling, not a
              border on the clipped bar itself, so the clip-path can never cut it off. */}
          <div
            className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-cortex-red/70 pointer-events-none"
            aria-hidden="true"
          />

          <div
            ref={barRef}
            className="glass-panel shadow-2xl border border-white/60 dark:border-white/10 px-2 pb-1.5 pointer-events-auto grid grid-cols-5 items-center gap-0.5 relative"
            style={{ borderRadius: 9999, paddingTop: BUMP_HEIGHT, clipPath: ready ? 'url(#liquid-nav-clip)' : undefined }}
          >
            {liquidTabs.map((tab) => (
              <button
                key={tab.key}
                ref={(el) => { tabRefs.current[tab.key] = el; }}
                onClick={tab.onClick}
                className="flex flex-col items-center justify-center gap-0.5 h-11 w-14 mx-auto rounded-full transition-colors"
              >
                <span className={`transition-opacity duration-200 ${tab.active ? 'opacity-0' : 'opacity-100 text-ink/55'}`}>
                  {tab.renderIcon('', 'row')}
                </span>
                <span className={`text-[9px] font-medium ${tab.active ? 'text-cortex-red font-semibold' : 'text-ink/55'}`}>
                  {tab.label}
                </span>
              </button>
            ))}

            <button
              onClick={() => setMoreOpen(true)}
              className="flex flex-col items-center justify-center gap-0.5 h-11 w-14 mx-auto rounded-full text-ink/55 hover:text-ink transition-colors"
              aria-label="Plus d’options"
            >
              <Menu className={ICON_SIZE} />
              <span className="text-[9px] font-medium">Menu</span>
            </button>
          </div>
        </div>
      </div>

      <MoreMenuSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        onOpenHelp={() => {
          setMoreOpen(false);
          setInfoModal('help');
        }}
        onOpenContact={() => {
          setMoreOpen(false);
          setInfoModal('contact');
        }}
        onGoToReviews={goToReviews}
        onOpenSupportMessages={() => {
          setMoreOpen(false);
          setSupportMessagesOpen(true);
        }}
      />

      <HelpContactModal type={infoModal} onClose={() => setInfoModal(null)} />

      <SupportMessageModal
        open={supportMessagesOpen}
        onClose={() => setSupportMessagesOpen(false)}
        onNavigate={onNavigate}
      />

      <CompanyModal
        open={companyOpen}
        onClose={() => {
          setCompanyOpen(false);
          setManualTab(null);
        }}
      />
    </>
  );
};
