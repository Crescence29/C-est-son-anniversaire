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

const CHIP_RADIUS = 24;
const NOTCH_RADIUS = 30;
const NOTCH_DEPTH = 28;
const NOTCH_CURVE = 22;

/**
 * Keeps the notch center far enough from both rounded ends of the bar that
 * its curves never collide with them. The chip/label must clamp through
 * this same function so they stay nested exactly in the notch it draws.
 */
function clampNotchX(width: number, height: number, notchX: number): number {
  const cr = height / 2;
  const min = cr + NOTCH_RADIUS + NOTCH_CURVE;
  const max = width - cr - NOTCH_RADIUS - NOTCH_CURVE;
  return Math.max(min, Math.min(max, notchX));
}

/**
 * The floating chip only needs to stay fully inside the bar — unlike the SVG
 * notch, it doesn't need extra clearance for a curve. On narrow phones with
 * 5 columns, the notch's wider clamp would otherwise drag the chip sideways
 * onto the neighboring tab's icon (e.g. Home riding onto Catalogue), so the
 * chip tracks the tab's true center independently.
 */
function clampChipX(width: number, chipX: number): number {
  return Math.max(CHIP_RADIUS, Math.min(width - CHIP_RADIUS, chipX));
}

/**
 * Builds the bar's outline as a single SVG path: a rounded pill whose top
 * edge dips into a smooth valley at `notchX`, cradling the floating chip.
 * `notchX` must already be clamped via `clampNotchX`.
 */
function buildNavPath(width: number, height: number, notchX: number): string {
  const cr = height / 2;
  const nx = notchX;

  return `
    M ${cr},0
    L ${nx - NOTCH_RADIUS - NOTCH_CURVE},0
    C ${nx - NOTCH_RADIUS - NOTCH_CURVE * 0.4},0 ${nx - NOTCH_RADIUS},${NOTCH_DEPTH * 0.9} ${nx - NOTCH_RADIUS * 0.55},${NOTCH_DEPTH}
    A ${NOTCH_RADIUS},${NOTCH_RADIUS} 0 0 0 ${nx + NOTCH_RADIUS * 0.55},${NOTCH_DEPTH}
    C ${nx + NOTCH_RADIUS},${NOTCH_DEPTH * 0.9} ${nx + NOTCH_RADIUS + NOTCH_CURVE * 0.4},0 ${nx + NOTCH_RADIUS + NOTCH_CURVE},0
    L ${width - cr},0
    A ${cr},${cr} 0 0 1 ${width - cr},${height}
    L ${cr},${height}
    A ${cr},${cr} 0 0 1 ${cr},0
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
  const [indicatorX, setIndicatorX] = useState<number | null>(null);
  const [chipX, setChipX] = useState<number | null>(null);
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

  const updateIndicator = () => {
    const btn = tabRefs.current[activeTab.key];
    const bar = barRef.current;
    if (!btn || !bar) return;
    const btnRect = btn.getBoundingClientRect();
    const barRect = bar.getBoundingClientRect();
    const center = btnRect.left - barRect.left + btnRect.width / 2;
    setIndicatorX(clampNotchX(barRect.width, barRect.height, center));
    setChipX(clampChipX(barRect.width, center));
    setBarSize({ width: barRect.width, height: barRect.height });
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
          {/* Hidden clip-path definition: the bar's own shape morphs to cradle the chip */}
          <svg className="absolute w-0 h-0">
            <clipPath id="liquid-nav-clip" clipPathUnits="userSpaceOnUse">
              <path
                ref={pathElRef}
                className="liquid-nav-path"
                d={ready ? buildNavPath(barSize.width, barSize.height, animatedXRef.current ?? indicatorX!) : undefined}
              />
            </clipPath>
          </svg>

          {/* Floating chip: the active icon, nested in the morphed notch */}
          {ready && (
            <div
              className="absolute w-12 h-12 rounded-full glass-card border border-white/70 dark:border-white/15 shadow-lg flex items-center justify-center text-cortex-red pointer-events-none liquid-follow"
              style={{ transform: `translateX(${(chipX ?? indicatorX)! - CHIP_RADIUS}px)`, top: -CHIP_RADIUS }}
            >
              {activeTab.renderIcon('', 'chip')}
            </div>
          )}

          {/* Label, crisp, sitting just below the bar under the active tab */}
          {ready && (
            <div
              className="absolute w-12 text-center pointer-events-none liquid-follow"
              style={{ transform: `translateX(${(chipX ?? indicatorX)! - CHIP_RADIUS}px)`, top: barSize.height + 4 }}
            >
              <span className="text-[9px] font-semibold text-cortex-red whitespace-nowrap">{activeTab.label}</span>
            </div>
          )}

          <div
            ref={barRef}
            className="glass-panel shadow-2xl px-2 py-1.5 border border-white/60 dark:border-white/10 pointer-events-auto grid grid-cols-5 items-center gap-0.5 relative"
            style={{ borderRadius: 9999, clipPath: ready ? 'url(#liquid-nav-clip)' : undefined }}
          >
            {liquidTabs.map((tab) => (
              <button
                key={tab.key}
                ref={(el) => { tabRefs.current[tab.key] = el; }}
                onClick={tab.onClick}
                className="flex items-center justify-center h-11 w-14 mx-auto rounded-full text-ink/55 hover:text-ink transition-colors"
              >
                {tab.renderIcon(`transition-opacity duration-200 ${tab.active ? 'opacity-0' : 'opacity-100'}`, 'row')}
              </button>
            ))}

            <button
              onClick={() => setMoreOpen(true)}
              className="flex flex-col items-center justify-center h-11 w-14 mx-auto rounded-full text-ink/55 hover:text-ink transition-colors"
              aria-label="Plus d’options"
            >
              <Menu className={ICON_SIZE} />
              <span className="text-[9px] font-medium mt-0.5">Menu</span>
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
