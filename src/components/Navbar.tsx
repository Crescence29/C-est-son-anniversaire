import React, { useState } from 'react';
import { AppLogo } from './AppLogo.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import {
  Bell,
  User,
  Shield,
  Briefcase,
  LogOut,
  Sparkles,
  Search,
  Check,
  ExternalLink,
  ChevronDown,
  Sun,
  Moon,
} from 'lucide-react';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string, param?: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const { user, logout, notifications, unreadNotifsCount, markNotificationAsRead, markAllNotificationsAsRead } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-fond/85 border-b border-black/5 dark:border-white/10 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center leading-none">
            <AppLogo size="sm" showText={false} onClick={() => onNavigate('home')} />
            <span className="text-[9px] text-violet/80 font-mono uppercase tracking-widest mt-1">
              Moments d’émotion
            </span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1.5">
          <button
            onClick={() => onNavigate('home')}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
              currentView === 'home'
                ? 'bg-violet text-white shadow-sm'
                : 'text-ink/80 hover:text-ink hover:bg-black/5 dark:hover:bg-white/10'
            }`}
          >
            Accueil
          </button>
          <button
            onClick={() => onNavigate('catalog')}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
              currentView === 'catalog' || currentView === 'service-detail'
                ? 'bg-violet text-white shadow-sm'
                : 'text-ink/80 hover:text-ink hover:bg-black/5 dark:hover:bg-white/10'
            }`}
          >
            Catalogue
          </button>

          {user && (
            <button
              onClick={() => onNavigate('account')}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                currentView === 'account' || currentView === 'order-detail'
                  ? 'bg-violet text-white shadow-sm'
                  : 'text-ink/80 hover:text-ink hover:bg-black/5 dark:hover:bg-white/10'
              }`}
            >
              Mes Commandes
            </button>
          )}

          {user?.role === 'staff' || user?.role === 'admin' ? (
            <button
              onClick={() => onNavigate('staff')}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 transition-all ${
                currentView === 'staff'
                  ? 'bg-violet text-white shadow-sm'
                  : 'text-violet font-semibold bg-violet/10 hover:bg-violet/15'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              Régie Staff
            </button>
          ) : null}

          {user?.role === 'admin' && (
            <button
              onClick={() => onNavigate('admin')}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 transition-all ${
                currentView === 'admin'
                  ? 'bg-gold-brand text-plum font-bold shadow-sm'
                  : 'text-ink font-semibold bg-gold-brand/20 hover:bg-gold-brand/30'
              }`}
            >
              <Shield className={`w-3.5 h-3.5 ${currentView === 'admin' ? 'text-plum' : 'text-ink'}`} />
              Admin
            </button>
          )}
        </nav>

        {/* Action Controls (Search, Notifications, Profile / Login) */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={toggleTheme}
            className="p-2 text-ink/70 hover:text-ink rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            title={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={() => onNavigate('catalog')}
            className="p-2 text-ink/70 hover:text-ink rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors hidden sm:inline-flex"
            title="Rechercher une prestation"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Notifications Dropdown */}
          {user && (
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifMenu(!showNotifMenu);
                  setShowUserMenu(false);
                }}
                className="relative p-2 text-ink/80 hover:text-ink rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifsCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-rose-brand text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    {unreadNotifsCount}
                  </span>
                )}
              </button>

              {showNotifMenu && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 glass-panel rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 border border-black/10 dark:border-white/10">
                  <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/10 mb-2">
                    <span className="font-serif font-bold text-sm text-ink">Notifications</span>
                    {unreadNotifsCount > 0 && (
                      <button
                        onClick={markAllNotificationsAsRead}
                        className="text-xs text-rose-brand hover:underline font-medium"
                      >
                        Tout marquer comme lu
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-2.5 divide-y divide-black/5 dark:divide-white/10">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-ink/60 text-center py-6">Aucune notification pour le moment.</p>
                    ) : (
                      notifications.slice(0, 5).map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => {
                            markNotificationAsRead(notif.id);
                            if (notif.link_url) {
                              setShowNotifMenu(false);
                              if (notif.link_url.startsWith('/account/orders/')) {
                                const id = notif.link_url.replace('/account/orders/', '');
                                onNavigate('order-detail', id);
                              } else {
                                onNavigate('account');
                              }
                            }
                          }}
                          className={`pt-2 text-left cursor-pointer transition-colors p-2 rounded-xl ${
                            notif.is_read ? 'opacity-70 hover:bg-black/5 dark:hover:bg-white/10' : 'bg-rose-500/10 hover:bg-rose-500/15'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-xs font-semibold text-ink">{notif.title}</h4>
                            {!notif.is_read && <span className="w-1.5 h-1.5 rounded-full bg-rose-brand shrink-0" />}
                          </div>
                          <p className="text-[11px] text-ink/75 line-clamp-2 mt-0.5">{notif.message}</p>
                          <span className="text-[9px] text-ink/50 font-mono mt-1 block">
                            {new Date(notif.created_at).toLocaleDateString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User Profile / Login Button */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowNotifMenu(false);
                }}
                className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-full glass-card hover:bg-white/80 dark:hover:bg-white/10 transition-all border border-black/10 dark:border-white/10 shadow-xs"
              >
                <img
                  src={user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                  alt={user.full_name}
                  className="w-7 h-7 rounded-full object-cover border border-violet/20"
                />
                <span className="text-xs font-medium text-ink hidden sm:inline max-w-[100px] truncate">
                  {user.full_name.split(' ')[0]}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-ink/60" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 glass-panel rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 border border-black/10 dark:border-white/10">
                  <div className="p-3 border-b border-black/5 dark:border-white/10 mb-1">
                    <div className="font-semibold text-xs text-ink truncate">{user.full_name}</div>
                    <div className="text-[11px] text-ink/60 truncate font-mono">{user.email}</div>
                    <div className="mt-1.5 inline-block">
                      <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full font-bold ${
                        user.role === 'admin' ? 'bg-gold-brand/20 text-gold-brand' : user.role === 'staff' ? 'bg-violet/20 text-violet' : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                      }`}>
                        Rôle : {user.role}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onNavigate('account');
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-ink hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors text-left"
                    >
                      <User className="w-3.5 h-3.5 text-violet" />
                      {user.is_super_admin
                        ? 'Espace Développeur'
                        : user.role === 'admin'
                        ? 'Espace Admin'
                        : user.role === 'staff'
                        ? 'Espace Staff'
                        : 'Espace Client'}
                    </button>

                    {(user.role === 'staff' || user.role === 'admin') && (
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onNavigate('staff');
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-ink hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors text-left font-medium"
                      >
                        <Briefcase className="w-3.5 h-3.5 text-violet" />
                        Dashboard Régie Staff
                      </button>
                    )}

                    {user.role === 'admin' && (
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onNavigate('admin');
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-ink hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors text-left font-semibold text-gold-brand"
                      >
                        <Shield className="w-3.5 h-3.5 text-gold-brand" />
                        Administration & Commissions
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                        onNavigate('home');
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors text-left"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Se déconnecter
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('login')}
                className="text-xs font-semibold text-ink px-3 py-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                Connexion
              </button>
              <button
                onClick={() => onNavigate('register')}
                className="btn-festive text-xs px-4 py-2"
              >
                S’inscrire
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
