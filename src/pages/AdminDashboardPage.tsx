import React, { useState, useEffect } from 'react';
import { User, Payment, Review, UserRole, UserStatus, Category, Service, ActivityLog, SiteSettings, FaqItem, SupportMessage } from '../types.ts';
import { api } from '../utils/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { RefreshLoadingOverlay } from '../components/RefreshLoadingOverlay.tsx';
import { AppLogo, refreshAppLogo } from '../components/AppLogo.tsx';
import { useRefreshProgress } from '../hooks/useRefreshProgress.ts';
import { DevSidebar, DevNavGroup } from '../components/dev-dashboard/DevSidebar.tsx';
import { DevTopbar } from '../components/dev-dashboard/DevTopbar.tsx';
import { KpiCard } from '../components/dev-dashboard/KpiCard.tsx';
import { ServiceStatusCard } from '../components/dev-dashboard/ServiceStatusCard.tsx';
import { SkeletonCard } from '../components/dev-dashboard/SkeletonCard.tsx';
import {
  Shield,
  Percent,
  Users,
  DollarSign,
  TrendingUp,
  Search,
  Check,
  X,
  Edit2,
  RefreshCw,
  Star,
  CheckCircle2,
  AlertTriangle,
  Grid3x3,
  Trash2,
  Plus,
  Crown,
  Activity,
  LogIn,
  UserPlus,
  ShieldAlert,
  Settings as SettingsIcon,
  LifeBuoy,
  MessageSquareHeart,
  Send,
  Ban,
} from 'lucide-react';

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  login_success: LogIn,
  login_failed: ShieldAlert,
  register: UserPlus,
  user_created: UserPlus,
  user_role_changed: Shield,
  user_status_changed: ShieldAlert,
  category_created: Grid3x3,
  category_updated: Grid3x3,
  service_created: Grid3x3,
  service_updated: Grid3x3,
  settings_updated: SettingsIcon,
  faq_created: LifeBuoy,
  support_message_sent: MessageSquareHeart,
  support_message_replied: Send,
  profile_updated: UserPlus,
};

const ACTIVITY_LABELS: Record<string, string> = {
  login_success: 'Connexion réussie',
  login_failed: 'Connexion échouée',
  register: 'Inscription',
  user_created: 'Compte créé par un admin',
  user_role_changed: 'Rôle modifié',
  user_status_changed: 'Statut modifié',
  category_created: 'Catégorie créée',
  category_updated: 'Catégorie modifiée',
  service_created: 'Prestation créée',
  service_updated: 'Prestation modifiée',
  settings_updated: 'Réglages du site modifiés',
  faq_created: 'Question FAQ ajoutée',
  support_message_sent: 'Nouveau message client',
  support_message_replied: 'Réponse envoyée à un client',
  profile_updated: 'Profil personnel modifié',
};

export const AdminDashboardPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = Boolean(currentUser?.is_super_admin);

  const [stats, setStats] = useState<any>(null);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activeTab, setActiveTab] = useState<'kpi' | 'commissions' | 'users' | 'transactions' | 'reviews' | 'catalog' | 'settings' | 'support' | 'developer'>('kpi');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const pendingReviewsCount = reviews.filter((r) => r.status === 'pending').length;

  const fetchActivityLogs = async () => {
    if (!isSuperAdmin) return;
    try {
      const res = await api.get<{ logs: ActivityLog[] }>('/admin/activity-logs');
      setActivityLogs(res.logs || []);
    } catch {
      // benign : silencieux pour ne pas interrompre le polling
    }
  };

  useEffect(() => {
    if (!isSuperAdmin) return;
    fetchActivityLogs();
    const interval = setInterval(fetchActivityLogs, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin]);

  // Catalog Management (Categories & Services)
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [catalogError, setCatalogError] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');
  const [newCatDescription, setNewCatDescription] = useState('');
  const [newCatImage, setNewCatImage] = useState('');
  const [newCatRate, setNewCatRate] = useState(15);
  const [showAddService, setShowAddService] = useState(false);
  const [newSrvCategoryId, setNewSrvCategoryId] = useState('');
  const [newSrvName, setNewSrvName] = useState('');
  const [newSrvSlug, setNewSrvSlug] = useState('');
  const [newSrvShortDesc, setNewSrvShortDesc] = useState('');
  const [newSrvDescription, setNewSrvDescription] = useState('');
  const [newSrvPrice, setNewSrvPrice] = useState(5000);
  const [newSrvImage, setNewSrvImage] = useState('');
  const [newSrvLiveBroadcast, setNewSrvLiveBroadcast] = useState(false);
  const [isSavingCatalog, setIsSavingCatalog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Commission Edit State
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editRateValue, setEditRateValue] = useState<number>(20);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Add User (staff/admin/client) State
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('staff');
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [userFormError, setUserFormError] = useState('');

  // Site Settings State
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState('');

  // Centre d'aide (FAQ) State
  const [faqItems, setFaqItems] = useState<FaqItem[]>([]);
  const [showAddFaq, setShowAddFaq] = useState(false);
  const [newFaqQuestion, setNewFaqQuestion] = useState('');
  const [newFaqAnswer, setNewFaqAnswer] = useState('');
  const [isSavingFaq, setIsSavingFaq] = useState(false);
  const [faqError, setFaqError] = useState('');

  // Avis & Suggestions State
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [isSendingReply, setIsSendingReply] = useState<string | null>(null);

  const fetchAdminData = async () => {
    try {
      setIsLoading(true);
      const [statsRes, comRes, usersRes, transRes, revRes, catRes, srvRes, settingsRes, faqRes, supportRes] = await Promise.all([
        api.get<{ stats: any }>('/admin/stats'),
        api.get<{ commissions: any[] }>('/admin/commissions'),
        api.get<{ users: User[] }>('/admin/users'),
        api.get<{ transactions: any[] }>('/admin/transactions'),
        api.get<{ reviews: Review[] }>('/admin/reviews'),
        api.get<{ categories: Category[] }>('/admin/categories'),
        api.get<{ services: Service[] }>('/services'),
        api.get<{ settings: SiteSettings }>('/admin/settings'),
        api.get<{ faq: FaqItem[] }>('/staff/faq'),
        api.get<{ messages: SupportMessage[] }>('/staff/support-messages'),
      ]);

      setStats(statsRes.stats || null);
      setCommissions(comRes.commissions || []);
      setUsers(usersRes.users || []);
      setTransactions(transRes.transactions || []);
      setReviews(revRes.reviews || []);
      setCategories(catRes.categories || []);
      setServices(srvRes.services || []);
      setSettings(settingsRes.settings || null);
      setFaqItems(faqRes.faq || []);
      setSupportMessages(supportRes.messages || []);
    } catch (err) {
      console.error('Error loading admin dashboard:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshState = useRefreshProgress();
  const activityRefreshState = useRefreshProgress();

  useEffect(() => {
    fetchAdminData().catch(() => {});
  }, []);

  const handleUpdateCommission = async (categoryId: string) => {
    try {
      await api.put(`/admin/commissions/${categoryId}`, { rate: editRateValue });
      setEditingCatId(null);
      setSaveSuccessMsg('Taux de commission mis à jour !');
      setTimeout(() => setSaveSuccessMsg(''), 3000);
      fetchAdminData();
    } catch (err: any) {
      alert(err?.message || 'Erreur lors de la mise à jour.');
    }
  };

  const handleUpdateUserRole = async (userId: string, role: UserRole) => {
    try {
      await api.put(`/admin/users/${userId}/role`, { role });
      fetchAdminData();
    } catch (err: any) {
      alert(err?.message || 'Erreur lors du changement de rôle.');
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserFormError('');

    try {
      setIsSavingUser(true);
      await api.post('/admin/users', {
        full_name: newUserName,
        email: newUserEmail,
        phone: newUserPhone,
        password: newUserPassword,
        role: newUserRole,
      });

      setNewUserName('');
      setNewUserEmail('');
      setNewUserPhone('');
      setNewUserPassword('');
      setNewUserRole('staff');
      setShowAddUser(false);
      fetchAdminData();
    } catch (err: any) {
      setUserFormError(err?.message || 'Erreur lors de la création du compte.');
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleSettingsField = <K extends keyof SiteSettings>(field: K, value: SiteSettings[K]) => {
    setSettings((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    try {
      setIsSavingSettings(true);
      await api.put('/admin/settings', settings);
      refreshAppLogo();
      setSettingsSuccessMsg('Réglages du site enregistrés !');
      setTimeout(() => setSettingsSuccessMsg(''), 3000);
      fetchAdminData();
    } catch (err: any) {
      alert(err?.message || 'Erreur lors de l’enregistrement des réglages.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const [isSavingLogo, setIsSavingLogo] = useState(false);
  const [logoSuccessMsg, setLogoSuccessMsg] = useState('');

  const handleSaveLogo = async () => {
    if (!settings) return;

    try {
      setIsSavingLogo(true);
      await api.put('/admin/settings', {
        logo_mode: settings.logo_mode,
        logo_text: settings.logo_text,
      });
      refreshAppLogo();
      setLogoSuccessMsg('Logo mis à jour !');
      setTimeout(() => setLogoSuccessMsg(''), 3000);
    } catch (err: any) {
      alert(err?.message || 'Erreur lors de l’enregistrement du logo.');
    } finally {
      setIsSavingLogo(false);
    }
  };

  const handleAddFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    setFaqError('');

    try {
      setIsSavingFaq(true);
      await api.post('/staff/faq', { question: newFaqQuestion, answer: newFaqAnswer });
      setNewFaqQuestion('');
      setNewFaqAnswer('');
      setShowAddFaq(false);
      fetchAdminData();
    } catch (err: any) {
      setFaqError(err?.message || 'Erreur lors de la création de la question.');
    } finally {
      setIsSavingFaq(false);
    }
  };

  const handleDeleteFaq = async (id: string) => {
    try {
      await api.delete(`/staff/faq/${id}`);
      fetchAdminData();
    } catch (err: any) {
      alert(err?.message || 'Erreur lors de la suppression.');
    }
  };

  const handleToggleFaqActive = async (item: FaqItem) => {
    try {
      await api.put(`/staff/faq/${item.id}`, { is_active: !item.is_active });
      fetchAdminData();
    } catch (err: any) {
      alert(err?.message || 'Erreur lors de la modification.');
    }
  };

  const handleSendReply = async (messageId: string) => {
    const reply = (replyDrafts[messageId] || '').trim();
    if (!reply) return;

    try {
      setIsSendingReply(messageId);
      await api.put(`/staff/support-messages/${messageId}/reply`, { reply });
      setReplyDrafts((prev) => ({ ...prev, [messageId]: '' }));
      fetchAdminData();
    } catch (err: any) {
      alert(err?.message || 'Erreur lors de l’envoi de la réponse.');
    } finally {
      setIsSendingReply(null);
    }
  };

  const handleToggleUserStatus = async (user: User) => {
    const nextStatus: UserStatus = user.status === 'active' ? 'suspended' : 'active';
    let reason: string | null = null;

    if (nextStatus === 'suspended') {
      reason = window.prompt(`Motif de la suspension de ${user.full_name} (visible par le client) :`);
      if (reason === null) return;
    }

    try {
      await api.put(`/admin/users/${user.id}/status`, { status: nextStatus, reason });
      fetchAdminData();
    } catch (err: any) {
      alert(err?.message || 'Erreur lors de la mise à jour du statut.');
    }
  };

  const handleBanUser = async (user: User) => {
    const reason = window.prompt(
      `Bannissement DÉFINITIF de ${user.full_name} — décision sans appel.\nMotif (visible par le client) :`
    );
    if (!reason || !reason.trim()) return;
    if (!window.confirm(`Confirmer le bannissement définitif de ${user.full_name} ? Cette action est irréversible.`)) return;

    try {
      await api.put(`/admin/users/${user.id}/ban`, { reason });
      fetchAdminData();
    } catch (err: any) {
      alert(err?.message || 'Erreur lors du bannissement.');
    }
  };

  const handleUpdateReviewStatus = async (reviewId: string, status: 'published' | 'hidden') => {
    try {
      await api.put(`/admin/reviews/${reviewId}/status`, { status });
      fetchAdminData();
    } catch (err: any) {
      alert(err?.message || 'Erreur lors de la mise à jour de l’avis.');
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatalogError('');

    try {
      setIsSavingCatalog(true);
      await api.post('/admin/categories', {
        name: newCatName,
        slug: newCatSlug,
        description: newCatDescription,
        image_url: newCatImage,
        commission_rate: newCatRate,
      });

      setNewCatName('');
      setNewCatSlug('');
      setNewCatDescription('');
      setNewCatImage('');
      setNewCatRate(15);
      setShowAddCategory(false);
      fetchAdminData();
    } catch (err: any) {
      setCatalogError(err?.message || 'Erreur lors de la création de la catégorie.');
    } finally {
      setIsSavingCatalog(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      await api.delete(`/admin/categories/${categoryId}`);
      fetchAdminData();
    } catch (err: any) {
      alert(err?.message || 'Erreur lors de la suppression.');
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatalogError('');

    try {
      setIsSavingCatalog(true);
      await api.post('/admin/services', {
        category_id: newSrvCategoryId,
        name: newSrvName,
        slug: newSrvSlug,
        description: newSrvDescription,
        short_description: newSrvShortDesc,
        price: newSrvPrice,
        image_url: newSrvImage,
        is_live_broadcast: newSrvLiveBroadcast,
      });

      setNewSrvCategoryId('');
      setNewSrvName('');
      setNewSrvSlug('');
      setNewSrvShortDesc('');
      setNewSrvDescription('');
      setNewSrvPrice(5000);
      setNewSrvImage('');
      setNewSrvLiveBroadcast(false);
      setShowAddService(false);
      fetchAdminData();
    } catch (err: any) {
      setCatalogError(err?.message || 'Erreur lors de la création de la prestation.');
    } finally {
      setIsSavingCatalog(false);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    try {
      await api.delete(`/admin/services/${serviceId}`);
      fetchAdminData();
    } catch (err: any) {
      alert(err?.message || 'Erreur lors de la suppression.');
    }
  };

  const handleToggleServiceAvailability = async (service: Service) => {
    try {
      await api.put(`/admin/services/${service.id}`, { is_available: !service.is_available });
      fetchAdminData();
    } catch (err: any) {
      alert(err?.message || 'Erreur lors de la mise à jour.');
    }
  };

  const openSupportCount = supportMessages.filter((m) => m.status === 'open').length;

  const navGroups: DevNavGroup[] = [
    {
      title: 'Tableau de bord',
      items: [{ key: 'kpi', label: 'Vue Synthèse', icon: TrendingUp }],
    },
    {
      title: 'Gestion',
      items: [
        { key: 'commissions', label: `Commissions (${commissions.length})`, icon: Percent },
        { key: 'users', label: `Utilisateurs & Rôles (${users.length})`, icon: Users },
        { key: 'catalog', label: `Catalogue (${categories.length}/${services.length})`, icon: Grid3x3 },
        { key: 'reviews', label: `Avis clients (${reviews.length})`, icon: Star, badge: pendingReviewsCount },
      ],
    },
    {
      title: 'Finances',
      items: [{ key: 'transactions', label: `Journal Financier (${transactions.length})`, icon: DollarSign }],
    },
    {
      title: 'Site',
      items: [
        { key: 'settings', label: 'Réglages du site', icon: SettingsIcon },
        { key: 'support', label: 'Avis & Suggestions', icon: MessageSquareHeart, badge: openSupportCount },
      ],
    },
    ...(isSuperAdmin
      ? [{ title: 'Développeur', items: [{ key: 'developer', label: 'Développeur', icon: Crown }] }]
      : []),
  ];

  const TAB_TITLES: Record<typeof activeTab, { title: string; subtitle: string }> = {
    kpi: { title: 'Vue Synthèse', subtitle: 'Chiffres clés et intégrité de la plateforme' },
    commissions: { title: 'Gestion des Commissions', subtitle: 'Taux appliqués par catégorie de prestation' },
    users: { title: 'Utilisateurs & Rôles', subtitle: 'Comptes, rôles et statuts' },
    transactions: { title: 'Journal Financier', subtitle: 'Historique des transactions' },
    reviews: { title: 'Avis clients', subtitle: 'Modération des avis publiés' },
    catalog: { title: 'Catalogue', subtitle: 'Catégories, prestations et centre d’aide' },
    settings: { title: 'Réglages du site', subtitle: 'Contenu, blocs et réseaux sociaux' },
    support: { title: 'Avis & Suggestions', subtitle: 'Messages reçus des clients' },
    developer: { title: 'Développeur', subtitle: 'Identité visuelle et journal d’activité' },
  };

  return (
    <div className="dev-dashboard dark flex min-h-screen">
      <DevSidebar
        groups={navGroups}
        activeKey={activeTab}
        onSelect={(key) => setActiveTab(key as typeof activeTab)}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        brand={<AppLogo size="xs" showText />}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <DevTopbar
          title={TAB_TITLES[activeTab].title}
          subtitle={TAB_TITLES[activeTab].subtitle}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          onRefresh={() => refreshState.run(fetchAdminData)}
          user={currentUser}
          roleLabel={isSuperAdmin ? 'Développeur' : 'Admin'}
        />

        <main className="flex-1 overflow-y-auto dd-scrollbar p-4 sm:p-6 space-y-6">
      {saveSuccessMsg && (
        <div
          className="p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 dd-fade-in"
          style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399' }}
        >
          <CheckCircle2 className="w-4 h-4" />
          {saveSuccessMsg}
        </div>
      )}

      {/* KPI Cards */}
      {isLoading && !stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} lines={1} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Chiffre d'affaires Total" value={`${(stats?.totalRevenue ?? 0).toLocaleString()} FCFA`} icon={TrendingUp} accent="accent" />
          <KpiCard label="Commissions Perçues" value={`${(stats?.totalCommissions ?? 0).toLocaleString()} FCFA`} icon={Percent} accent="amber" />
          <KpiCard label="Commandes Totales" value={stats?.totalOrdersCount ?? 0} icon={DollarSign} accent="emerald" />
          <KpiCard label="Utilisateurs Inscrits" value={users.length} icon={Users} accent="rose" />
        </div>
      )}

      {/* TAB 1: COMMISSIONS MANAGEMENT */}
      {activeTab === 'commissions' && (
        <div className="glass-card rounded-2xl p-6 border border-black/5 dark:border-white/10 space-y-4">
          <div>
            <h3 className="font-serif font-bold text-base text-ink">
              Taux de commission par catégorie de prestation
            </h3>
            <p className="text-xs text-ink/70 mt-0.5">
              Ces pourcentages sont automatiquement prélevés lors de chaque commande réglée.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-black/10 dark:border-white/10 text-ink/60 font-mono">
                  <th className="pb-3">Catégorie</th>
                  <th className="pb-3">Taux de Commission</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {commissions.map((c) => (
                  <tr key={c.category_id} className="hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                    <td className="py-3 font-semibold text-ink text-sm">
                      {c.category_name}
                    </td>
                    <td className="py-3">
                      {editingCatId === c.category_id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={editRateValue}
                            onChange={(e) => setEditRateValue(Number(e.target.value))}
                            className="w-20 p-1.5 rounded-lg bg-white dark:bg-white/10 border border-black/20 dark:border-white/15 text-xs font-mono font-bold"
                          />
                          <span className="font-mono">%</span>
                        </div>
                      ) : (
                        <span className="font-mono text-sm font-bold text-violet bg-violet/10 px-3 py-1 rounded-full">
                          {c.rate}%
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      {editingCatId === c.category_id ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleUpdateCommission(c.category_id)}
                            className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700"
                          >
                            Valider
                          </button>
                          <button
                            onClick={() => setEditingCatId(null)}
                            className="px-2 py-1 rounded-lg bg-black/10 dark:bg-white/10 text-ink"
                          >
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingCatId(c.category_id);
                            setEditRateValue(c.rate);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-ink font-semibold inline-flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3" />
                          Modifier
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="glass-card rounded-2xl p-6 border border-black/5 dark:border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-base text-ink">
              Comptes & Attribution des Rôles
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-ink/60">{users.length} comptes</span>
              <button
                onClick={() => setShowAddUser(!showAddUser)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-violet/10 hover:bg-violet/20 text-violet text-xs font-bold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Ajouter un utilisateur
              </button>
            </div>
          </div>

          {userFormError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 text-xs font-medium">
              {userFormError}
            </div>
          )}

          {showAddUser && (
            <form onSubmit={handleAddUser} className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-white/60 dark:bg-white/10 border border-black/5 dark:border-white/10">
              <input type="text" required value={newUserName} onChange={(e) => setNewUserName(e.target.value)} placeholder="Nom complet" className="p-2.5 rounded-xl bg-white dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs text-ink" />
              <input type="tel" required value={newUserPhone} onChange={(e) => setNewUserPhone(e.target.value)} placeholder="Téléphone (+225...)" className="p-2.5 rounded-xl bg-white dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs font-mono text-ink" />
              <input type="email" required value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="Adresse email" className="p-2.5 rounded-xl bg-white dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs font-mono text-ink" />
              <input type="password" required minLength={6} value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} placeholder="Mot de passe (6 caractères min.)" className="p-2.5 rounded-xl bg-white dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs text-ink" />
              <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value as UserRole)} className="p-2.5 rounded-xl bg-white dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs font-semibold text-ink sm:col-span-2">
                <option value="staff">Staff Régie</option>
                <option value="admin">Admin</option>
                <option value="client">Client</option>
              </select>
              <button type="submit" disabled={isSavingUser} className="btn-festive text-xs py-2.5 sm:col-span-2 disabled:opacity-60">
                {isSavingUser ? 'Création...' : 'Créer le compte'}
              </button>
            </form>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-black/10 dark:border-white/10 text-ink/60 font-mono">
                  <th className="pb-3">Nom & Email</th>
                  <th className="pb-3">Téléphone</th>
                  <th className="pb-3">Rôle Système</th>
                  <th className="pb-3">Statut</th>
                  <th className="pb-3 text-right">Action Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                    <td className="py-3">
                      <div className="font-bold text-ink">{u.full_name}</div>
                      <div className="text-[11px] text-ink/60 font-mono">{u.email}</div>
                    </td>
                    <td className="py-3 font-mono">{u.phone}</td>
                    <td className="py-3">
                      <select
                        value={u.role}
                        onChange={(e) => handleUpdateUserRole(u.id, e.target.value as UserRole)}
                        className="bg-white/80 dark:bg-white/10 border border-black/10 dark:border-white/10 rounded-lg px-2.5 py-1 text-xs font-semibold text-ink"
                      >
                        <option value="client">Client</option>
                        <option value="staff">Staff Régie</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="py-3">
                      <span
                        className={`font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                          u.is_banned
                            ? 'bg-red-700/30 text-red-800 dark:text-red-300'
                            : u.status === 'active'
                            ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                            : 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        {u.is_banned ? 'banni' : u.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {!u.is_banned && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleToggleUserStatus(u)}
                            className={`text-xs px-3 py-1 rounded-lg font-semibold transition-all ${
                              u.status === 'active'
                                ? 'bg-red-500/10 text-red-600 hover:bg-red-500/20'
                                : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20'
                            }`}
                          >
                            {u.status === 'active' ? 'Suspendre' : 'Réactiver'}
                          </button>
                          {!u.is_super_admin && (
                            <button
                              onClick={() => handleBanUser(u)}
                              title="Bannir définitivement (sans appel)"
                              className="flex items-center gap-1 text-xs px-3 py-1 rounded-lg font-semibold bg-red-700/10 text-red-700 hover:bg-red-700/20 transition-all"
                            >
                              <Ban className="w-3 h-3" />
                              Bannir
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: FINANCIAL TRANSACTIONS */}
      {activeTab === 'transactions' && (
        <div className="glass-card rounded-2xl p-6 border border-black/5 dark:border-white/10 space-y-4">
          <h3 className="font-serif font-bold text-base text-ink">
            Historique des Paiements Mobile Money
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-black/10 dark:border-white/10 text-ink/60 font-mono">
                  <th className="pb-3">Réf. Transaction</th>
                  <th className="pb-3">Opérateur</th>
                  <th className="pb-3">Client</th>
                  <th className="pb-3">Montant</th>
                  <th className="pb-3">Statut</th>
                  <th className="pb-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 font-mono">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                    <td className="py-3 font-bold text-ink">{tx.provider_reference}</td>
                    <td className="py-3 uppercase text-violet font-semibold">{tx.provider}</td>
                    <td className="py-3 font-sans font-medium">{tx.user_name}</td>
                    <td className="py-3 font-bold text-ink">
                      {tx.amount.toLocaleString()} {tx.currency}
                    </td>
                    <td className="py-3">
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                          tx.status === 'success'
                            ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                            : 'bg-red-500/20 text-red-700 dark:text-red-400'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-3 text-right text-ink/60">
                      {new Date(tx.created_at).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: CATALOG MANAGEMENT (Categories & Services) */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          {catalogError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 text-xs font-medium">
              {catalogError}
            </div>
          )}

          {/* Categories */}
          <div className="glass-card rounded-2xl p-6 border border-black/5 dark:border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-base text-ink">
                Catégories ({categories.length})
              </h3>
              <button
                onClick={() => setShowAddCategory(!showAddCategory)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-violet/10 hover:bg-violet/20 text-violet text-xs font-bold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Nouvelle catégorie
              </button>
            </div>

            {showAddCategory && (
              <form onSubmit={handleAddCategory} className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-white/60 dark:bg-white/10 border border-black/5 dark:border-white/10">
                <input type="text" required value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Nom de la catégorie" className="p-2.5 rounded-xl bg-white dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs text-ink" />
                <input type="text" required value={newCatSlug} onChange={(e) => setNewCatSlug(e.target.value)} placeholder="slug-url" className="p-2.5 rounded-xl bg-white dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs font-mono text-ink" />
                <input type="text" required value={newCatImage} onChange={(e) => setNewCatImage(e.target.value)} placeholder="URL de l'image" className="p-2.5 rounded-xl bg-white dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs font-mono text-ink sm:col-span-2" />
                <textarea required value={newCatDescription} onChange={(e) => setNewCatDescription(e.target.value)} placeholder="Description" rows={2} className="p-2.5 rounded-xl bg-white dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs text-ink sm:col-span-2" />
                <div className="flex items-center gap-2">
                  <label className="text-xs text-ink/70">Commission :</label>
                  <input type="number" min={0} max={100} value={newCatRate} onChange={(e) => setNewCatRate(Number(e.target.value))} className="w-20 p-2 rounded-lg bg-white dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs font-mono" />
                  <span className="text-xs">%</span>
                </div>
                <button type="submit" disabled={isSavingCatalog} className="btn-festive text-xs py-2.5 disabled:opacity-60">
                  {isSavingCatalog ? 'Création...' : 'Créer la catégorie'}
                </button>
              </form>
            )}

            <div className="space-y-2">
              {categories.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-white/60 dark:bg-white/10 border border-black/5 dark:border-white/10">
                  <div>
                    <span className="font-semibold text-sm text-ink">{c.name}</span>
                    <span className="text-[11px] text-ink/60 font-mono ml-2">{c.slug} • {c.commission_rate}%</span>
                  </div>
                  <button
                    onClick={() => handleDeleteCategory(c.id)}
                    className="p-1.5 rounded-lg text-red-600 hover:bg-red-500/10 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Services */}
          <div className="glass-card rounded-2xl p-6 border border-black/5 dark:border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-base text-ink">
                Prestations ({services.length})
              </h3>
              <button
                onClick={() => setShowAddService(!showAddService)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-violet/10 hover:bg-violet/20 text-violet text-xs font-bold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Nouvelle prestation
              </button>
            </div>

            {showAddService && (
              <form onSubmit={handleAddService} className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-white/60 dark:bg-white/10 border border-black/5 dark:border-white/10">
                <select required value={newSrvCategoryId} onChange={(e) => setNewSrvCategoryId(e.target.value)} className="p-2.5 rounded-xl bg-white dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs text-ink sm:col-span-2">
                  <option value="">Choisir une catégorie...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <input type="text" required value={newSrvName} onChange={(e) => setNewSrvName(e.target.value)} placeholder="Nom de la prestation" className="p-2.5 rounded-xl bg-white dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs text-ink" />
                <input type="text" required value={newSrvSlug} onChange={(e) => setNewSrvSlug(e.target.value)} placeholder="slug-url" className="p-2.5 rounded-xl bg-white dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs font-mono text-ink" />
                <input type="text" required value={newSrvShortDesc} onChange={(e) => setNewSrvShortDesc(e.target.value)} placeholder="Description courte" className="p-2.5 rounded-xl bg-white dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs text-ink sm:col-span-2" />
                <textarea required value={newSrvDescription} onChange={(e) => setNewSrvDescription(e.target.value)} placeholder="Description complète" rows={2} className="p-2.5 rounded-xl bg-white dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs text-ink sm:col-span-2" />
                <input type="text" required value={newSrvImage} onChange={(e) => setNewSrvImage(e.target.value)} placeholder="URL de l'image" className="p-2.5 rounded-xl bg-white dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs font-mono text-ink sm:col-span-2" />
                <div className="flex items-center gap-2">
                  <label className="text-xs text-ink/70">Prix :</label>
                  <input type="number" min={0} required value={newSrvPrice} onChange={(e) => setNewSrvPrice(Number(e.target.value))} className="w-28 p-2 rounded-lg bg-white dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs font-mono" />
                  <span className="text-xs">FCFA</span>
                </div>
                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs text-ink sm:col-span-2 cursor-pointer">
                  <input type="checkbox" checked={newSrvLiveBroadcast} onChange={(e) => setNewSrvLiveBroadcast(e.target.checked)} className="w-3.5 h-3.5" />
                  <span>Diffusion en direct <span className="text-ink/50">(bientôt disponible)</span></span>
                </label>
                <button type="submit" disabled={isSavingCatalog} className="btn-festive text-xs py-2.5 disabled:opacity-60">
                  {isSavingCatalog ? 'Création...' : 'Créer la prestation'}
                </button>
              </form>
            )}

            <div className="space-y-2">
              {services.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-white/60 dark:bg-white/10 border border-black/5 dark:border-white/10">
                  <div>
                    <span className="font-semibold text-sm text-ink">{s.name}</span>
                    <span className="text-[11px] text-ink/60 font-mono ml-2">
                      {s.category_name} • {s.price.toLocaleString()} {s.currency}
                    </span>
                    <span className={`ml-2 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${s.is_available ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-red-500/20 text-red-700 dark:text-red-400'}`}>
                      {s.is_available ? 'Disponible' : 'Indisponible'}
                    </span>
                    {s.is_live_broadcast && (
                      <span className="ml-2 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-violet/20 text-violet">
                        Direct (bientôt)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleToggleServiceAvailability(s)}
                      className="px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-ink text-[11px] font-semibold transition-colors"
                    >
                      {s.is_available ? 'Désactiver' : 'Activer'}
                    </button>
                    <button
                      onClick={() => handleDeleteService(s.id)}
                      className="p-1.5 rounded-lg text-red-600 hover:bg-red-500/10 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Centre d'aide (FAQ) */}
          <div className="glass-card rounded-2xl p-6 border border-black/5 dark:border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-base text-ink">
                Centre d'aide (FAQ) ({faqItems.length})
              </h3>
              <button
                onClick={() => setShowAddFaq(!showAddFaq)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-violet/10 hover:bg-violet/20 text-violet text-xs font-bold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Nouvelle question
              </button>
            </div>

            {faqError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 text-xs font-medium">
                {faqError}
              </div>
            )}

            {showAddFaq && (
              <form onSubmit={handleAddFaq} className="space-y-3 p-4 rounded-xl bg-white/60 dark:bg-white/10 border border-black/5 dark:border-white/10">
                <input type="text" required value={newFaqQuestion} onChange={(e) => setNewFaqQuestion(e.target.value)} placeholder="Question" className="w-full p-2.5 rounded-xl bg-white dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs text-ink" />
                <textarea required value={newFaqAnswer} onChange={(e) => setNewFaqAnswer(e.target.value)} placeholder="Réponse" rows={3} className="w-full p-2.5 rounded-xl bg-white dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs text-ink" />
                <button type="submit" disabled={isSavingFaq} className="btn-festive text-xs py-2.5 w-full disabled:opacity-60">
                  {isSavingFaq ? 'Ajout...' : 'Ajouter la question'}
                </button>
              </form>
            )}

            <div className="space-y-2">
              {faqItems.map((item) => (
                <div key={item.id} className="p-3 rounded-xl bg-white/60 dark:bg-white/10 border border-black/5 dark:border-white/10">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-sm text-ink block">{item.question}</span>
                      <span className="text-[11px] text-ink/60">{item.answer}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleToggleFaqActive(item)}
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                          item.is_active ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-red-500/20 text-red-700 dark:text-red-400'
                        }`}
                      >
                        {item.is_active ? 'Visible' : 'Masquée'}
                      </button>
                      <button
                        onClick={() => handleDeleteFaq(item.id)}
                        className="p-1.5 rounded-lg text-red-600 hover:bg-red-500/10 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: AVIS & SUGGESTIONS */}
      {activeTab === 'support' && (
        <div className="glass-card rounded-2xl p-6 border border-black/5 dark:border-white/10 space-y-4">
          <h3 className="font-serif font-bold text-base text-ink flex items-center gap-2">
            <MessageSquareHeart className="w-4 h-4 text-rose-brand" />
            Avis & Suggestions des clients
          </h3>

          {supportMessages.length === 0 ? (
            <p className="text-xs text-ink/60 text-center py-6">Aucun message reçu pour le moment.</p>
          ) : (
            <div className="space-y-3">
              {supportMessages.map((m) => (
                <div key={m.id} className="p-4 rounded-xl bg-white/70 dark:bg-white/10 border border-black/5 dark:border-white/10 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="font-serif font-bold text-sm text-ink">{m.subject}</span>
                      <span className="text-[11px] text-ink/60 font-mono block">
                        {m.user_name} • {m.user_email} {m.user_phone ? `• ${m.user_phone}` : ''}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        m.status === 'answered'
                          ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                          : 'bg-amber-500/20 text-amber-700'
                      }`}
                    >
                      {m.status === 'answered' ? 'Répondu' : 'En attente'}
                    </span>
                  </div>

                  <p className="text-xs text-ink/80 font-sans">{m.message}</p>

                  {m.reply ? (
                    <div className="p-2.5 rounded-lg bg-violet/10 border border-violet/20">
                      <span className="text-[10px] font-mono uppercase text-violet font-semibold block mb-0.5">
                        Réponse de {m.replied_by_name} :
                      </span>
                      <p className="text-xs text-ink/80">{m.reply}</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={replyDrafts[m.id] || ''}
                        onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [m.id]: e.target.value }))}
                        placeholder="Votre réponse..."
                        className="flex-1 p-2 rounded-lg bg-white dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs text-ink"
                      />
                      <button
                        onClick={() => handleSendReply(m.id)}
                        disabled={isSendingReply === m.id}
                        className="flex items-center gap-1 px-3 py-2 rounded-lg bg-violet text-white text-[11px] font-bold hover:bg-violet/90 transition-colors disabled:opacity-60"
                      >
                        <Send className="w-3 h-3" />
                        {isSendingReply === m.id ? 'Envoi...' : 'Répondre'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: SITE SETTINGS (contenu de la page d'accueil, blocs, réseaux sociaux) */}
      {activeTab === 'settings' && settings && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          {settingsSuccessMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 text-xs font-bold animate-in fade-in flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {settingsSuccessMsg}
            </div>
          )}

          <div className="glass-card rounded-2xl p-6 border border-black/5 dark:border-white/10 space-y-4">
            <h3 className="font-serif font-bold text-base text-ink">Section d'accueil (Hero)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input type="text" value={settings.hero_title_line1} onChange={(e) => handleSettingsField('hero_title_line1', e.target.value)} placeholder="Titre (ligne 1)" className="p-2.5 rounded-xl bg-white/80 dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs text-ink" />
              <input type="text" value={settings.hero_title_line2} onChange={(e) => handleSettingsField('hero_title_line2', e.target.value)} placeholder="Titre (ligne 2, en dégradé)" className="p-2.5 rounded-xl bg-white/80 dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs text-ink" />
              <textarea value={settings.hero_subtitle} onChange={(e) => handleSettingsField('hero_subtitle', e.target.value)} placeholder="Sous-titre" rows={2} className="p-2.5 rounded-xl bg-white/80 dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs text-ink sm:col-span-2" />
              <input type="text" value={settings.hero_cta_primary_label} onChange={(e) => handleSettingsField('hero_cta_primary_label', e.target.value)} placeholder="Texte bouton principal" className="p-2.5 rounded-xl bg-white/80 dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs text-ink" />
              <input type="text" value={settings.hero_cta_secondary_label} onChange={(e) => handleSettingsField('hero_cta_secondary_label', e.target.value)} placeholder="Texte bouton secondaire" className="p-2.5 rounded-xl bg-white/80 dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs text-ink" />
              <input type="text" value={settings.trust_rating_value} onChange={(e) => handleSettingsField('trust_rating_value', e.target.value)} placeholder="Note (ex: 4.0 / 5)" className="p-2.5 rounded-xl bg-white/80 dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs font-mono text-ink" />
              <input type="text" value={settings.trust_rating_suffix} onChange={(e) => handleSettingsField('trust_rating_suffix', e.target.value)} placeholder="Précision (ex: (100+ jubilaires émus))" className="p-2.5 rounded-xl bg-white/80 dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs text-ink" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-ink/70">Images du carrousel (4 max, URL)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[0, 1, 2, 3].map((idx) => (
                  <input
                    key={idx}
                    type="text"
                    value={settings.hero_images[idx] || ''}
                    onChange={(e) => {
                      const next = [...settings.hero_images];
                      next[idx] = e.target.value;
                      handleSettingsField('hero_images', next.filter((v) => v));
                    }}
                    placeholder={`Image ${idx + 1} (URL ou /fichier.jpg)`}
                    className="p-2.5 rounded-xl bg-white/80 dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs font-mono text-ink"
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-black/5 dark:border-white/10 space-y-4">
            <h3 className="font-serif font-bold text-base text-ink">Blocs de la page d'accueil</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white/80 dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs text-ink cursor-pointer">
                <input type="checkbox" checked={settings.show_videos_section} onChange={(e) => handleSettingsField('show_videos_section', e.target.checked)} className="w-3.5 h-3.5" />
                <span>Moments Magiques (vidéos)</span>
              </label>
              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white/80 dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs text-ink cursor-pointer">
                <input type="checkbox" checked={settings.show_steps_section} onChange={(e) => handleSettingsField('show_steps_section', e.target.checked)} className="w-3.5 h-3.5" />
                <span>Comment ça marche (4 étapes)</span>
              </label>
              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white/80 dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs text-ink cursor-pointer">
                <input type="checkbox" checked={settings.show_testimonials_section} onChange={(e) => handleSettingsField('show_testimonials_section', e.target.checked)} className="w-3.5 h-3.5" />
                <span>Témoignages clients</span>
              </label>
              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white/80 dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs text-ink cursor-pointer sm:col-span-3">
                <input type="checkbox" checked={settings.show_bottom_cta_section} onChange={(e) => handleSettingsField('show_bottom_cta_section', e.target.checked)} className="w-3.5 h-3.5" />
                <span>Bandeau d'appel à l'action (bas de page)</span>
              </label>
            </div>

            {settings.show_bottom_cta_section && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-black/5 dark:border-white/10">
                <input type="text" value={settings.bottom_cta_title} onChange={(e) => handleSettingsField('bottom_cta_title', e.target.value)} placeholder="Titre du bandeau" className="p-2.5 rounded-xl bg-white/80 dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs text-ink sm:col-span-2" />
                <textarea value={settings.bottom_cta_subtitle} onChange={(e) => handleSettingsField('bottom_cta_subtitle', e.target.value)} placeholder="Sous-titre du bandeau" rows={2} className="p-2.5 rounded-xl bg-white/80 dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs text-ink sm:col-span-2" />
                <input type="text" value={settings.bottom_cta_button_label} onChange={(e) => handleSettingsField('bottom_cta_button_label', e.target.value)} placeholder="Texte du bouton" className="p-2.5 rounded-xl bg-white/80 dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs text-ink" />
              </div>
            )}
          </div>

          <div className="glass-card rounded-2xl p-6 border border-black/5 dark:border-white/10 space-y-4">
            <h3 className="font-serif font-bold text-base text-ink">Réseaux sociaux</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input type="text" value={settings.social_whatsapp} onChange={(e) => handleSettingsField('social_whatsapp', e.target.value)} placeholder="Lien WhatsApp" className="p-2.5 rounded-xl bg-white/80 dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs font-mono text-ink" />
              <input type="text" value={settings.social_facebook} onChange={(e) => handleSettingsField('social_facebook', e.target.value)} placeholder="Lien Facebook" className="p-2.5 rounded-xl bg-white/80 dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs font-mono text-ink" />
              <input type="text" value={settings.social_youtube} onChange={(e) => handleSettingsField('social_youtube', e.target.value)} placeholder="Lien YouTube" className="p-2.5 rounded-xl bg-white/80 dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs font-mono text-ink" />
              <input type="text" value={settings.social_tiktok} onChange={(e) => handleSettingsField('social_tiktok', e.target.value)} placeholder="Lien TikTok" className="p-2.5 rounded-xl bg-white/80 dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs font-mono text-ink" />
              <input type="text" value={settings.social_linkedin} onChange={(e) => handleSettingsField('social_linkedin', e.target.value)} placeholder="Lien LinkedIn" className="p-2.5 rounded-xl bg-white/80 dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs font-mono text-ink" />
              <input type="text" value={settings.social_live_stream} onChange={(e) => handleSettingsField('social_live_stream', e.target.value)} placeholder="Lien de diffusion en direct (radio/TV)" className="p-2.5 rounded-xl bg-white/80 dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs font-mono text-ink" />
            </div>
            <p className="text-[11px] text-ink/50 -mt-1">
              Le lien de diffusion en direct fait apparaître le bouton "Suivre le direct" sur la page d'accueil. Laissez vide pour le masquer.
            </p>
          </div>

          <button type="submit" disabled={isSavingSettings} className="btn-festive text-xs px-6 py-3 disabled:opacity-60">
            {isSavingSettings ? 'Enregistrement...' : 'Enregistrer les réglages'}
          </button>
        </form>
      )}

      {/* TAB: REVIEWS MODERATION */}
      {activeTab === 'reviews' && (
        <div className="glass-card rounded-2xl p-6 border border-black/5 dark:border-white/10 space-y-4">
          <h3 className="font-serif font-bold text-base text-ink">
            Modération des avis clients
          </h3>

          {reviews.length === 0 ? (
            <p className="text-xs text-ink/60 text-center py-6">Aucun avis pour le moment.</p>
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="p-4 rounded-xl bg-white/70 dark:bg-white/10 border border-black/5 dark:border-white/10 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-serif font-bold text-sm text-ink">{r.user_name}</span>
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                            r.status === 'published'
                              ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                              : r.status === 'hidden'
                              ? 'bg-red-500/20 text-red-700 dark:text-red-400'
                              : 'bg-amber-500/20 text-amber-700'
                          }`}
                        >
                          {r.status}
                        </span>
                      </div>
                      <span className="text-[11px] text-ink/60 font-mono">{r.service_name}</span>
                    </div>
                    <div className="flex items-center text-gold-brand shrink-0">
                      {[...Array(r.rating)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-current" />
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-ink/80 italic font-sans">« {r.comment} »</p>

                  <div className="flex items-center gap-2 pt-1">
                    {r.status !== 'published' && (
                      <button
                        onClick={() => handleUpdateReviewStatus(r.id, 'published')}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-colors"
                      >
                        <Check className="w-3 h-3" />
                        Publier
                      </button>
                    )}
                    {r.status !== 'hidden' && (
                      <button
                        onClick={() => handleUpdateReviewStatus(r.id, 'hidden')}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 text-[11px] font-bold transition-colors"
                      >
                        <X className="w-3 h-3" />
                        Masquer
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: DEVELOPER - LOGO IDENTITY + ACTIVITY LOG */}
      {isSuperAdmin && activeTab === 'developer' && (
        <div className="space-y-6">
          {/* Identité visuelle (logo) */}
          <div className="glass-card rounded-2xl p-6 border border-gold-brand/30 space-y-4">
            <div>
              <h3 className="font-serif font-bold text-base text-ink flex items-center gap-2">
                <Crown className="w-4 h-4 text-gold-brand" />
                Identité visuelle
              </h3>
              <p className="text-xs text-ink/70 mt-0.5">
                Remplacez le logo image par le nom de la marque, partout dans l'application.
              </p>
            </div>

            {logoSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {logoSuccessMsg}
              </div>
            )}

            {settings && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSettingsField('logo_mode', 'image')}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                      settings.logo_mode === 'image' ? 'bg-gold-brand text-plum shadow-md' : 'bg-black/5 dark:bg-white/10 text-ink/70'
                    }`}
                  >
                    Logo image
                  </button>
                  <button
                    onClick={() => handleSettingsField('logo_mode', 'text')}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                      settings.logo_mode === 'text' ? 'bg-gold-brand text-plum shadow-md' : 'bg-black/5 dark:bg-white/10 text-ink/70'
                    }`}
                  >
                    Nom de marque (texte)
                  </button>
                </div>

                {settings.logo_mode === 'text' && (
                  <input
                    type="text"
                    value={settings.logo_text}
                    onChange={(e) => handleSettingsField('logo_text', e.target.value)}
                    placeholder="Nom affiché à la place du logo"
                    className="w-full p-2.5 rounded-xl bg-white/80 dark:bg-white/10 border border-black/10 dark:border-white/10 text-xs text-ink"
                  />
                )}

                <div className="flex items-center justify-between p-3 rounded-xl bg-white/60 dark:bg-white/10 border border-black/5 dark:border-white/10">
                  <span className="text-[10px] font-mono uppercase text-ink/50">Aperçu</span>
                  {settings.logo_mode === 'text' ? (
                    <span className="font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-rose-brand to-gold-brand text-lg whitespace-nowrap">
                      {settings.logo_text || 'C’est son anniversaire'}
                    </span>
                  ) : (
                    <AppLogo size="sm" />
                  )}
                </div>

                <button
                  onClick={handleSaveLogo}
                  disabled={isSavingLogo}
                  className="btn-festive text-xs px-5 py-2.5 disabled:opacity-60"
                >
                  {isSavingLogo ? 'Enregistrement...' : 'Enregistrer le logo'}
                </button>
              </div>
            )}
          </div>

          <div className="glass-card rounded-2xl p-6 border border-gold-brand/30 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif font-bold text-base text-ink flex items-center gap-2">
                <Crown className="w-4 h-4 text-gold-brand" />
                Journal d'activité
              </h3>
              <p className="text-xs text-ink/70 mt-0.5">
                Connexions, inscriptions et modifications sensibles, en temps réel (actualisation automatique toutes les 15s).
              </p>
            </div>
            <button
              onClick={() => activityRefreshState.run(fetchActivityLogs)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold text-gold-brand border border-gold-brand/30 hover:bg-gold-brand/10 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Actualiser
            </button>
          </div>

          {activityLogs.length === 0 ? (
            <div className="text-center py-12 text-ink/50 text-xs">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
              Aucune activité enregistrée pour le moment.
            </div>
          ) : (
            <div className="space-y-2 max-h-[32rem] overflow-y-auto pr-1">
              {activityLogs.map((log) => {
                const Icon = ACTIVITY_ICONS[log.action] || Activity;
                const isAlert = log.action === 'login_failed' || log.action === 'user_status_changed';
                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10"
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        isAlert ? 'bg-red-500/10 text-red-600' : 'bg-gold-brand/10 text-gold-brand'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-ink">
                          {ACTIVITY_LABELS[log.action] || log.action}
                        </span>
                        <span className="text-[10px] font-mono text-ink/50 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString('fr-FR')}
                        </span>
                      </div>
                      <p className="text-[11px] text-ink/70 mt-0.5">
                        {log.actor_name || 'Système'}
                        {log.actor_role ? ` (${log.actor_role})` : ''}
                        {log.details ? ` — ${log.details}` : ''}
                      </p>
                      {log.ip_address && (
                        <p className="text-[10px] font-mono text-ink/40 mt-0.5">IP : {log.ip_address}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </div>
      )}

      {/* TAB 4: SYNTHESIS OVERVIEW */}
      {activeTab === 'kpi' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <div className="glass-card rounded-2xl p-6 border border-black/5 dark:border-white/10 space-y-3">
            <h3 className="font-serif font-bold text-base text-ink">
              Répartition des Rôles
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-black/5 dark:border-white/10">
                <span>Clients enregistrés :</span>
                <span className="font-mono font-bold text-ink">
                  {users.filter((u) => u.role === 'client').length}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-black/5 dark:border-white/10">
                <span>Membres Staff / Régie :</span>
                <span className="font-mono font-bold text-violet">
                  {users.filter((u) => u.role === 'staff').length}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span>Administrateurs :</span>
                <span className="font-mono font-bold text-gold-brand">
                  {users.filter((u) => u.role === 'admin').length}
                </span>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-black/5 dark:border-white/10 space-y-3">
            <h3 className="font-serif font-bold text-base text-ink">
              Sécurité & Intégrité
            </h3>
            <p className="text-xs text-ink/70 leading-relaxed">
              Toutes les transactions sont cryptées et journalisées. Les calculs de commissions
              sont effectués côté serveur de manière inaltérable.
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-mono font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Base de données synchronisée et sécurisée</span>
            </div>
          </div>

          <ServiceStatusCard />
        </div>
      )}
        </main>
      </div>

      <RefreshLoadingOverlay
        status={refreshState.status}
        progress={refreshState.progress}
        errorMessage={refreshState.errorMessage}
        onRetry={refreshState.retry}
        onDismiss={refreshState.dismiss}
      />
      <RefreshLoadingOverlay
        status={activityRefreshState.status}
        progress={activityRefreshState.progress}
        errorMessage={activityRefreshState.errorMessage}
        onRetry={activityRefreshState.retry}
        onDismiss={activityRefreshState.dismiss}
      />
    </div>
  );
};
