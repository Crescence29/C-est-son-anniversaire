import React, { useEffect, useState } from 'react';
import {
  Gauge, Users, Crown, KeyRound, Ban as BanIcon, ShieldCheck,
  Monitor, X, Plus, CheckCircle2, LogIn, LogOut, UserPlus, Shield, ShieldAlert,
  Settings as SettingsIconAlias, Activity, DatabaseBackup, RefreshCw, Trash2,
  Code2, Key, Webhook as WebhookIcon, Globe, Copy, Power, ScrollText, Search, Database,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../utils/api.ts';
import { AppLogo, refreshAppLogo } from '../components/AppLogo.tsx';
import { DevSidebar, DevNavGroup } from '../components/dev-dashboard/DevSidebar.tsx';
import { DevTopbar } from '../components/dev-dashboard/DevTopbar.tsx';
import { SystemStatusPanel } from '../components/dev-dashboard/SystemStatusPanel.tsx';
import {
  ACCOUNT_PERMISSION_KEYS, AccountPermission, AccountSession, ActivityLog, AdminLevel, SiteSettings, UserRole,
  ApiKeySummary, ApiScope, API_SCOPES, WebhookSummary, WebhookEvent, WEBHOOK_EVENTS, WebhookDelivery, EndpointStat, ExternalServiceStatus,
  LogEntry, LogLevel, DatabaseStatus, DatabaseTableInfo, DatabaseMigration, IntegrityCheckResult,
} from '../types.ts';

type InternalAccount = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: UserRole;
  admin_level: AdminLevel | null;
  permissions: string[];
  status: 'active' | 'suspended';
  status_reason: string | null;
  last_login_at: string | null;
  active_sessions_count: number;
  created_at: string;
  updated_at: string;
};

const ADMIN_LEVEL_LABEL: Record<AdminLevel, string> = {
  super_admin: 'Super Admin',
  administrateur: 'Administrateur',
  manager: 'Manager',
  utilisateur: 'Utilisateur',
};

const PERMISSION_LABEL: Record<AccountPermission, string> = {
  'orders.manage': 'Gérer les commandes',
  'catalog.manage': 'Gérer le catalogue',
  'users.manage': 'Gérer les comptes',
  'settings.manage': 'Gérer les réglages du site',
  'reviews.moderate': 'Modérer les avis',
  'support.respond': 'Répondre au support',
};

const STATE_META: Record<string, { label: string; dot: string; text: string }> = {
  ok: { label: 'Opérationnel', dot: 'bg-emerald-400', text: 'text-emerald-400' },
  degraded: { label: 'Dégradé', dot: 'bg-amber-400', text: 'text-amber-400' },
  down: { label: 'En panne', dot: 'bg-red-400', text: 'text-red-400' },
  unknown: { label: 'Sans trafic', dot: 'bg-white/25', text: 'text-white/45' },
};

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  login_success: LogIn,
  login_failed: ShieldAlert,
  register: UserPlus,
  user_created: UserPlus,
  user_updated: UserPlus,
  user_role_changed: Shield,
  user_status_changed: ShieldAlert,
  user_permissions_changed: ShieldCheck,
  user_force_logout: LogIn,
  settings_updated: SettingsIconAlias,
  password_reset_by_admin: KeyRound,
  system_backup_created: DatabaseBackup,
  database_integrity_check: Database,
};

const ACTIVITY_LABELS: Record<string, string> = {
  login_success: 'Connexion réussie',
  login_failed: 'Connexion échouée',
  register: 'Inscription',
  user_created: 'Compte interne créé',
  user_updated: 'Compte interne modifié',
  user_role_changed: 'Rôle ou niveau modifié',
  user_status_changed: 'Statut du compte modifié',
  user_permissions_changed: 'Permissions modifiées',
  user_force_logout: 'Déconnexion forcée',
  settings_updated: 'Identité visuelle modifiée',
  password_reset_by_admin: 'Accès réinitialisé',
  system_backup_created: 'Sauvegarde technique déclenchée',
  database_integrity_check: 'Vérification d’intégrité de la base lancée',
};

const ROLE_DISPLAY: Record<string, string> = {
  developer: 'Developer',
  admin: 'Admin',
  staff: 'Manager',
  client: 'Client',
};

function timeAgo(iso: string | null): string {
  if (!iso) return 'Jamais';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'à l’instant';
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.round(hours / 24)} j`;
}

export const DeveloperDashboardPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'system' | 'accounts' | 'brand' | 'api' | 'logs' | 'database'>('system');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // ---- Comptes internes ----
  const [accounts, setAccounts] = useState<InternalAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [newPasswordResult, setNewPasswordResult] = useState<{ name: string; password: string } | null>(null);
  const [sessionsModalFor, setSessionsModalFor] = useState<InternalAccount | null>(null);
  const [sessions, setSessions] = useState<AccountSession[]>([]);
  const [permissionsModalFor, setPermissionsModalFor] = useState<InternalAccount | null>(null);
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [newAccount, setNewAccount] = useState({ full_name: '', email: '', phone: '', password: '', role: 'staff' as UserRole, admin_level: '' as AdminLevel | '' });
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [accountError, setAccountError] = useState('');

  const fetchAccounts = async () => {
    try {
      setAccountsLoading(true);
      const res = await api.get<{ accounts: InternalAccount[] }>('/developer/accounts');
      setAccounts(res.accounts || []);
    } catch {
      // silencieux : la barre d'état système signale déjà les pannes d'API
    } finally {
      setAccountsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountError('');
    setIsSavingAccount(true);
    try {
      await api.post('/developer/accounts', {
        ...newAccount,
        admin_level: newAccount.admin_level || undefined,
      });
      setShowCreateAccount(false);
      setNewAccount({ full_name: '', email: '', phone: '', password: '', role: 'staff', admin_level: '' });
      fetchAccounts();
    } catch (err: any) {
      setAccountError(err?.message || 'Erreur lors de la création du compte.');
    } finally {
      setIsSavingAccount(false);
    }
  };

  const handleSetRole = async (account: InternalAccount, role: UserRole, admin_level: AdminLevel | null) => {
    try {
      await api.put(`/developer/accounts/${account.id}/role`, { role, admin_level });
      fetchAccounts();
    } catch (err: any) {
      alert(err?.message || 'Erreur lors du changement de rôle.');
    }
  };

  const handleToggleStatus = async (account: InternalAccount) => {
    const nextStatus = account.status === 'active' ? 'suspended' : 'active';
    const reason = nextStatus === 'suspended' ? window.prompt(`Motif de la désactivation de ${account.full_name} :`) : null;
    if (nextStatus === 'suspended' && !reason) return;
    try {
      await api.put(`/developer/accounts/${account.id}/status`, { status: nextStatus, reason });
      fetchAccounts();
    } catch (err: any) {
      alert(err?.message || 'Erreur lors du changement de statut.');
    }
  };

  const handleResetAccess = async (account: InternalAccount) => {
    if (!window.confirm(`Réinitialiser l’accès de ${account.full_name} ? Un nouveau mot de passe sera généré et toutes ses sessions seront déconnectées.`)) return;
    try {
      const res = await api.put<{ newPassword: string }>(`/developer/accounts/${account.id}/reset-access`);
      setNewPasswordResult({ name: account.full_name, password: res.newPassword });
      fetchAccounts();
    } catch (err: any) {
      alert(err?.message || 'Erreur lors de la réinitialisation.');
    }
  };

  const handleForceLogout = async (account: InternalAccount) => {
    if (!window.confirm(`Déconnecter ${account.full_name} de tous ses appareils ?`)) return;
    try {
      await api.post(`/developer/accounts/${account.id}/force-logout`);
      fetchAccounts();
      if (sessionsModalFor?.id === account.id) openSessions(account);
    } catch (err: any) {
      alert(err?.message || 'Erreur lors de la déconnexion forcée.');
    }
  };

  const handleImpersonate = async (account: InternalAccount) => {
    if (!window.confirm(`Vous connecter directement sur le compte de ${account.full_name} (${account.email}) ? Votre session développeur actuelle sera remplacée dans cet onglet.`)) return;
    try {
      const res = await api.post<{ token: string }>(`/developer/accounts/${account.id}/impersonate`);
      localStorage.setItem('csa_auth_token', res.token);
      window.location.href = '/';
    } catch (err: any) {
      alert(err?.message || 'Erreur lors de la connexion directe.');
    }
  };

  const handleDeleteAccount = async (account: InternalAccount) => {
    if (!window.confirm(`Supprimer définitivement le compte de ${account.full_name} (${account.email}) ? Cette action est irréversible.`)) return;
    try {
      await api.delete(`/developer/accounts/${account.id}`);
      fetchAccounts();
    } catch (err: any) {
      alert(err?.message || 'Erreur lors de la suppression.');
    }
  };

  const openSessions = async (account: InternalAccount) => {
    setSessionsModalFor(account);
    try {
      const res = await api.get<{ sessions: AccountSession[] }>(`/developer/accounts/${account.id}/sessions`);
      setSessions(res.sessions || []);
    } catch {
      setSessions([]);
    }
  };

  const handleTogglePermission = async (account: InternalAccount, key: AccountPermission) => {
    const has = account.permissions.includes(key);
    const nextPermissions = has ? account.permissions.filter((p) => p !== key) : [...account.permissions, key];
    try {
      await api.put(`/developer/accounts/${account.id}/permissions`, { permissions: nextPermissions });
      setPermissionsModalFor((prev) => (prev && prev.id === account.id ? { ...prev, permissions: nextPermissions } : prev));
      fetchAccounts();
    } catch (err: any) {
      alert(err?.message || 'Erreur lors de la mise à jour des permissions.');
    }
  };

  // ---- Identité visuelle (logo) ----
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [isSavingLogo, setIsSavingLogo] = useState(false);
  const [logoSuccessMsg, setLogoSuccessMsg] = useState('');

  useEffect(() => {
    api.get<{ settings: SiteSettings }>('/settings').then((res) => setSettings(res.settings)).catch(() => {});
  }, []);

  const handleSaveLogo = async () => {
    if (!settings) return;
    try {
      setIsSavingLogo(true);
      await api.put('/developer/logo', { logo_mode: settings.logo_mode, logo_text: settings.logo_text });
      refreshAppLogo();
      setLogoSuccessMsg('Logo mis à jour !');
      setTimeout(() => setLogoSuccessMsg(''), 3000);
    } catch (err: any) {
      alert(err?.message || 'Erreur lors de l’enregistrement du logo.');
    } finally {
      setIsSavingLogo(false);
    }
  };

  // ---- Journal d'activité ----
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const fetchActivityLogs = async () => {
    try {
      const res = await api.get<{ logs: ActivityLog[] }>('/developer/activity-logs');
      setActivityLogs(res.logs || []);
    } catch {
      // silencieux
    }
  };
  useEffect(() => {
    fetchActivityLogs();
    const interval = setInterval(fetchActivityLogs, 15000);
    return () => clearInterval(interval);
  }, []);

  // ---- Sauvegarde ----
  const [isBackingUp, setIsBackingUp] = useState(false);
  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const res = await api.post<{ backup: unknown }>('/developer/system-backup');
      const blob = new Blob([JSON.stringify(res.backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.href = url;
      link.download = `sauvegarde-technique-${stamp}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err?.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setIsBackingUp(false);
    }
  };

  // ---- Journal technique (logs) ----
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logSources, setLogSources] = useState<string[]>([]);
  const [logSearch, setLogSearch] = useState('');
  const [logLevel, setLogLevel] = useState<LogLevel | 'all'>('all');
  const [logSource, setLogSource] = useState('all');

  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (logSearch) params.set('search', logSearch);
      if (logLevel !== 'all') params.set('level', logLevel);
      if (logSource !== 'all') params.set('source', logSource);
      const res = await api.get<{ logs: LogEntry[]; sources: string[] }>(`/developer/logs?${params.toString()}`);
      setLogs(res.logs || []);
      setLogSources(res.sources || []);
    } catch {
      // silencieux
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logSearch, logLevel, logSource]);

  // ---- Base de données ----
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [dbTables, setDbTables] = useState<DatabaseTableInfo[]>([]);
  const [dbMigrations, setDbMigrations] = useState<DatabaseMigration[]>([]);
  const [showDbTables, setShowDbTables] = useState(false);
  const [integrityResults, setIntegrityResults] = useState<IntegrityCheckResult[] | null>(null);
  const [integrityRunning, setIntegrityRunning] = useState(false);

  const fetchDatabaseData = async () => {
    try {
      const [statusRes, tablesRes, migrationsRes] = await Promise.all([
        api.get<{ status: DatabaseStatus }>('/developer/database/status'),
        api.get<{ tables: DatabaseTableInfo[] }>('/developer/database/tables'),
        api.get<{ migrations: DatabaseMigration[] }>('/developer/database/migrations'),
      ]);
      setDbStatus(statusRes.status);
      setDbTables(tablesRes.tables || []);
      setDbMigrations(migrationsRes.migrations || []);
    } catch {
      // silencieux : section secondaire, ne bloque pas le reste du dashboard
    }
  };

  useEffect(() => {
    fetchDatabaseData();
    const interval = setInterval(fetchDatabaseData, 30000);
    return () => clearInterval(interval);
  }, []);

  const runIntegrityCheck = async () => {
    setIntegrityRunning(true);
    try {
      const res = await api.post<{ results: IntegrityCheckResult[] }>('/developer/database/integrity-check', {});
      setIntegrityResults(res.results || []);
    } catch (err: any) {
      alert(err?.message || "Échec de la vérification d'intégrité.");
    } finally {
      setIntegrityRunning(false);
    }
  };

  function formatBytes(bytes: number): string {
    if (!bytes) return '0 o';
    const units = ['o', 'Ko', 'Mo', 'Go', 'To'];
    const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  }

  // ---- Gestion de l'API ----
  const [endpoints, setEndpoints] = useState<EndpointStat[]>([]);
  const [externalServices, setExternalServices] = useState<ExternalServiceStatus[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeySummary[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookSummary[]>([]);
  const [newApiKeyResult, setNewApiKeyResult] = useState<{ name: string; fullKey: string } | null>(null);
  const [newWebhookSecret, setNewWebhookSecret] = useState<{ url: string; secret: string } | null>(null);
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState<ApiScope[]>([]);
  const [showCreateWebhook, setShowCreateWebhook] = useState(false);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookEvent, setNewWebhookEvent] = useState<WebhookEvent>(WEBHOOK_EVENTS[0]);
  const [deliveriesFor, setDeliveriesFor] = useState<WebhookSummary | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [apiError, setApiError] = useState('');

  const fetchApiData = async () => {
    try {
      const [endpointsRes, servicesRes, keysRes, webhooksRes] = await Promise.all([
        api.get<{ endpoints: EndpointStat[] }>('/developer/endpoints'),
        api.get<{ services: ExternalServiceStatus[] }>('/developer/external-services'),
        api.get<{ apiKeys: ApiKeySummary[] }>('/developer/api-keys'),
        api.get<{ webhooks: WebhookSummary[] }>('/developer/webhooks'),
      ]);
      setEndpoints(endpointsRes.endpoints || []);
      setExternalServices(servicesRes.services || []);
      setApiKeys(keysRes.apiKeys || []);
      setWebhooks(webhooksRes.webhooks || []);
    } catch {
      // silencieux : section secondaire, ne bloque pas le reste du dashboard
    }
  };

  useEffect(() => {
    fetchApiData();
    const interval = setInterval(fetchApiData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');
    if (!newKeyName.trim() || newKeyScopes.length === 0) {
      setApiError('Un nom et au moins une portée sont requis.');
      return;
    }
    try {
      const res = await api.post<{ fullKey: string }>('/developer/api-keys', { name: newKeyName, scopes: newKeyScopes });
      setNewApiKeyResult({ name: newKeyName, fullKey: res.fullKey });
      setShowCreateKey(false);
      setNewKeyName('');
      setNewKeyScopes([]);
      fetchApiData();
    } catch (err: any) {
      setApiError(err?.message || 'Erreur lors de la création de la clé.');
    }
  };

  const handleRevokeApiKey = async (key: ApiKeySummary) => {
    if (!window.confirm(`Révoquer la clé "${key.name}" ? Toute intégration qui l'utilise cessera de fonctionner immédiatement.`)) return;
    try {
      await api.delete(`/developer/api-keys/${key.id}`);
      fetchApiData();
    } catch (err: any) {
      alert(err?.message || 'Erreur lors de la révocation.');
    }
  };

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');
    try {
      const res = await api.post<{ secret: string }>('/developer/webhooks', { url: newWebhookUrl, event: newWebhookEvent });
      setNewWebhookSecret({ url: newWebhookUrl, secret: res.secret });
      setShowCreateWebhook(false);
      setNewWebhookUrl('');
      fetchApiData();
    } catch (err: any) {
      setApiError(err?.message || 'Erreur lors de la création du webhook.');
    }
  };

  const handleToggleWebhook = async (webhook: WebhookSummary) => {
    try {
      await api.put(`/developer/webhooks/${webhook.id}/status`, { status: webhook.status === 'active' ? 'disabled' : 'active' });
      fetchApiData();
    } catch (err: any) {
      alert(err?.message || 'Erreur lors du changement de statut.');
    }
  };

  const handleDeleteWebhook = async (webhook: WebhookSummary) => {
    if (!window.confirm(`Supprimer ce webhook (${webhook.url}) ?`)) return;
    try {
      await api.delete(`/developer/webhooks/${webhook.id}`);
      fetchApiData();
    } catch (err: any) {
      alert(err?.message || 'Erreur lors de la suppression.');
    }
  };

  const openDeliveries = async (webhook: WebhookSummary) => {
    setDeliveriesFor(webhook);
    try {
      const res = await api.get<{ deliveries: WebhookDelivery[] }>(`/developer/webhooks/${webhook.id}/deliveries`);
      setDeliveries(res.deliveries || []);
    } catch {
      setDeliveries([]);
    }
  };

  const navGroups: DevNavGroup[] = [
    {
      title: 'Technique',
      items: [
        { key: 'system', label: 'État système', icon: Gauge },
        { key: 'logs', label: `Journal technique (${logs.length})`, icon: ScrollText },
        { key: 'database', label: 'Base de données', icon: Database },
        { key: 'api', label: `API (${endpoints.length})`, icon: Code2 },
        { key: 'brand', label: 'Identité visuelle', icon: Crown },
      ],
    },
    {
      title: 'Comptes',
      items: [{ key: 'accounts', label: `Comptes & rôles (${accounts.length})`, icon: Users }],
    },
  ];

  const TAB_TITLES: Record<typeof activeTab, { title: string; subtitle: string }> = {
    system: { title: 'État système', subtitle: 'Santé technique de la plateforme — aucune donnée client ici' },
    logs: { title: 'Journal technique', subtitle: 'Erreurs serveur, API, paiement, synchronisation, authentification et JavaScript' },
    database: { title: 'Base de données', subtitle: 'État MySQL en direct, tables, migrations et vérification d’intégrité' },
    api: { title: 'Gestion de l’API', subtitle: 'Endpoints réels, clés API, webhooks et services externes' },
    brand: { title: 'Identité visuelle', subtitle: 'Logo affiché dans toute l’application' },
    accounts: { title: 'Comptes & rôles', subtitle: 'Structure des comptes internes (staff / admin) uniquement' },
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
          onRefresh={() => { fetchAccounts(); fetchActivityLogs(); }}
          user={currentUser}
          roleLabel="Développeur"
        />

        <main className="flex-1 overflow-y-auto dd-scrollbar p-4 sm:p-6 space-y-6">
          {activeTab === 'system' && (
            <div className="space-y-6">
              <div
                className="rounded-2xl p-4 border flex items-start gap-3 text-xs"
                style={{ background: 'var(--dd-accent-soft)', borderColor: 'var(--dd-accent)', color: 'var(--dd-accent)' }}
              >
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                <p>Ce tableau de bord n’a pas accès aux coordonnées clients ni au contenu des commandes/paiements — uniquement à l’état technique de la plateforme et à la structure des comptes internes.</p>
              </div>
              <SystemStatusPanel onBackup={handleBackup} isBackingUp={isBackingUp} />

              <div className="rounded-2xl p-6 border space-y-4" style={{ background: 'var(--dd-panel)', borderColor: 'var(--dd-border)' }}>
                <div className="flex items-center justify-between">
                  <h3 className="font-serif font-bold text-base flex items-center gap-2" style={{ color: 'var(--dd-ink)' }}>
                    <Activity className="w-4 h-4" style={{ color: 'var(--dd-accent)' }} />
                    Journal d’activité
                  </h3>
                  <button
                    onClick={fetchActivityLogs}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border"
                    style={{ color: 'var(--dd-accent)', borderColor: 'var(--dd-accent)' }}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Actualiser
                  </button>
                </div>

                {activityLogs.length === 0 ? (
                  <div className="text-center py-10 text-xs" style={{ color: 'var(--dd-ink-faint)' }}>
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    Aucune activité enregistrée pour le moment.
                  </div>
                ) : (
                  // Format "audit log" volontairement compact — une ligne par
                  // entrée (heure — acteur — action), pour répondre
                  // directement à "qui a fait quoi" d'un coup d'œil, plutôt
                  // que la carte plus riche utilisée ailleurs dans l'app.
                  <div className="max-h-[28rem] overflow-y-auto font-mono text-xs">
                    {activityLogs.map((log) => {
                      const roleLabel = log.actor_role ? ROLE_DISPLAY[log.actor_role] || log.actor_role : 'Système';
                      const time = new Date(log.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                      const actionLabel = ACTIVITY_LABELS[log.action] || log.action;
                      return (
                        <div key={log.id} className="flex items-start gap-2 px-1 py-2 border-b last:border-0" style={{ borderColor: 'var(--dd-border)' }}>
                          <span className="shrink-0" style={{ color: 'var(--dd-ink-faint)' }}>{time}</span>
                          <span className="shrink-0 font-bold" style={{ color: 'var(--dd-accent)' }}>— {log.actor_name || roleLabel} —</span>
                          <span className="truncate" style={{ color: 'var(--dd-ink)' }}>
                            {actionLabel}{log.details ? ` (${log.details})` : ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="rounded-2xl p-4 border space-y-3" style={{ background: 'var(--dd-panel)', borderColor: 'var(--dd-border)' }}>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--dd-ink-faint)' }} />
                    <input
                      type="text"
                      value={logSearch}
                      onChange={(e) => setLogSearch(e.target.value)}
                      placeholder="Rechercher (message, source, référence)..."
                      className="w-full pl-8 pr-3 py-2 rounded-xl text-xs"
                      style={{ background: 'var(--dd-panel-hover)', border: '1px solid var(--dd-border)', color: 'var(--dd-ink)' }}
                    />
                  </div>
                  <select
                    value={logLevel}
                    onChange={(e) => setLogLevel(e.target.value as LogLevel | 'all')}
                    className="px-3 py-2 rounded-xl text-xs"
                    style={{ background: 'var(--dd-panel-hover)', border: '1px solid var(--dd-border)', color: 'var(--dd-ink)' }}
                  >
                    <option value="all">Tous les niveaux</option>
                    <option value="error">Erreur</option>
                    <option value="warn">Avertissement</option>
                    <option value="info">Info</option>
                  </select>
                  <select
                    value={logSource}
                    onChange={(e) => setLogSource(e.target.value)}
                    className="px-3 py-2 rounded-xl text-xs"
                    style={{ background: 'var(--dd-panel-hover)', border: '1px solid var(--dd-border)', color: 'var(--dd-ink)' }}
                  >
                    <option value="all">Toutes les sources</option>
                    {logSources.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--dd-panel)', borderColor: 'var(--dd-border)' }}>
                {logs.length === 0 ? (
                  <div className="text-center py-12 text-xs" style={{ color: 'var(--dd-ink-faint)' }}>
                    <ScrollText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    Aucune entrée ne correspond.
                  </div>
                ) : (
                  <div className="max-h-[36rem] overflow-y-auto">
                    {logs.map((log) => {
                      const levelColor = log.level === 'error' ? '#f43f5e' : log.level === 'warn' ? '#fbbf24' : '#34d399';
                      return (
                        <div key={log.id} className="flex items-start gap-3 px-4 py-3 border-b last:border-0 font-mono text-xs" style={{ borderColor: 'var(--dd-border)' }}>
                          <span className="font-bold shrink-0" style={{ color: levelColor }}>
                            [{log.level.toUpperCase()}] {new Date(log.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="shrink-0" style={{ color: 'var(--dd-accent)' }}>{log.source}</span>
                          {log.reference && <span className="shrink-0" style={{ color: 'var(--dd-ink-faint)' }}>{log.reference}</span>}
                          <span className="truncate" style={{ color: 'var(--dd-ink)' }}>{log.message}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'database' && (
            <div className="space-y-6">
              <div className="rounded-2xl p-6 border" style={{ background: 'var(--dd-panel)', borderColor: 'var(--dd-border)' }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-serif font-bold text-base flex items-center gap-2" style={{ color: 'var(--dd-ink)' }}>
                    <Database className="w-4 h-4" style={{ color: 'var(--dd-accent)' }} />
                    MySQL
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={fetchDatabaseData}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background: 'var(--dd-panel-hover)', color: 'var(--dd-ink-soft)' }}
                    >
                      <RefreshCw className="w-3 h-3" /> Actualiser
                    </button>
                    <button
                      onClick={handleBackup}
                      disabled={isBackingUp}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                      style={{ background: 'var(--dd-accent-soft)', color: 'var(--dd-accent)' }}
                    >
                      <DatabaseBackup className="w-3 h-3" /> {isBackingUp ? 'Sauvegarde...' : 'Sauvegarder maintenant'}
                    </button>
                  </div>
                </div>

                {!dbStatus ? (
                  <div className="text-center py-8 text-xs" style={{ color: 'var(--dd-ink-faint)' }}>Chargement...</div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-5">
                      <span className={`w-2 h-2 rounded-full ${STATE_META[dbStatus.state]?.dot || STATE_META.unknown.dot}`} />
                      <span className={`text-xs font-bold ${STATE_META[dbStatus.state]?.text || STATE_META.unknown.text}`}>
                        {STATE_META[dbStatus.state]?.label || 'Inconnu'}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--dd-ink-faint)' }}>· {dbStatus.pingMs} ms</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: 'Base', value: dbStatus.databaseName || '—' },
                        { label: 'Tables', value: String(dbStatus.tableCount) },
                        { label: 'Enregistrements (approx.)', value: dbStatus.approxRecordCount.toLocaleString('fr-FR') },
                        { label: 'Taille', value: formatBytes(dbStatus.sizeBytes) },
                        { label: 'Connexions actives', value: String(dbStatus.activeConnections) },
                        { label: 'Requêtes lentes (cumul serveur)', value: String(dbStatus.slowQueriesTotal) },
                        { label: 'Disponible depuis', value: `${Math.floor(dbStatus.mysqlUptimeSeconds / 3600)} h` },
                        { label: 'Dernier backup', value: dbStatus.lastBackupAt ? new Date(dbStatus.lastBackupAt).toLocaleString('fr-FR') : 'Jamais' },
                      ].map((kpi) => (
                        <div key={kpi.label} className="rounded-xl p-3" style={{ background: 'var(--dd-panel-hover)' }}>
                          <div className="text-[10px] uppercase tracking-wide mb-1" style={{ color: 'var(--dd-ink-faint)' }}>{kpi.label}</div>
                          <div className="text-sm font-bold" style={{ color: 'var(--dd-ink)' }}>{kpi.value}</div>
                        </div>
                      ))}
                    </div>

                    {dbStatus.recentSqlErrors.length > 0 && (
                      <div className="mt-5">
                        <div className="text-xs font-bold mb-2" style={{ color: 'var(--dd-ink)' }}>Erreurs SQL récentes</div>
                        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--dd-border)' }}>
                          {dbStatus.recentSqlErrors.map((e) => (
                            <div key={e.id} className="px-3 py-2 border-b last:border-0 font-mono text-[11px]" style={{ borderColor: 'var(--dd-border)', color: 'var(--dd-ink-soft)' }}>
                              <span style={{ color: '#f43f5e' }}>[{new Date(e.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}]</span> {e.message}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="rounded-2xl p-6 border" style={{ background: 'var(--dd-panel)', borderColor: 'var(--dd-border)' }}>
                <button
                  onClick={() => setShowDbTables((v) => !v)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <h3 className="font-serif font-bold text-base" style={{ color: 'var(--dd-ink)' }}>Tables ({dbTables.length})</h3>
                  <span className="text-xs" style={{ color: 'var(--dd-accent)' }}>{showDbTables ? 'Masquer' : 'Voir le détail'}</span>
                </button>
                {showDbTables && (
                  <div className="mt-4 rounded-xl border overflow-hidden overflow-x-auto" style={{ borderColor: 'var(--dd-border)' }}>
                    <table className="w-full text-xs min-w-[420px]">
                      <thead>
                        <tr style={{ background: 'var(--dd-panel-hover)' }}>
                          <th className="text-left px-3 py-2 font-semibold" style={{ color: 'var(--dd-ink-soft)' }}>Table</th>
                          <th className="text-right px-3 py-2 font-semibold" style={{ color: 'var(--dd-ink-soft)' }}>Lignes (approx.)</th>
                          <th className="text-right px-3 py-2 font-semibold" style={{ color: 'var(--dd-ink-soft)' }}>Taille</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dbTables.map((t) => (
                          <tr key={t.name} className="border-t" style={{ borderColor: 'var(--dd-border)' }}>
                            <td className="px-3 py-2 font-mono" style={{ color: 'var(--dd-ink)' }}>{t.name}</td>
                            <td className="px-3 py-2 text-right" style={{ color: 'var(--dd-ink-soft)' }}>{t.approxRows.toLocaleString('fr-FR')}</td>
                            <td className="px-3 py-2 text-right" style={{ color: 'var(--dd-ink-soft)' }}>{formatBytes(t.sizeBytes)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="rounded-2xl p-6 border" style={{ background: 'var(--dd-panel)', borderColor: 'var(--dd-border)' }}>
                <h3 className="font-serif font-bold text-base mb-3" style={{ color: 'var(--dd-ink)' }}>Migrations ({dbMigrations.length})</h3>
                <div className="space-y-1.5 mb-3">
                  {dbMigrations.map((m) => (
                    <div key={m.file} className="flex items-center gap-2 text-xs font-mono" style={{ color: 'var(--dd-ink-soft)' }}>
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: '#34d399' }} />
                      {m.file}
                    </div>
                  ))}
                </div>
                <p className="text-[11px]" style={{ color: 'var(--dd-ink-faint)' }}>
                  Suivi basé sur les fichiers du dépôt : chaque migration listée a été appliquée manuellement en production au moment de son ajout.
                </p>
              </div>

              <div className="rounded-2xl p-6 border" style={{ background: 'var(--dd-panel)', borderColor: 'var(--dd-border)' }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-serif font-bold text-base" style={{ color: 'var(--dd-ink)' }}>Vérification d'intégrité</h3>
                  <button
                    onClick={runIntegrityCheck}
                    disabled={integrityRunning}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"
                    style={{ background: 'var(--dd-accent-soft)', color: 'var(--dd-accent)' }}
                  >
                    <ShieldCheck className="w-3 h-3" /> {integrityRunning ? 'Vérification...' : 'Lancer une vérification'}
                  </button>
                </div>
                {integrityResults === null ? (
                  <p className="text-xs" style={{ color: 'var(--dd-ink-faint)' }}>Vérifie chaque table (CHECK TABLE) et recherche les enregistrements orphelins (commandes, paiements, avis, livrables, favoris).</p>
                ) : (
                  <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--dd-border)' }}>
                    {integrityResults.map((r, i) => {
                      const color = r.status === 'ok' ? '#34d399' : r.status === 'warning' ? '#fbbf24' : '#f43f5e';
                      return (
                        <div key={i} className="flex items-start justify-between gap-3 px-3 py-2 border-b last:border-0 text-xs" style={{ borderColor: 'var(--dd-border)' }}>
                          <span style={{ color: 'var(--dd-ink)' }}>{r.check}</span>
                          <span className="text-right shrink-0" style={{ color }}>{r.detail}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                <p className="text-[11px] mt-3" style={{ color: 'var(--dd-ink-faint)' }}>
                  Par sécurité, aucune restauration automatique n'est proposée depuis ce tableau de bord : une restauration écraserait des données clients et commandes réelles. Utilisez les sauvegardes téléchargées pour une restauration manuelle si nécessaire.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="space-y-6">
              {apiError && (
                <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold">{apiError}</div>
              )}

              {/* Endpoints réels + trafic en direct */}
              <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--dd-panel)', borderColor: 'var(--dd-border)' }}>
                <div className="p-5 pb-0 flex items-center justify-between">
                  <h3 className="font-serif font-bold text-base flex items-center gap-2" style={{ color: 'var(--dd-ink)' }}>
                    <Code2 className="w-4 h-4" style={{ color: 'var(--dd-accent)' }} />
                    Endpoints ({endpoints.length})
                  </h3>
                  <span className="text-[10px] font-mono" style={{ color: 'var(--dd-ink-faint)' }}>Depuis le dernier déploiement</span>
                </div>
                <div className="overflow-x-auto p-5">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--dd-border)' }}>
                        {['Endpoint', 'Requêtes', 'Erreurs', 'Statut'].map((h) => (
                          <th key={h} className="text-left font-mono uppercase text-[10px] px-3 py-2" style={{ color: 'var(--dd-ink-faint)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {endpoints.length === 0 ? (
                        <tr><td colSpan={4} className="text-center py-8" style={{ color: 'var(--dd-ink-faint)' }}>Chargement...</td></tr>
                      ) : (
                        endpoints.map((ep) => {
                          const meta = STATE_META[ep.state];
                          return (
                            <tr key={`${ep.method} ${ep.path}`} className="border-b last:border-0" style={{ borderColor: 'var(--dd-border)' }}>
                              <td className="px-3 py-2 font-mono">
                                <span className="font-bold mr-2" style={{ color: 'var(--dd-accent)' }}>{ep.method}</span>
                                <span style={{ color: 'var(--dd-ink)' }}>{ep.path}</span>
                              </td>
                              <td className="px-3 py-2 font-mono" style={{ color: 'var(--dd-ink-soft)' }}>{ep.requestCount.toLocaleString('fr-FR')}</td>
                              <td className="px-3 py-2 font-mono" style={{ color: ep.errorCount > 0 ? '#f43f5e' : 'var(--dd-ink-soft)' }}>{ep.errorCount.toLocaleString('fr-FR')}</td>
                              <td className="px-3 py-2">
                                <span className={`flex items-center gap-1.5 text-[11px] font-mono font-bold ${meta.text}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                                  {meta.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Clés API */}
                <div className="rounded-2xl p-5 border space-y-3" style={{ background: 'var(--dd-panel)', borderColor: 'var(--dd-border)' }}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif font-bold text-sm flex items-center gap-2" style={{ color: 'var(--dd-ink)' }}>
                      <Key className="w-4 h-4" style={{ color: 'var(--dd-accent)' }} />
                      Clés API
                    </h3>
                    <button onClick={() => setShowCreateKey(true)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-bold" style={{ background: 'var(--dd-accent)', color: '#1a0a0d' }}>
                      <Plus className="w-3.5 h-3.5" />
                      Nouvelle clé
                    </button>
                  </div>

                  {newApiKeyResult && (
                    <div className="p-3 rounded-xl border space-y-1.5" style={{ background: 'var(--dd-accent-soft)', borderColor: 'var(--dd-accent)' }}>
                      <p className="text-[11px] font-bold" style={{ color: 'var(--dd-accent)' }}>Clé pour « {newApiKeyResult.name} » — copiez-la, elle ne sera plus affichée :</p>
                      <div className="flex items-center gap-2">
                        <code className="text-[11px] font-mono px-2 py-1 rounded flex-1 truncate" style={{ background: 'var(--dd-panel)', color: 'var(--dd-ink)' }}>{newApiKeyResult.fullKey}</code>
                        <button onClick={() => { navigator.clipboard.writeText(newApiKeyResult.fullKey); }} title="Copier" style={{ color: 'var(--dd-accent)' }}><Copy className="w-4 h-4" /></button>
                        <button onClick={() => setNewApiKeyResult(null)} style={{ color: 'var(--dd-ink-soft)' }}><X className="w-4 h-4" /></button>
                      </div>
                    </div>
                  )}

                  {apiKeys.length === 0 ? (
                    <p className="text-xs" style={{ color: 'var(--dd-ink-faint)' }}>Aucune clé API créée.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {apiKeys.map((k) => (
                        <div key={k.id} className="flex items-center justify-between gap-2 py-2 border-b last:border-0 text-xs" style={{ borderColor: 'var(--dd-border)' }}>
                          <div className="min-w-0">
                            <p className="font-semibold truncate" style={{ color: 'var(--dd-ink)' }}>{k.name}</p>
                            <p className="font-mono text-[10px]" style={{ color: 'var(--dd-ink-faint)' }}>{k.key_prefix} · {k.scopes.join(', ')} · {k.request_count} appels</p>
                          </div>
                          {k.status === 'active' ? (
                            <button onClick={() => handleRevokeApiKey(k)} title="Révoquer" className="p-1.5 rounded-lg shrink-0" style={{ background: 'rgba(244,63,94,0.12)', color: '#f43f5e' }}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-[10px] font-bold shrink-0" style={{ color: '#f43f5e' }}>Révoquée</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Webhooks */}
                <div className="rounded-2xl p-5 border space-y-3" style={{ background: 'var(--dd-panel)', borderColor: 'var(--dd-border)' }}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif font-bold text-sm flex items-center gap-2" style={{ color: 'var(--dd-ink)' }}>
                      <WebhookIcon className="w-4 h-4" style={{ color: 'var(--dd-accent)' }} />
                      Webhooks
                    </h3>
                    <button onClick={() => setShowCreateWebhook(true)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-bold" style={{ background: 'var(--dd-accent)', color: '#1a0a0d' }}>
                      <Plus className="w-3.5 h-3.5" />
                      Nouveau
                    </button>
                  </div>

                  {newWebhookSecret && (
                    <div className="p-3 rounded-xl border space-y-1.5" style={{ background: 'var(--dd-accent-soft)', borderColor: 'var(--dd-accent)' }}>
                      <p className="text-[11px] font-bold" style={{ color: 'var(--dd-accent)' }}>Secret de signature pour {newWebhookSecret.url} — à conserver pour vérifier les envois :</p>
                      <div className="flex items-center gap-2">
                        <code className="text-[11px] font-mono px-2 py-1 rounded flex-1 truncate" style={{ background: 'var(--dd-panel)', color: 'var(--dd-ink)' }}>{newWebhookSecret.secret}</code>
                        <button onClick={() => { navigator.clipboard.writeText(newWebhookSecret.secret); }} title="Copier" style={{ color: 'var(--dd-accent)' }}><Copy className="w-4 h-4" /></button>
                        <button onClick={() => setNewWebhookSecret(null)} style={{ color: 'var(--dd-ink-soft)' }}><X className="w-4 h-4" /></button>
                      </div>
                    </div>
                  )}

                  {webhooks.length === 0 ? (
                    <p className="text-xs" style={{ color: 'var(--dd-ink-faint)' }}>Aucun webhook configuré.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {webhooks.map((w) => (
                        <div key={w.id} className="flex items-center justify-between gap-2 py-2 border-b last:border-0 text-xs" style={{ borderColor: 'var(--dd-border)' }}>
                          <button onClick={() => openDeliveries(w)} className="min-w-0 text-left">
                            <p className="font-semibold truncate" style={{ color: 'var(--dd-ink)' }}>{w.event}</p>
                            <p className="font-mono text-[10px] truncate" style={{ color: 'var(--dd-ink-faint)' }}>{w.url}</p>
                          </button>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] font-bold" style={{ color: w.status === 'active' ? '#34d399' : 'var(--dd-ink-faint)' }}>{w.status === 'active' ? 'Actif' : 'Désactivé'}</span>
                            <button onClick={() => handleToggleWebhook(w)} title={w.status === 'active' ? 'Désactiver' : 'Activer'} className="p-1.5 rounded-lg" style={{ background: 'var(--dd-panel-hover)', color: 'var(--dd-ink-soft)' }}>
                              <Power className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteWebhook(w)} title="Supprimer" className="p-1.5 rounded-lg" style={{ background: 'rgba(244,63,94,0.12)', color: '#f43f5e' }}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Services externes */}
              <div className="rounded-2xl p-5 border space-y-3" style={{ background: 'var(--dd-panel)', borderColor: 'var(--dd-border)' }}>
                <h3 className="font-serif font-bold text-sm flex items-center gap-2" style={{ color: 'var(--dd-ink)' }}>
                  <Globe className="w-4 h-4" style={{ color: 'var(--dd-accent)' }} />
                  Services externes
                </h3>
                <div className="space-y-2">
                  {externalServices.map((s) => (
                    <div key={s.name} className="flex items-center justify-between py-1.5 border-b last:border-0" style={{ borderColor: 'var(--dd-border)' }}>
                      <span className="text-xs" style={{ color: 'var(--dd-ink-soft)' }}>{s.name}</span>
                      <span className={`flex items-center gap-1.5 text-[11px] font-mono font-bold ${s.configured ? 'text-emerald-400' : 'text-amber-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.configured ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                        {s.detail}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Documentation API minimale, générée depuis les vraies routes */}
              <div className="rounded-2xl p-5 border space-y-2" style={{ background: 'var(--dd-panel)', borderColor: 'var(--dd-border)' }}>
                <h3 className="font-serif font-bold text-sm" style={{ color: 'var(--dd-ink)' }}>Documentation — API publique v1</h3>
                <p className="text-xs" style={{ color: 'var(--dd-ink-soft)' }}>
                  Base : <code className="font-mono">/api/v1</code> · Authentification : en-tête <code className="font-mono">X-API-Key</code> · Limite : 120 requêtes/minute par clé
                </p>
                <div className="font-mono text-xs space-y-1 pt-1" style={{ color: 'var(--dd-ink-faint)' }}>
                  <p>GET /api/v1/categories <span style={{ color: 'var(--dd-ink-soft)' }}>— portée catalog:read</span></p>
                  <p>GET /api/v1/services <span style={{ color: 'var(--dd-ink-soft)' }}>— portée catalog:read</span></p>
                  <p>GET /api/v1/orders/{'{order_number}'} <span style={{ color: 'var(--dd-ink-soft)' }}>— portée orders:read</span></p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'brand' && (
            <div className="rounded-2xl p-6 border space-y-4" style={{ background: 'var(--dd-panel)', borderColor: 'var(--dd-border)' }}>
              {logoSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  {logoSuccessMsg}
                </div>
              )}
              {settings && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSettings({ ...settings, logo_mode: 'image' })}
                      className="px-4 py-2 rounded-full text-xs font-bold transition-all"
                      style={{ background: settings.logo_mode === 'image' ? 'var(--dd-accent)' : 'var(--dd-panel-hover)', color: settings.logo_mode === 'image' ? '#1a0a0d' : 'var(--dd-ink-soft)' }}
                    >
                      Logo image
                    </button>
                    <button
                      onClick={() => setSettings({ ...settings, logo_mode: 'text' })}
                      className="px-4 py-2 rounded-full text-xs font-bold transition-all"
                      style={{ background: settings.logo_mode === 'text' ? 'var(--dd-accent)' : 'var(--dd-panel-hover)', color: settings.logo_mode === 'text' ? '#1a0a0d' : 'var(--dd-ink-soft)' }}
                    >
                      Nom de marque (texte)
                    </button>
                  </div>

                  {settings.logo_mode === 'text' && (
                    <input
                      type="text"
                      value={settings.logo_text}
                      onChange={(e) => setSettings({ ...settings, logo_text: e.target.value })}
                      placeholder="Nom affiché à la place du logo"
                      className="w-full p-2.5 rounded-xl text-xs"
                      style={{ background: 'var(--dd-panel-hover)', border: '1px solid var(--dd-border)', color: 'var(--dd-ink)' }}
                    />
                  )}

                  <button onClick={handleSaveLogo} disabled={isSavingLogo} className="btn-festive text-xs px-5 py-2.5 disabled:opacity-60">
                    {isSavingLogo ? 'Enregistrement...' : 'Enregistrer le logo'}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'accounts' && (
            <div className="space-y-6">
              <div
                className="rounded-2xl p-4 border flex items-start gap-3 text-xs"
                style={{ background: 'var(--dd-accent-soft)', borderColor: 'var(--dd-accent)', color: 'var(--dd-accent)' }}
              >
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                <p>Tous les comptes sont listés ici, y compris les clients (en lecture seule). Les actions de gestion — rôle, permissions, statut, accès, déconnexion forcée — restent réservées aux comptes internes (staff / admin) ; le contenu des commandes reste hors de portée.</p>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setShowCreateAccount(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold"
                  style={{ background: 'var(--dd-accent)', color: '#1a0a0d' }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Créer un compte
                </button>
              </div>

              {newPasswordResult && (
                <div className="rounded-2xl p-4 border flex items-center justify-between gap-3" style={{ background: 'var(--dd-accent-soft)', borderColor: 'var(--dd-accent)' }}>
                  <div className="text-xs" style={{ color: 'var(--dd-ink)' }}>
                    Nouveau mot de passe pour <strong>{newPasswordResult.name}</strong> :{' '}
                    <code className="font-mono px-2 py-0.5 rounded" style={{ background: 'var(--dd-panel)' }}>{newPasswordResult.password}</code>
                  </div>
                  <button onClick={() => setNewPasswordResult(null)} style={{ color: 'var(--dd-ink-soft)' }}><X className="w-4 h-4" /></button>
                </div>
              )}

              <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--dd-panel)', borderColor: 'var(--dd-border)' }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--dd-border)' }}>
                        {['Compte', 'Rôle', 'Niveau', 'Statut', 'Dernière connexion', 'Appareils', 'Actions'].map((h) => (
                          <th key={h} className="text-left font-mono uppercase text-[10px] px-4 py-3" style={{ color: 'var(--dd-ink-faint)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {accountsLoading ? (
                        <tr><td colSpan={7} className="text-center py-8" style={{ color: 'var(--dd-ink-faint)' }}>Chargement...</td></tr>
                      ) : accounts.length === 0 ? (
                        <tr><td colSpan={7} className="text-center py-8" style={{ color: 'var(--dd-ink-faint)' }}>Aucun compte pour le moment.</td></tr>
                      ) : (
                        accounts.map((a) => {
                          const isInternal = a.role === 'staff' || a.role === 'admin';
                          return (
                          <tr key={a.id} className="border-b last:border-0" style={{ borderColor: 'var(--dd-border)' }}>
                            <td className="px-4 py-3">
                              <p className="font-semibold" style={{ color: 'var(--dd-ink)' }}>{a.full_name}</p>
                              <p className="font-mono text-[10px]" style={{ color: 'var(--dd-ink-faint)' }}>{a.email}</p>
                            </td>
                            <td className="px-4 py-3">
                              {isInternal ? (
                                <select
                                  value={a.role}
                                  onChange={(e) => handleSetRole(a, e.target.value as UserRole, a.admin_level)}
                                  className="text-[11px] rounded-lg px-2 py-1 font-semibold"
                                  style={{ background: 'var(--dd-panel-hover)', border: '1px solid var(--dd-border)', color: 'var(--dd-ink)' }}
                                >
                                  <option value="staff">Staff</option>
                                  <option value="admin">Admin</option>
                                </select>
                              ) : (
                                <span className="text-[11px] font-semibold" style={{ color: 'var(--dd-ink-soft)' }}>
                                  {a.role === 'developer' ? 'Développeur' : 'Client'}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {isInternal ? (
                                <select
                                  value={a.admin_level || ''}
                                  onChange={(e) => handleSetRole(a, a.role, (e.target.value || null) as AdminLevel | null)}
                                  className="text-[11px] rounded-lg px-2 py-1"
                                  style={{ background: 'var(--dd-panel-hover)', border: '1px solid var(--dd-border)', color: 'var(--dd-ink)' }}
                                >
                                  <option value="">—</option>
                                  {(Object.keys(ADMIN_LEVEL_LABEL) as AdminLevel[]).map((lvl) => (
                                    <option key={lvl} value={lvl}>{ADMIN_LEVEL_LABEL[lvl]}</option>
                                  ))}
                                </select>
                              ) : (
                                <span style={{ color: 'var(--dd-ink-faint)' }}>—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase"
                                style={{
                                  background: a.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)',
                                  color: a.status === 'active' ? '#34d399' : '#f43f5e',
                                }}
                              >
                                {a.status === 'active' ? 'Actif' : 'Désactivé'}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono" style={{ color: 'var(--dd-ink-soft)' }}>{timeAgo(a.last_login_at)}</td>
                            <td className="px-4 py-3">
                              <button onClick={() => openSessions(a)} className="flex items-center gap-1 font-mono" style={{ color: 'var(--dd-accent)' }}>
                                <Monitor className="w-3.5 h-3.5" />
                                {a.active_sessions_count}
                              </button>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {isInternal && (
                                  <>
                                    <button onClick={() => setPermissionsModalFor(a)} title="Permissions" className="p-1.5 rounded-lg" style={{ background: 'var(--dd-panel-hover)', color: 'var(--dd-ink-soft)' }}>
                                      <ShieldCheck className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => handleResetAccess(a)} title="Réinitialiser l’accès" className="p-1.5 rounded-lg" style={{ background: 'var(--dd-panel-hover)', color: 'var(--dd-ink-soft)' }}>
                                      <KeyRound className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => handleToggleStatus(a)} title={a.status === 'active' ? 'Désactiver' : 'Réactiver'} className="p-1.5 rounded-lg" style={{ background: 'var(--dd-panel-hover)', color: 'var(--dd-ink-soft)' }}>
                                      <BanIcon className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => handleForceLogout(a)} title="Forcer la déconnexion" className="p-1.5 rounded-lg" style={{ background: 'var(--dd-panel-hover)', color: 'var(--dd-ink-soft)' }}>
                                      <LogOut className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => handleDeleteAccount(a)} title="Supprimer définitivement" className="p-1.5 rounded-lg" style={{ background: 'rgba(244,63,94,0.12)', color: '#f43f5e' }}>
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                                {a.id !== currentUser?.id && (
                                  <button onClick={() => handleImpersonate(a)} title="Se connecter directement sur ce compte" className="p-1.5 rounded-lg" style={{ background: 'var(--dd-accent-soft)', color: 'var(--dd-accent)' }}>
                                    <LogIn className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {!isInternal && a.id === currentUser?.id && (
                                  <span className="text-[10px]" style={{ color: 'var(--dd-ink-faint)' }}>Vous</span>
                                )}
                              </div>
                            </td>
                          </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modale : créer un compte */}
      {showCreateAccount && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowCreateAccount(false)}>
          <form
            onSubmit={handleCreateAccount}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border p-5 space-y-3"
            style={{ background: 'var(--dd-panel)', borderColor: 'var(--dd-border)' }}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-serif font-bold text-base" style={{ color: 'var(--dd-ink)' }}>Créer un compte interne</h3>
              <button type="button" onClick={() => setShowCreateAccount(false)} style={{ color: 'var(--dd-ink-soft)' }}><X className="w-4.5 h-4.5" /></button>
            </div>
            {accountError && <p className="text-xs text-red-400">{accountError}</p>}
            {(['full_name', 'email', 'phone', 'password'] as const).map((field) => (
              <input
                key={field}
                type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
                required
                placeholder={{ full_name: 'Nom complet', email: 'Email', phone: 'Téléphone', password: 'Mot de passe' }[field]}
                value={newAccount[field]}
                onChange={(e) => setNewAccount({ ...newAccount, [field]: e.target.value })}
                className="w-full p-2.5 rounded-xl text-xs"
                style={{ background: 'var(--dd-panel-hover)', border: '1px solid var(--dd-border)', color: 'var(--dd-ink)' }}
              />
            ))}
            <select
              value={newAccount.role}
              onChange={(e) => setNewAccount({ ...newAccount, role: e.target.value as UserRole })}
              className="w-full p-2.5 rounded-xl text-xs"
              style={{ background: 'var(--dd-panel-hover)', border: '1px solid var(--dd-border)', color: 'var(--dd-ink)' }}
            >
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
            <select
              value={newAccount.admin_level}
              onChange={(e) => setNewAccount({ ...newAccount, admin_level: e.target.value as AdminLevel | '' })}
              className="w-full p-2.5 rounded-xl text-xs"
              style={{ background: 'var(--dd-panel-hover)', border: '1px solid var(--dd-border)', color: 'var(--dd-ink)' }}
            >
              <option value="">Niveau hiérarchique (optionnel)</option>
              {(Object.keys(ADMIN_LEVEL_LABEL) as AdminLevel[]).map((lvl) => (
                <option key={lvl} value={lvl}>{ADMIN_LEVEL_LABEL[lvl]}</option>
              ))}
            </select>
            <button type="submit" disabled={isSavingAccount} className="w-full btn-festive text-xs py-2.5 disabled:opacity-60">
              {isSavingAccount ? 'Création...' : 'Créer le compte'}
            </button>
          </form>
        </div>
      )}

      {/* Modale : sessions / appareils */}
      {sessionsModalFor && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setSessionsModalFor(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border p-5 space-y-3 max-h-[80vh] overflow-y-auto"
            style={{ background: 'var(--dd-panel)', borderColor: 'var(--dd-border)' }}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-serif font-bold text-base" style={{ color: 'var(--dd-ink)' }}>Appareils de {sessionsModalFor.full_name}</h3>
              <button onClick={() => setSessionsModalFor(null)} style={{ color: 'var(--dd-ink-soft)' }}><X className="w-4.5 h-4.5" /></button>
            </div>
            <button
              onClick={() => handleForceLogout(sessionsModalFor)}
              className="text-[11px] font-bold px-3 py-1.5 rounded-full border"
              style={{ color: '#f43f5e', borderColor: '#f43f5e' }}
            >
              Forcer la déconnexion (tous les appareils)
            </button>
            {sessions.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--dd-ink-faint)' }}>Aucune connexion enregistrée.</p>
            ) : (
              <div className="space-y-1.5">
                {sessions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 py-2 border-b last:border-0 text-xs" style={{ borderColor: 'var(--dd-border)' }}>
                    <div>
                      <p style={{ color: 'var(--dd-ink)' }}>{s.device_label || 'Appareil inconnu'}</p>
                      <p className="text-[10px] font-mono" style={{ color: 'var(--dd-ink-faint)' }}>{s.ip_address || 'IP inconnue'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-mono" style={{ color: 'var(--dd-ink-faint)' }}>{timeAgo(s.created_at)}</p>
                      {s.revoked_at && <p className="text-[10px] font-bold text-red-400">Révoquée</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modale : permissions */}
      {permissionsModalFor && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setPermissionsModalFor(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border p-5 space-y-3"
            style={{ background: 'var(--dd-panel)', borderColor: 'var(--dd-border)' }}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-serif font-bold text-base" style={{ color: 'var(--dd-ink)' }}>Permissions de {permissionsModalFor.full_name}</h3>
              <button onClick={() => setPermissionsModalFor(null)} style={{ color: 'var(--dd-ink-soft)' }}><X className="w-4.5 h-4.5" /></button>
            </div>
            <div className="space-y-2">
              {ACCOUNT_PERMISSION_KEYS.map((key) => (
                <label key={key} className="flex items-center gap-2.5 text-xs cursor-pointer" style={{ color: 'var(--dd-ink)' }}>
                  <input
                    type="checkbox"
                    checked={permissionsModalFor.permissions.includes(key)}
                    onChange={() => handleTogglePermission(permissionsModalFor, key)}
                  />
                  {PERMISSION_LABEL[key]}
                </label>
              ))}
            </div>
            <p className="text-[10px] pt-2" style={{ color: 'var(--dd-ink-faint)' }}>
              Ces permissions sont enregistrées sur le compte ; leur application dans le reste de l’application est en cours de déploiement (voir rapport.md).
            </p>
          </div>
        </div>
      )}

      {/* Modale : créer une clé API */}
      {showCreateKey && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowCreateKey(false)}>
          <form
            onSubmit={handleCreateApiKey}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border p-5 space-y-3"
            style={{ background: 'var(--dd-panel)', borderColor: 'var(--dd-border)' }}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-serif font-bold text-base" style={{ color: 'var(--dd-ink)' }}>Nouvelle clé API</h3>
              <button type="button" onClick={() => setShowCreateKey(false)} style={{ color: 'var(--dd-ink-soft)' }}><X className="w-4.5 h-4.5" /></button>
            </div>
            <input
              type="text"
              required
              placeholder="Nom (ex : Application partenaire X)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="w-full p-2.5 rounded-xl text-xs"
              style={{ background: 'var(--dd-panel-hover)', border: '1px solid var(--dd-border)', color: 'var(--dd-ink)' }}
            />
            <div className="space-y-1.5">
              {API_SCOPES.map((scope) => (
                <label key={scope} className="flex items-center gap-2.5 text-xs cursor-pointer" style={{ color: 'var(--dd-ink)' }}>
                  <input
                    type="checkbox"
                    checked={newKeyScopes.includes(scope)}
                    onChange={() => setNewKeyScopes((prev) => (prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]))}
                  />
                  {scope}
                </label>
              ))}
            </div>
            <button type="submit" className="w-full btn-festive text-xs py-2.5">Créer la clé</button>
          </form>
        </div>
      )}

      {/* Modale : créer un webhook */}
      {showCreateWebhook && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowCreateWebhook(false)}>
          <form
            onSubmit={handleCreateWebhook}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border p-5 space-y-3"
            style={{ background: 'var(--dd-panel)', borderColor: 'var(--dd-border)' }}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-serif font-bold text-base" style={{ color: 'var(--dd-ink)' }}>Nouveau webhook</h3>
              <button type="button" onClick={() => setShowCreateWebhook(false)} style={{ color: 'var(--dd-ink-soft)' }}><X className="w-4.5 h-4.5" /></button>
            </div>
            <input
              type="url"
              required
              placeholder="https://exemple.com/webhooks/csa"
              value={newWebhookUrl}
              onChange={(e) => setNewWebhookUrl(e.target.value)}
              className="w-full p-2.5 rounded-xl text-xs"
              style={{ background: 'var(--dd-panel-hover)', border: '1px solid var(--dd-border)', color: 'var(--dd-ink)' }}
            />
            <select
              value={newWebhookEvent}
              onChange={(e) => setNewWebhookEvent(e.target.value as WebhookEvent)}
              className="w-full p-2.5 rounded-xl text-xs"
              style={{ background: 'var(--dd-panel-hover)', border: '1px solid var(--dd-border)', color: 'var(--dd-ink)' }}
            >
              {WEBHOOK_EVENTS.map((ev) => (
                <option key={ev} value={ev}>{ev}</option>
              ))}
            </select>
            <button type="submit" className="w-full btn-festive text-xs py-2.5">Créer le webhook</button>
          </form>
        </div>
      )}

      {/* Modale : historique des envois d'un webhook */}
      {deliveriesFor && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setDeliveriesFor(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border p-5 space-y-3 max-h-[80vh] overflow-y-auto"
            style={{ background: 'var(--dd-panel)', borderColor: 'var(--dd-border)' }}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-serif font-bold text-base" style={{ color: 'var(--dd-ink)' }}>Envois — {deliveriesFor.event}</h3>
              <button onClick={() => setDeliveriesFor(null)} style={{ color: 'var(--dd-ink-soft)' }}><X className="w-4.5 h-4.5" /></button>
            </div>
            <p className="text-[10px] font-mono truncate" style={{ color: 'var(--dd-ink-faint)' }}>{deliveriesFor.url}</p>
            {deliveries.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--dd-ink-faint)' }}>Aucun envoi pour le moment.</p>
            ) : (
              <div className="space-y-1.5">
                {deliveries.map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-3 py-2 border-b last:border-0 text-xs" style={{ borderColor: 'var(--dd-border)' }}>
                    <span className={`font-mono font-bold ${d.success ? 'text-emerald-400' : 'text-red-400'}`}>
                      {d.success ? `${d.status_code} OK` : d.error_message || 'Échec'}
                    </span>
                    <span className="text-[10px] font-mono" style={{ color: 'var(--dd-ink-faint)' }}>{new Date(d.created_at).toLocaleString('fr-FR')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
