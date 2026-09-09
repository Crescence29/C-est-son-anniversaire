import React, { useState } from 'react';
import { motion } from 'framer-motion';
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
  renderIcon: (effectClassName: string) => React.ReactNode;
}

const ICON_SIZE = 'w-5 h-5';

export const MobileTabBar: React.FC<MobileTabBarProps> = ({ currentView, onNavigate }) => {
  const { user } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const [infoModal, setInfoModal] = useState<'help' | 'contact' | null>(null);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [supportMessagesOpen, setSupportMessagesOpen] = useState(false);
  // The company tab has no "page" of its own (it just opens a modal), so its
  // selected state is tracked manually instead of derived from currentView.
  const [manualTab, setManualTab] = useState<LiquidTabKey | null>(null);

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
      renderIcon: (effectClassName) => (
        <img
          src="/CORTEX.jpg"
          alt="Cortex Bénin TV"
          className={`w-7 h-7 rounded-full object-cover ${effectClassName}`}
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

  const goToReviews = () => {
    setMoreOpen(false);
    onNavigate('home');
    window.setTimeout(() => {
      document.getElementById('temoignages')?.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  };

  return (
    <>
      <div className="md:hidden fixed bottom-3 inset-x-0 z-40 px-4">
        <div className="max-w-md mx-auto">
          {/* Frosted-glass floating pill: no shape morphs and nothing slides —
              the active tab is signalled by a red glow + a soft pulsing ring
              around its icon, kept deliberately understated. */}
          <div className="flex items-center justify-between gap-0.5 bg-white/[0.07] backdrop-blur-xl border border-white/[0.14] rounded-full px-2 py-2 shadow-2xl shadow-black/40">
            {liquidTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={tab.onClick}
                className="flex flex-col items-center justify-center gap-1 h-12 w-14 rounded-full"
              >
                <span className="relative flex items-center justify-center w-6 h-6">
                  {tab.active && (
                    <span
                      className="absolute -inset-2 rounded-full border border-cortex-red/60 glass-pulse-ring"
                      aria-hidden="true"
                    />
                  )}
                  <motion.span
                    animate={{ scale: tab.active ? 1.1 : 1 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                    className={
                      tab.active
                        ? 'flex text-cortex-red drop-shadow-[0_0_7px_var(--cortex-red)]'
                        : 'flex text-white/55'
                    }
                  >
                    {tab.renderIcon('')}
                  </motion.span>
                </span>
                <span className={`text-[9px] font-medium ${tab.active ? 'text-cortex-red font-semibold' : 'text-white/55'}`}>
                  {tab.label}
                </span>
              </button>
            ))}

            <button
              onClick={() => setMoreOpen(true)}
              className="flex flex-col items-center justify-center gap-1 h-12 w-14 rounded-full text-white/55"
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
