import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { db } from '../dataStore.ts';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth.ts';
import { AdminLevel, ServiceHealthState, SystemStatusService, UserRole } from '../../types.ts';
import { getMetricsSnapshot } from '../metrics.ts';

const router = Router();

// Everything in this file is gated on the 'developer' role alone — never
// 'admin'. This is the whole point of splitting the role in migration 009:
// a developer account has no path into any /api/admin/* or /api/staff/*
// route, so it never automatically sees customer data, orders or payments.
// What it *can* do is manage the structure of internal (staff/admin)
// accounts and see the platform's technical health.
router.use(authenticateToken, requireRole('developer'));

const INTERNAL_ROLES: UserRole[] = ['staff', 'admin'];
const ADMIN_LEVELS: AdminLevel[] = ['super_admin', 'administrateur', 'manager', 'utilisateur'];

// ---------------------------------------------------------------------------
// État technique (déplacé depuis /api/admin — inchangé sur le fond)
// ---------------------------------------------------------------------------

let cachedAppVersion: string | null = null;
function getAppVersion(): string {
  if (cachedAppVersion) return cachedAppVersion;
  try {
    const pkgPath = path.join(process.cwd(), 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    cachedAppVersion = pkg.version || '0.0.0';
  } catch {
    cachedAppVersion = 'inconnue';
  }
  return cachedAppVersion;
}

function getDiskUsage(): { usedPercent: number; totalGB: number; usedGB: number } | null {
  if (process.platform === 'win32') return null;
  try {
    const output = execSync('df -Pk /', { encoding: 'utf8' });
    const line = output.trim().split('\n')[1];
    const parts = line.trim().split(/\s+/);
    const totalKB = Number(parts[1]);
    const usedKB = Number(parts[2]);
    if (!totalKB) return null;
    return {
      totalGB: Math.round((totalKB / 1024 / 1024) * 10) / 10,
      usedGB: Math.round((usedKB / 1024 / 1024) * 10) / 10,
      usedPercent: Math.round((usedKB / totalKB) * 100),
    };
  } catch {
    return null;
  }
}

router.get('/activity-logs', (req: AuthRequest, res: Response): void => {
  res.json({ logs: db.activityLogs });
});

router.get('/system-status', async (req: AuthRequest, res: Response): Promise<void> => {
  let databaseState: ServiceHealthState = 'ok';
  let databasePingMs: number | null = null;
  try {
    const start = Date.now();
    await db.pool.query('SELECT 1');
    databasePingMs = Date.now() - start;
    databaseState = databasePingMs > 500 ? 'degraded' : 'ok';
  } catch {
    databaseState = 'down';
  }

  const metrics = getMetricsSnapshot();

  const fifteenMinAgo = Date.now() - 15 * 60_000;
  const lastActiveByUser = new Map<string, string>();
  for (const log of db.activityLogs) {
    if (!log.actor_id || new Date(log.created_at).getTime() < fifteenMinAgo) continue;
    if (!lastActiveByUser.has(log.actor_id)) lastActiveByUser.set(log.actor_id, log.created_at);
  }
  const connectedUsers = Array.from(lastActiveByUser.entries())
    .map(([actorId, lastActiveAt]) => {
      const u = db.users.find((usr) => usr.id === actorId);
      return { id: actorId, name: u?.full_name || 'Utilisateur supprimé', role: u?.role || 'client', lastActiveAt };
    })
    .sort((a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime());

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  const cpuCount = os.cpus()?.length || 0;
  const cpuLoadPercent =
    process.platform === 'win32' || cpuCount === 0
      ? null
      : Math.min(100, Math.round((os.loadavg()[0] / cpuCount) * 100));

  const disk = getDiskUsage();

  const services: SystemStatusService[] = [
    { name: 'API', state: 'ok' },
    { name: 'Base de données', state: databaseState, detail: databasePingMs !== null ? `${databasePingMs} ms` : undefined },
    { name: 'Stockage', state: disk ? (disk.usedPercent >= 90 ? 'degraded' : 'ok') : 'unknown', detail: disk ? `${disk.usedPercent}%` : 'non disponible' },
  ];

  res.json({
    status: {
      serverState: 'ok',
      apiState: 'ok',
      databaseState,
      databasePingMs,
      avgResponseTimeMs: metrics.avgResponseTimeMs,
      requestCount: metrics.requestCount,
      recentErrors: metrics.recentErrors,
      connectedUsersCount: connectedUsers.length,
      connectedUsers,
      appVersion: getAppVersion(),
      lastDeployAt: metrics.serverStartedAt,
      lastBackupAt: db.lastBackupAt,
      uptimeSeconds: metrics.uptimeSeconds,
      disk,
      memory: {
        usedPercent: Math.round((usedMem / totalMem) * 100),
        totalMB: Math.round(totalMem / 1024 / 1024),
        usedMB: Math.round(usedMem / 1024 / 1024),
      },
      cpuLoadPercent,
      services,
    },
  });
});

// POST /api/developer/system-backup
// Exporte un instantané JSON — mais masque les coordonnées clients et le
// contenu des commandes/paiements : un compte développeur peut sauvegarder
// l'infrastructure, pas consulter les données métier en clair. Une
// sauvegarde complète (non masquée) reste une action côté administration
// métier, pas ici.
router.post('/system-backup', (req: AuthRequest, res: Response): void => {
  const redactedUsers = db.users.map((u) => ({
    id: u.id,
    role: u.role,
    admin_level: u.admin_level ?? null,
    status: u.status,
    is_banned: u.is_banned ?? false,
    created_at: u.created_at,
    updated_at: u.updated_at,
    ...(INTERNAL_ROLES.includes(u.role) || u.role === 'developer'
      ? { full_name: u.full_name, email: u.email, phone: u.phone }
      : {}),
  }));

  const redactedOrders = db.orders.map((o) => ({
    id: o.id,
    order_number: o.order_number,
    service_id: o.service_id,
    category_id: o.category_id,
    status: o.status,
    amount: o.amount,
    currency: o.currency,
    commission_amount: o.commission_amount,
    created_at: o.created_at,
    updated_at: o.updated_at,
    // recipient_name / recipient_phone / message / client contact délibérément omis.
  }));

  const redactedPayments = db.payments.map((p) => ({
    id: p.id,
    order_id: p.order_id,
    provider: p.provider,
    amount: p.amount,
    currency: p.currency,
    status: p.status,
    created_at: p.created_at,
    // phone_number / provider_reference délibérément omis.
  }));

  const snapshot = {
    generated_at: new Date().toISOString(),
    app_version: getAppVersion(),
    note: 'Sauvegarde technique : coordonnées clients et détail des commandes/paiements masqués (rôle développeur).',
    tables: {
      users: redactedUsers,
      categories: db.categories,
      services: db.services,
      orders: redactedOrders,
      payments: redactedPayments,
      commissions: db.commissions,
      faq_items: db.faqItems,
      site_settings: db.siteSettings,
    },
  };

  db.recordBackup();

  db.logActivity({
    actor_id: req.user?.id,
    actor_name: req.user?.full_name,
    actor_role: req.user?.role,
    action: 'system_backup_created',
    details: 'Sauvegarde technique déclenchée depuis le tableau de bord développeur (données clients masquées).',
    ip_address: req.ip,
  });

  res.json({ message: 'Sauvegarde générée.', lastBackupAt: db.lastBackupAt, backup: snapshot });
});

// ---------------------------------------------------------------------------
// Gestion de la structure des comptes internes (staff / admin uniquement —
// jamais les comptes clients, jamais leurs commandes).
// ---------------------------------------------------------------------------

function toAccountSummary(u: (typeof db.users)[number]) {
  const lastLogin = db.activityLogs.find((log) => log.actor_id === u.id && log.action === 'login_success');
  const activeSessions = db.sessions.filter((s) => s.user_id === u.id && !s.revoked_at);
  return {
    id: u.id,
    full_name: u.full_name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    admin_level: u.admin_level ?? null,
    permissions: u.permissions ?? [],
    status: u.status,
    status_reason: u.status_reason ?? null,
    last_login_at: lastLogin?.created_at ?? null,
    active_sessions_count: activeSessions.length,
    created_at: u.created_at,
    updated_at: u.updated_at,
  };
}

// GET /api/developer/accounts
router.get('/accounts', (req: AuthRequest, res: Response): void => {
  const accounts = db.users
    .filter((u) => INTERNAL_ROLES.includes(u.role))
    .map(toAccountSummary);
  res.json({ accounts });
});

// POST /api/developer/accounts
router.post('/accounts', async (req: AuthRequest, res: Response): Promise<void> => {
  const { full_name, email, phone, password, role, admin_level } = req.body;

  if (!full_name || !email || !phone || !password) {
    res.status(400).json({ error: 'Tous les champs (nom, email, téléphone, mot de passe) sont obligatoires.' });
    return;
  }
  if (!INTERNAL_ROLES.includes(role)) {
    res.status(400).json({ error: 'Rôle invalide pour un compte interne (staff ou admin uniquement).' });
    return;
  }
  if (admin_level && !ADMIN_LEVELS.includes(admin_level)) {
    res.status(400).json({ error: 'Niveau hiérarchique invalide.' });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
    return;
  }

  const existing = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    res.status(409).json({ error: 'Un compte avec cette adresse email existe déjà.' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const userId = `usr-${role}-${Date.now()}`;

  const newUser = {
    id: userId,
    full_name,
    email: email.toLowerCase(),
    phone,
    role: role as UserRole,
    admin_level: (admin_level as AdminLevel) || null,
    permissions: [],
    status: 'active' as const,
    avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(full_name)}&backgroundColor=d94a76,4a2170`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.users.push(newUser as any);
  db.passwords.set(userId, passwordHash);

  db.logActivity({
    actor_id: req.user?.id,
    actor_name: req.user?.full_name,
    actor_role: req.user?.role,
    action: 'user_created',
    target_type: 'user',
    target_id: userId,
    details: `Compte interne "${full_name}" créé (rôle ${role}${admin_level ? `, niveau ${admin_level}` : ''}) par le développeur.`,
    ip_address: req.ip,
  });

  res.status(201).json({ message: 'Compte créé avec succès.', account: toAccountSummary(newUser as any) });
});

function findInternalAccount(id: string, res: Response) {
  const user = db.users.find((u) => u.id === id && INTERNAL_ROLES.includes(u.role));
  if (!user) {
    res.status(404).json({ error: 'Compte interne introuvable.' });
    return null;
  }
  return user;
}

// PUT /api/developer/accounts/:id — modifier nom/téléphone/email
router.put('/accounts/:id', (req: AuthRequest, res: Response): void => {
  const user = findInternalAccount(req.params.id, res);
  if (!user) return;

  const { full_name, phone, email } = req.body;
  if (full_name) user.full_name = full_name;
  if (phone) user.phone = phone;
  if (email) user.email = String(email).toLowerCase();
  user.updated_at = new Date().toISOString();

  db.logActivity({
    actor_id: req.user?.id,
    actor_name: req.user?.full_name,
    actor_role: req.user?.role,
    action: 'user_updated',
    target_type: 'user',
    target_id: user.id,
    details: `Compte interne "${user.full_name}" modifié par le développeur.`,
    ip_address: req.ip,
  });

  res.json({ message: 'Compte mis à jour.', account: toAccountSummary(user) });
});

// PUT /api/developer/accounts/:id/role — rôle + niveau hiérarchique
router.put('/accounts/:id/role', (req: AuthRequest, res: Response): void => {
  const user = findInternalAccount(req.params.id, res);
  if (!user) return;

  const { role, admin_level } = req.body;
  if (role && !INTERNAL_ROLES.includes(role)) {
    res.status(400).json({ error: 'Rôle invalide pour un compte interne.' });
    return;
  }
  if (admin_level !== undefined && admin_level !== null && !ADMIN_LEVELS.includes(admin_level)) {
    res.status(400).json({ error: 'Niveau hiérarchique invalide.' });
    return;
  }

  if (role) user.role = role;
  if (admin_level !== undefined) user.admin_level = admin_level;
  user.updated_at = new Date().toISOString();

  db.logActivity({
    actor_id: req.user?.id,
    actor_name: req.user?.full_name,
    actor_role: req.user?.role,
    action: 'user_role_changed',
    target_type: 'user',
    target_id: user.id,
    details: `Rôle/niveau de ${user.full_name} défini sur ${user.role}${user.admin_level ? ` / ${user.admin_level}` : ''} par le développeur.`,
    ip_address: req.ip,
  });

  res.json({ message: 'Rôle mis à jour.', account: toAccountSummary(user) });
});

// PUT /api/developer/accounts/:id/permissions
router.put('/accounts/:id/permissions', (req: AuthRequest, res: Response): void => {
  const user = findInternalAccount(req.params.id, res);
  if (!user) return;

  const { permissions } = req.body;
  if (!Array.isArray(permissions) || !permissions.every((p) => typeof p === 'string')) {
    res.status(400).json({ error: 'Liste de permissions invalide.' });
    return;
  }

  user.permissions = permissions;
  user.updated_at = new Date().toISOString();

  db.logActivity({
    actor_id: req.user?.id,
    actor_name: req.user?.full_name,
    actor_role: req.user?.role,
    action: 'user_permissions_changed',
    target_type: 'user',
    target_id: user.id,
    details: `Permissions de ${user.full_name} mises à jour par le développeur.`,
    ip_address: req.ip,
  });

  res.json({ message: 'Permissions mises à jour.', account: toAccountSummary(user) });
});

// PUT /api/developer/accounts/:id/status — activer / désactiver
router.put('/accounts/:id/status', (req: AuthRequest, res: Response): void => {
  const user = findInternalAccount(req.params.id, res);
  if (!user) return;

  const { status, reason } = req.body;
  if (!['active', 'suspended'].includes(status)) {
    res.status(400).json({ error: 'Statut invalide.' });
    return;
  }
  if (user.id === req.user?.id) {
    res.status(400).json({ error: 'Vous ne pouvez pas désactiver votre propre compte.' });
    return;
  }

  user.status = status;
  user.status_reason = status === 'suspended' ? reason || null : null;
  user.updated_at = new Date().toISOString();

  db.logActivity({
    actor_id: req.user?.id,
    actor_name: req.user?.full_name,
    actor_role: req.user?.role,
    action: 'user_status_changed',
    target_type: 'user',
    target_id: user.id,
    details: `Compte interne de ${user.full_name} ${status === 'active' ? 'réactivé' : 'désactivé'}${reason ? ` (motif : ${reason})` : ''} par le développeur.`,
    ip_address: req.ip,
  });

  res.json({ message: `Compte ${status === 'active' ? 'réactivé' : 'désactivé'}.`, account: toAccountSummary(user) });
});

// PUT /api/developer/accounts/:id/reset-access
router.put('/accounts/:id/reset-access', async (req: AuthRequest, res: Response): Promise<void> => {
  const user = findInternalAccount(req.params.id, res);
  if (!user) return;

  const newPassword = `Csa${Math.random().toString(36).slice(2, 8)}!${Math.floor(Math.random() * 900 + 100)}`;
  const newHash = await bcrypt.hash(newPassword, 10);
  db.passwords.set(user.id, newHash);
  user.token_version = (user.token_version || 0) + 1;
  user.updated_at = new Date().toISOString();
  db.revokeUserSessions(user.id);

  db.logActivity({
    actor_id: req.user?.id,
    actor_name: req.user?.full_name,
    actor_role: req.user?.role,
    action: 'password_reset_by_admin',
    target_type: 'user',
    target_id: user.id,
    details: `Accès de ${user.full_name} (${user.email}) réinitialisé par le développeur.`,
    ip_address: req.ip,
  });

  res.json({ message: `Nouveau mot de passe généré pour ${user.full_name}.`, newPassword });
});

// GET /api/developer/accounts/:id/sessions
router.get('/accounts/:id/sessions', (req: AuthRequest, res: Response): void => {
  const user = findInternalAccount(req.params.id, res);
  if (!user) return;

  const sessions = db.sessions
    .filter((s) => s.user_id === user.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 20);

  res.json({ sessions });
});

// POST /api/developer/accounts/:id/force-logout
// Déconnexion globale (tous les appareils) : aucune session n'est révocable
// individuellement aujourd'hui, faute d'identifiant de session dans le JWT.
router.post('/accounts/:id/force-logout', (req: AuthRequest, res: Response): void => {
  const user = findInternalAccount(req.params.id, res);
  if (!user) return;

  user.token_version = (user.token_version || 0) + 1;
  user.updated_at = new Date().toISOString();
  db.revokeUserSessions(user.id);

  db.logActivity({
    actor_id: req.user?.id,
    actor_name: req.user?.full_name,
    actor_role: req.user?.role,
    action: 'user_force_logout',
    target_type: 'user',
    target_id: user.id,
    details: `Déconnexion forcée de tous les appareils de ${user.full_name} par le développeur.`,
    ip_address: req.ip,
  });

  res.json({ message: `${user.full_name} a été déconnecté de tous ses appareils.` });
});

// ---------------------------------------------------------------------------
// Identité visuelle (logo) — seul réglage du site que le développeur peut
// modifier directement ; le reste du contenu de la vitrine reste une
// décision métier (PUT /api/admin/settings).
// ---------------------------------------------------------------------------

router.put('/logo', (req: AuthRequest, res: Response): void => {
  const { logo_mode, logo_text } = req.body;
  if (!['image', 'text'].includes(logo_mode)) {
    res.status(400).json({ error: 'Mode de logo invalide.' });
    return;
  }

  db.updateSiteSettings({ logo_mode, logo_text: logo_text ?? db.siteSettings.logo_text });

  db.logActivity({
    actor_id: req.user?.id,
    actor_name: req.user?.full_name,
    actor_role: req.user?.role,
    action: 'settings_updated',
    target_type: 'site_settings',
    details: 'Identité visuelle (logo) mise à jour par le développeur.',
    ip_address: req.ip,
  });

  res.json({ message: 'Logo mis à jour.', settings: db.siteSettings });
});

export default router;
