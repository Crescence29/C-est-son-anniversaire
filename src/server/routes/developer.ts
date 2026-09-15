import { Router, Response, Express } from 'express';
import bcrypt from 'bcryptjs';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { db } from '../dataStore.ts';
import { authenticateToken, AuthRequest, requireRole, generateToken, generateRefreshToken } from '../middleware/auth.ts';
import { AdminLevel, ServiceHealthState, SystemStatusService, UserRole, ApiScope, API_SCOPES, WebhookEvent, WEBHOOK_EVENTS } from '../../types.ts';
import { getMetricsSnapshot, getEndpointStats } from '../metrics.ts';
import { getLogs, getLogSources, recordLog, LogLevel } from '../logs.ts';
import { describeDevice } from '../utils/userAgent.ts';
import { generateApiKey } from '../apiKeys.ts';
import { listEndpoints } from '../endpointRegistry.ts';
import { collectMediaReferences, getMediaSummary, checkLinks, ALLOWED_FORMATS } from '../mediaAudit.ts';
import { getDeployInfo } from '../deployInfo.ts';
import crypto from 'crypto';

const router = Router();

// Set once from server.ts after the Express app is created — used only by
// GET /endpoints to introspect the app's real, registered routes.
let expressAppRef: Express | null = null;
export function setExpressApp(app: Express): void {
  expressAppRef = app;
}

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
// Base de données — surveillance réelle (introspection MySQL en direct), sans
// bouton de suppression ni de restauration automatique : une restauration
// écraserait des données clients/commandes réelles, c'est délibérément laissé
// hors de ce tableau de bord (voir rapport.md).
// ---------------------------------------------------------------------------

router.get('/database/status', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const start = Date.now();
    const [dbRows]: any = await db.pool.query('SELECT DATABASE() AS db');
    const pingMs = Date.now() - start;
    const [tableStatusRows]: any = await db.pool.query('SHOW TABLE STATUS');
    let approxRecordCount = 0;
    let sizeBytes = 0;
    for (const t of tableStatusRows) {
      approxRecordCount += Number(t.Rows || 0);
      sizeBytes += Number(t.Data_length || 0) + Number(t.Index_length || 0);
    }
    const [connRows]: any = await db.pool.query("SHOW STATUS LIKE 'Threads_connected'");
    const [slowRows]: any = await db.pool.query("SHOW STATUS LIKE 'Slow_queries'");
    const [uptimeRows]: any = await db.pool.query("SHOW STATUS LIKE 'Uptime'");

    res.json({
      status: {
        engine: 'MySQL',
        state: pingMs > 500 ? 'degraded' : 'ok',
        databaseName: dbRows[0]?.db || null,
        pingMs,
        tableCount: tableStatusRows.length,
        approxRecordCount,
        sizeBytes,
        activeConnections: Number(connRows[0]?.Value || 0),
        slowQueriesTotal: Number(slowRows[0]?.Value || 0),
        mysqlUptimeSeconds: Number(uptimeRows[0]?.Value || 0),
        lastBackupAt: db.lastBackupAt,
        recentSqlErrors: getLogs({ source: 'Database' }).slice(0, 10),
      },
    });
  } catch (error: any) {
    recordLog('error', 'Database', `Échec de lecture du statut de la base : ${error.message}`);
    res.status(503).json({ error: 'Base de données inaccessible.', detail: error.message });
  }
});

router.get('/database/tables', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [rows]: any = await db.pool.query('SHOW TABLE STATUS');
    const tables = rows
      .map((t: any) => ({
        name: t.Name,
        engine: t.Engine || null,
        approxRows: Number(t.Rows || 0),
        sizeBytes: Number(t.Data_length || 0) + Number(t.Index_length || 0),
        collation: t.Collation || null,
      }))
      .sort((a: any, b: any) => b.sizeBytes - a.sizeBytes);
    res.json({ tables });
  } catch (error: any) {
    recordLog('error', 'Database', `Échec de lecture des tables : ${error.message}`);
    res.status(503).json({ error: 'Impossible de lister les tables.', detail: error.message });
  }
});

router.get('/database/migrations', (req: AuthRequest, res: Response): void => {
  try {
    const dir = path.join(process.cwd(), 'migrations');
    const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort() : [];
    res.json({
      migrations: files.map((file) => ({ file, appliedInProduction: true })),
      note: "Suivi basé sur les fichiers du dépôt : il n'existe pas encore de table de suivi des migrations en base. Chaque migration listée a été appliquée manuellement en production au moment de son ajout.",
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Impossible de lister les migrations.', detail: error.message });
  }
});

router.post('/database/integrity-check', async (req: AuthRequest, res: Response): Promise<void> => {
  const results: { check: string; status: 'ok' | 'warning' | 'error'; detail: string }[] = [];
  try {
    const [tableRows]: any = await db.pool.query('SHOW TABLES');
    const tableNames: string[] = tableRows.map((r: any) => Object.values(r)[0] as string);

    for (const name of tableNames) {
      try {
        const [checkRows]: any = await db.pool.query(`CHECK TABLE \`${name}\``);
        const msg = checkRows[0]?.Msg_text || 'OK';
        results.push({ check: `Table \`${name}\``, status: String(msg).toLowerCase() === 'ok' ? 'ok' : 'warning', detail: msg });
      } catch (e: any) {
        results.push({ check: `Table \`${name}\``, status: 'error', detail: e.message });
      }
    }

    const orphanChecks = [
      { check: 'Commandes sans client existant', sql: 'SELECT COUNT(*) AS n FROM orders o LEFT JOIN users u ON o.client_id = u.id WHERE u.id IS NULL' },
      { check: 'Commandes sans prestation existante', sql: 'SELECT COUNT(*) AS n FROM orders o LEFT JOIN services s ON o.service_id = s.id WHERE s.id IS NULL' },
      { check: 'Paiements sans commande existante', sql: 'SELECT COUNT(*) AS n FROM payments p LEFT JOIN orders o ON p.order_id = o.id WHERE o.id IS NULL' },
      { check: 'Avis sans commande existante', sql: 'SELECT COUNT(*) AS n FROM reviews r LEFT JOIN orders o ON r.order_id = o.id WHERE o.id IS NULL' },
      { check: 'Livrables sans commande existante', sql: 'SELECT COUNT(*) AS n FROM order_deliverables d LEFT JOIN orders o ON d.order_id = o.id WHERE o.id IS NULL' },
      { check: 'Favoris sans prestation existante', sql: 'SELECT COUNT(*) AS n FROM favorites f LEFT JOIN services s ON f.service_id = s.id WHERE s.id IS NULL' },
    ];
    for (const oc of orphanChecks) {
      try {
        const [rows]: any = await db.pool.query(oc.sql);
        const n = Number(rows[0]?.n || 0);
        results.push({ check: oc.check, status: n === 0 ? 'ok' : 'warning', detail: n === 0 ? 'Aucune anomalie.' : `${n} enregistrement(s) orphelin(s).` });
      } catch (e: any) {
        results.push({ check: oc.check, status: 'error', detail: e.message });
      }
    }

    db.logActivity({
      actor_id: req.user?.id,
      actor_name: req.user?.full_name,
      actor_role: req.user?.role,
      action: 'database_integrity_check',
      details: `Vérification d'intégrité lancée (${results.length} contrôles).`,
      ip_address: req.ip,
    });

    res.json({ results, checkedAt: new Date().toISOString() });
  } catch (error: any) {
    recordLog('error', 'Database', `Échec de la vérification d'intégrité : ${error.message}`);
    res.status(500).json({ error: "Échec de la vérification d'intégrité.", detail: error.message, results });
  }
});

// ---------------------------------------------------------------------------
// Fichiers et médias — cette plateforme ne stocke aucun fichier sur son
// propre serveur : chaque photo/vidéo/document est un lien externe collé par
// l'équipe (pas d'upload). Impossible donc d'afficher un vrai espace disque
// utilisé — cette section audite les LIENS réellement référencés dans la
// base à la place, sans jamais fabriquer une taille de stockage.
// ---------------------------------------------------------------------------

router.get('/media/summary', (req: AuthRequest, res: Response): void => {
  const cdnConfigured = Boolean(process.env.CDN_URL);
  const externalStorageConfigured = Boolean(process.env.AWS_S3_BUCKET || process.env.CLOUDINARY_URL);
  res.json({
    summary: getMediaSummary(),
    cdn: {
      configured: cdnConfigured,
      detail: cdnConfigured ? 'CDN configuré (CDN_URL).' : 'Aucun CDN configuré : chaque lien est chargé directement depuis son hébergeur d’origine.',
    },
    externalStorage: {
      configured: externalStorageConfigured,
      detail: externalStorageConfigured
        ? 'Stockage externe configuré.'
        : "Aucun stockage de fichiers propre (pas de S3, pas de Cloudinary) : l'équipe colle des liens vers des fichiers déjà hébergés ailleurs.",
    },
    allowedFormats: ALLOWED_FORMATS,
    note: "Cette application n'héberge aucun fichier elle-même : les tailles ci-dessous viennent d'une vérification en direct des liens, pas d'un espace disque réel.",
  });
});

router.post('/media/check-links', async (req: AuthRequest, res: Response): Promise<void> => {
  const refs = collectMediaReferences();
  const CAP = 300;
  const capped = refs.slice(0, CAP);
  try {
    const results = await checkLinks(capped, { concurrency: 8, timeoutMs: 6000 });
    const broken = results.filter((r) => !r.ok);
    const LARGE_THRESHOLD_BYTES = 5 * 1024 * 1024;
    const large = results
      .filter((r) => (r.contentLengthBytes || 0) > LARGE_THRESHOLD_BYTES)
      .sort((a, b) => (b.contentLengthBytes || 0) - (a.contentLengthBytes || 0));

    res.json({
      checkedCount: results.length,
      totalCount: refs.length,
      truncated: refs.length > CAP,
      broken,
      large,
      checkedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    recordLog('error', 'Media', `Échec de la vérification des liens médias : ${error.message}`);
    res.status(500).json({ error: 'Échec de la vérification des liens.', detail: error.message });
  }
});

router.post('/media/cleanup-orphan-references', (req: AuthRequest, res: Response): void => {
  const orderIds = new Set(db.orders.map((o) => o.id));
  const serviceIds = new Set(db.services.map((s) => s.id));
  const orphanDeliverableIds = new Set(db.orderDeliverables.filter((d) => !orderIds.has(d.order_id)).map((d) => d.id));
  const orphanFavoriteIds = new Set(db.favorites.filter((f) => !serviceIds.has(f.service_id)).map((f) => f.id));

  for (let i = db.orderDeliverables.length - 1; i >= 0; i--) {
    if (orphanDeliverableIds.has(db.orderDeliverables[i].id)) db.orderDeliverables.splice(i, 1);
  }
  for (let i = db.favorites.length - 1; i >= 0; i--) {
    if (orphanFavoriteIds.has(db.favorites[i].id)) db.favorites.splice(i, 1);
  }

  db.logActivity({
    actor_id: req.user?.id,
    actor_name: req.user?.full_name,
    actor_role: req.user?.role,
    action: 'media_orphans_cleaned',
    details: `${orphanDeliverableIds.size} référence(s) de livrable et ${orphanFavoriteIds.size} favori(s) orphelin(s) supprimés.`,
    ip_address: req.ip,
  });

  res.json({ deletedDeliverables: orphanDeliverableIds.size, deletedFavorites: orphanFavoriteIds.size });
});

// ---------------------------------------------------------------------------
// Déploiement et versions — le commit réellement déployé (capturé au
// moment du build, voir src/server/deployInfo.ts) et les derniers commits
// comme historique réel. Pas de rollback automatique depuis ce tableau de
// bord : un redéploiement vers une version antérieure se fait volontairement
// à la main (bouton « Redeploy » sur un déploiement passé dans le tableau
// de bord Railway, ou `git revert` + nouveau déploiement) pour ne jamais
// couper la production sur un simple clic sans confirmation humaine complète.
// ---------------------------------------------------------------------------

router.get('/deployment/info', (req: AuthRequest, res: Response): void => {
  const deployInfo = getDeployInfo();
  const metrics = getMetricsSnapshot();
  const railwayEnvironment = process.env.RAILWAY_ENVIRONMENT_NAME || null;
  const railwayService = process.env.RAILWAY_SERVICE_NAME || null;

  res.json({
    currentVersion: {
      appVersion: getAppVersion(),
      commitSha: deployInfo.headShort || null,
      commitMessage: deployInfo.commits[0]?.message || null,
      commitAuthor: deployInfo.commits[0]?.author || null,
      deployedAt: metrics.serverStartedAt,
    },
    history: deployInfo.commits.map((c, i) => ({ ...c, isCurrent: i === 0 })),
    environments: [
      {
        key: 'development',
        name: 'Développement',
        detail: 'Poste local (WAMP + MySQL locale) — pas de déploiement, exécution directe du code source.',
        exists: true,
        active: !railwayEnvironment,
      },
      {
        key: 'staging',
        name: 'Test / Staging',
        detail: "N'existe pas : il n'y a qu'un seul environnement Railway aujourd'hui, directement en production. Les migrations sont testées manuellement avant application en production.",
        exists: false,
        active: false,
      },
      {
        key: 'production',
        name: 'Production',
        detail: railwayService ? `Railway — service « ${railwayService} » (${railwayEnvironment || 'production'})` : 'Railway',
        exists: true,
        active: Boolean(railwayEnvironment),
      },
    ],
    deploymentStatus: {
      state: 'ok',
      uptimeSeconds: metrics.uptimeSeconds,
      serverStartedAt: metrics.serverStartedAt,
    },
    rollback: {
      available: false,
      reason: "Pas de rollback automatique par sécurité : un clic malheureux ne doit pas pouvoir couper la production. Pour revenir à une version antérieure, utilisez le bouton « Redeploy » sur un déploiement passé dans le tableau de bord Railway, ou faites un `git revert` suivi d'un nouveau déploiement.",
    },
  });
});

// ---------------------------------------------------------------------------
// Comptes : le développeur voit tous les comptes (client compris), mais les
// actions de gestion (créer, changer de rôle, permissions, statut, accès)
// restent réservées aux comptes internes (staff/admin) — la structure des
// rôles ne concerne pas les comptes clients.
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
// Visibilité complète sur demande explicite du client : le développeur doit
// tout voir, y compris les autres comptes développeur s'il y en a. Les
// actions de gestion plus bas (créer, changer de rôle, suspendre,
// réinitialiser...) restent volontairement limitées aux comptes internes
// (staff/admin) : "gérer la structure des comptes" ne veut pas dire agir
// sur les comptes clients ou développeur, seulement pouvoir les consulter.
router.get('/accounts', (req: AuthRequest, res: Response): void => {
  const accounts = db.users.map(toAccountSummary);
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

// Pour les endpoints en lecture seule uniquement (voir un compte, voir ses
// sessions) : n'importe quel compte est consultable.
function findAnyAccount(id: string, res: Response) {
  const user = db.users.find((u) => u.id === id);
  if (!user) {
    res.status(404).json({ error: 'Compte introuvable.' });
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
  const user = findAnyAccount(req.params.id, res);
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

// POST /api/developer/accounts/:id/impersonate
// Connexion directe sur n'importe quel compte, sans mot de passe — un accès
// puissant, donc toujours journalisé explicitement (qui, sur quel compte,
// quand). Fonctionne sur tous les rôles (client compris), à la différence
// des actions de gestion ci-dessus qui restent limitées aux comptes internes.
router.post('/accounts/:id/impersonate', (req: AuthRequest, res: Response): void => {
  const user = findAnyAccount(req.params.id, res);
  if (!user) return;

  if (user.id === req.user?.id) {
    res.status(400).json({ error: 'Vous êtes déjà connecté sur ce compte.' });
    return;
  }

  const sessionId = db.recordSession({
    userId: user.id,
    ipAddress: req.ip || null,
    userAgent: req.headers['user-agent'] || null,
    deviceLabel: `${describeDevice(req.headers['user-agent'])} (connexion développeur)`,
  });
  const token = generateToken(user, sessionId);
  const refreshToken = generateRefreshToken(user);

  db.logActivity({
    actor_id: req.user?.id,
    actor_name: req.user?.full_name,
    actor_role: req.user?.role,
    action: 'developer_impersonation',
    target_type: 'user',
    target_id: user.id,
    details: `Le développeur s'est connecté directement sur le compte de ${user.full_name} (${user.email}, rôle ${user.role}).`,
    ip_address: req.ip,
  });

  res.json({ message: `Connexion en tant que ${user.full_name}.`, token, refreshToken, user });
});

// DELETE /api/developer/accounts/:id — comptes internes uniquement,
// suppression définitive (pas une désactivation).
router.delete('/accounts/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const user = findInternalAccount(req.params.id, res);
  if (!user) return;

  if (user.role === 'admin') {
    const adminCount = db.users.filter((u) => u.role === 'admin').length;
    if (adminCount <= 1) {
      res.status(400).json({ error: 'Impossible de supprimer le dernier compte administrateur.' });
      return;
    }
  }

  const { id, full_name, email, role } = user;

  try {
    await db.deleteUser(id);
  } catch (error: any) {
    if (error?.errno === 1451) {
      res.status(409).json({ error: `${full_name} a des commandes, avis ou livrables liés à son compte et ne peut pas être supprimé — désactivez-le plutôt.` });
      return;
    }
    console.error('[Developer] Échec de la suppression de compte:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du compte.' });
    return;
  }

  db.logActivity({
    actor_id: req.user?.id,
    actor_name: req.user?.full_name,
    actor_role: req.user?.role,
    action: 'user_deleted',
    target_type: 'user',
    target_id: id,
    details: `Compte interne "${full_name}" (${email}, rôle ${role}) supprimé définitivement par le développeur.`,
    ip_address: req.ip,
  });

  res.json({ message: `${full_name} a été supprimé.` });
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

// ---------------------------------------------------------------------------
// Gestion de l'API : endpoints réels + trafic en direct, clés API pour un
// accès externe, webhooks sortants, état des services externes.
// ---------------------------------------------------------------------------

// GET /api/developer/logs — journal technique unifié (erreurs serveur/API,
// paiements, synchronisation, authentification, connexions, erreurs
// JavaScript côté client), avec recherche. Distinct du journal d'activité
// (qui répond à "qui a fait quoi", pas "qu'est-ce qui s'est passé").
router.get('/logs', (req: AuthRequest, res: Response): void => {
  const { search, level, source } = req.query;
  const logs = getLogs({
    search: typeof search === 'string' ? search : undefined,
    level: typeof level === 'string' && ['error', 'warn', 'info'].includes(level) ? (level as LogLevel) : undefined,
    source: typeof source === 'string' && source !== 'all' ? source : undefined,
  });
  res.json({ logs, sources: getLogSources() });
});

// GET /api/developer/endpoints — la liste réelle des routes enregistrées
// dans Express, avec leur trafic et leur taux d'erreur en direct depuis le
// dernier redémarrage. Rien n'est écrit à la main ici : c'est une
// introspection de l'application elle-même.
router.get('/endpoints', (req: AuthRequest, res: Response): void => {
  const registry = expressAppRef ? listEndpoints(expressAppRef) : [];
  const stats = new Map(getEndpointStats().map((s) => [`${s.method} ${s.path}`, s]));

  const endpoints = registry.map(({ method, path: p }) => {
    const stat = stats.get(`${method} ${p}`);
    const requestCount = stat?.requestCount || 0;
    const errorCount = stat?.errorCount || 0;
    const errorRate = requestCount > 0 ? errorCount / requestCount : 0;
    const state: ServiceHealthState = requestCount === 0 ? 'unknown' : errorRate >= 0.1 ? 'degraded' : 'ok';
    return { method, path: p, requestCount, errorCount, state };
  });

  res.json({ endpoints });
});

// GET /api/developer/external-services — état réel de configuration (pas
// de test d'appel réseau) des intégrations externes connues de l'app.
router.get('/external-services', (req: AuthRequest, res: Response): void => {
  const services = [
    { name: 'MTN Mobile Money', configured: Boolean(process.env.MTN_API_KEY), detail: process.env.MTN_API_KEY ? 'Clé configurée' : 'Non configuré (mode démo)' },
    { name: 'Orange Money', configured: Boolean(process.env.ORANGE_API_KEY), detail: process.env.ORANGE_API_KEY ? 'Clé configurée' : 'Non configuré (mode démo)' },
    { name: 'Moov Money', configured: Boolean(process.env.MOOV_API_KEY), detail: process.env.MOOV_API_KEY ? 'Clé configurée' : 'Non configuré (mode démo)' },
    { name: 'CinetPay', configured: Boolean(process.env.CINETPAY_API_KEY), detail: process.env.CINETPAY_API_KEY ? 'Clé configurée' : 'Non configuré (mode démo)' },
    { name: 'Base de données MySQL', configured: true, detail: `${process.env.DB_HOST || '127.0.0.1'}` },
  ];
  res.json({ services });
});

// GET /api/developer/api-keys
router.get('/api-keys', (req: AuthRequest, res: Response): void => {
  const keys = db.apiKeys.map(({ key_hash, ...rest }) => rest);
  res.json({ apiKeys: keys });
});

// POST /api/developer/api-keys — la clé en clair n'est renvoyée qu'une
// fois, à la création ; seul son hash est conservé ensuite.
router.post('/api-keys', (req: AuthRequest, res: Response): void => {
  const { name, scopes } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'Un nom est requis pour identifier la clé.' });
    return;
  }
  if (!Array.isArray(scopes) || scopes.length === 0 || !scopes.every((s) => (API_SCOPES as readonly string[]).includes(s))) {
    res.status(400).json({ error: `Au moins une portée valide est requise (${API_SCOPES.join(', ')}).` });
    return;
  }

  const { fullKey, prefix, hash } = generateApiKey();
  const id = `key-${Date.now()}`;

  db.apiKeys.push({
    id,
    name: name.trim(),
    key_prefix: prefix,
    key_hash: hash,
    scopes: scopes as ApiScope[],
    status: 'active',
    created_by: req.user?.id,
    last_used_at: null,
    request_count: 0,
    created_at: new Date().toISOString(),
    revoked_at: null,
  } as any);

  db.logActivity({
    actor_id: req.user?.id,
    actor_name: req.user?.full_name,
    actor_role: req.user?.role,
    action: 'api_key_created',
    details: `Clé API "${name}" créée (portées : ${scopes.join(', ')}).`,
    ip_address: req.ip,
  });

  res.status(201).json({ message: 'Clé API créée. Elle ne sera plus affichée en clair.', fullKey, apiKey: { id, name, key_prefix: prefix, scopes, status: 'active' } });
});

// DELETE /api/developer/api-keys/:id — révocation (pas de suppression :
// on garde la trace de son existence et de son usage passé).
router.delete('/api-keys/:id', (req: AuthRequest, res: Response): void => {
  const key = db.apiKeys.find((k) => k.id === req.params.id);
  if (!key) {
    res.status(404).json({ error: 'Clé API introuvable.' });
    return;
  }

  key.status = 'revoked';
  key.revoked_at = new Date().toISOString();

  db.logActivity({
    actor_id: req.user?.id,
    actor_name: req.user?.full_name,
    actor_role: req.user?.role,
    action: 'api_key_revoked',
    details: `Clé API "${key.name}" révoquée.`,
    ip_address: req.ip,
  });

  res.json({ message: `Clé "${key.name}" révoquée.` });
});

// GET /api/developer/webhooks
router.get('/webhooks', (req: AuthRequest, res: Response): void => {
  const webhooks = db.webhooks.map(({ secret, ...rest }) => rest);
  res.json({ webhooks });
});

// POST /api/developer/webhooks
router.post('/webhooks', (req: AuthRequest, res: Response): void => {
  const { url, event } = req.body;

  if (!url || typeof url !== 'string' || !/^https?:\/\//.test(url)) {
    res.status(400).json({ error: 'URL de webhook invalide (doit commencer par http:// ou https://).' });
    return;
  }
  if (!WEBHOOK_EVENTS.includes(event)) {
    res.status(400).json({ error: `Événement invalide (attendu : ${WEBHOOK_EVENTS.join(', ')}).` });
    return;
  }

  const id = `wh-${Date.now()}`;
  const secret = crypto.randomBytes(20).toString('hex');

  db.webhooks.push({
    id,
    url,
    event: event as WebhookEvent,
    secret,
    status: 'active',
    created_by: req.user?.id,
    last_triggered_at: null,
    last_status_code: null,
    created_at: new Date().toISOString(),
  } as any);

  db.logActivity({
    actor_id: req.user?.id,
    actor_name: req.user?.full_name,
    actor_role: req.user?.role,
    action: 'webhook_created',
    details: `Webhook créé pour l'événement "${event}" → ${url}.`,
    ip_address: req.ip,
  });

  res.status(201).json({ message: 'Webhook créé.', secret, webhook: { id, url, event, status: 'active' } });
});

// PUT /api/developer/webhooks/:id/status — activer / désactiver
router.put('/webhooks/:id/status', (req: AuthRequest, res: Response): void => {
  const webhook = db.webhooks.find((w) => w.id === req.params.id);
  if (!webhook) {
    res.status(404).json({ error: 'Webhook introuvable.' });
    return;
  }
  const { status } = req.body;
  if (!['active', 'disabled'].includes(status)) {
    res.status(400).json({ error: 'Statut invalide.' });
    return;
  }
  webhook.status = status;
  res.json({ message: `Webhook ${status === 'active' ? 'activé' : 'désactivé'}.` });
});

// DELETE /api/developer/webhooks/:id
router.delete('/webhooks/:id', (req: AuthRequest, res: Response): void => {
  const index = db.webhooks.findIndex((w) => w.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: 'Webhook introuvable.' });
    return;
  }
  const [removed] = db.webhooks.splice(index, 1);

  db.logActivity({
    actor_id: req.user?.id,
    actor_name: req.user?.full_name,
    actor_role: req.user?.role,
    action: 'webhook_deleted',
    details: `Webhook pour "${removed.event}" (${removed.url}) supprimé.`,
    ip_address: req.ip,
  });

  res.json({ message: 'Webhook supprimé.' });
});

// GET /api/developer/webhooks/:id/deliveries
router.get('/webhooks/:id/deliveries', (req: AuthRequest, res: Response): void => {
  const deliveries = db.webhookDeliveries
    .filter((d) => d.webhook_id === req.params.id)
    .slice(0, 20);
  res.json({ deliveries });
});

export default router;
