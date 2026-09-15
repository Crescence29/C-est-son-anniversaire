// 'developer' is a role of its own, not a level above 'admin': it is
// deliberately excluded from every requireRole('admin') check across the
// API, so a developer account never automatically gains access to business
// data (customers, orders, payments) — see src/server/routes/developer.ts.
export type UserRole = 'client' | 'staff' | 'admin' | 'developer';
export type UserStatus = 'active' | 'suspended';

// Internal hierarchy shown alongside the existing staff/admin role — it
// refines who's who within the business side without changing what the
// underlying role/permission checks actually gate.
export type AdminLevel = 'super_admin' | 'administrateur' | 'manager' | 'utilisateur';

export interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: UserRole;
  admin_level?: AdminLevel | null;
  permissions?: string[];
  status: UserStatus;
  is_super_admin?: boolean;
  is_banned?: boolean;
  status_reason?: string | null;
  token_version?: number;
  avatar_url?: string;
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
}

// Granular permissions an internal account (staff/admin) can be given on
// top of its role. Enforced today on the developer-only account-management
// routes (src/server/routes/developer.ts); not yet retrofitted across every
// existing /api/admin/* and /api/staff/* route — see rapport.md.
export const ACCOUNT_PERMISSION_KEYS = [
  'orders.manage',
  'catalog.manage',
  'users.manage',
  'settings.manage',
  'reviews.moderate',
  'support.respond',
] as const;
export type AccountPermission = (typeof ACCOUNT_PERMISSION_KEYS)[number];

export interface AccountSession {
  id: string;
  user_id: string;
  ip_address: string | null;
  user_agent: string | null;
  device_label: string | null;
  created_at: string;
  last_seen_at: string;
  revoked_at: string | null;
}

export interface SiteSettings {
  logo_mode: 'image' | 'text';
  logo_text: string;
  hero_title_line1: string;
  hero_title_line2: string;
  hero_subtitle: string;
  hero_images: string[];
  hero_cta_primary_label: string;
  hero_cta_secondary_label: string;
  trust_rating_value: string;
  trust_rating_suffix: string;
  show_videos_section: boolean;
  show_steps_section: boolean;
  show_testimonials_section: boolean;
  show_bottom_cta_section: boolean;
  bottom_cta_title: string;
  bottom_cta_subtitle: string;
  bottom_cta_button_label: string;
  social_whatsapp: string;
  social_facebook: string;
  social_youtube: string;
  social_tiktok: string;
  social_linkedin: string;
  social_live_stream: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  position: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type SupportMessageStatus = 'open' | 'answered';

export interface SupportMessage {
  id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  subject: string;
  message: string;
  status: SupportMessageStatus;
  reply?: string | null;
  replied_by?: string | null;
  replied_by_name?: string | null;
  replied_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  actor_id?: string;
  actor_name?: string;
  actor_role?: UserRole;
  action: string;
  target_type?: string;
  target_id?: string;
  details?: string;
  ip_address?: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  commission_rate: number; // e.g. 15 for 15%
  is_active: boolean;
  icon_name: string;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  category_id: string;
  category_name?: string;
  category_slug?: string;
  name: string;
  slug: string;
  description: string;
  short_description: string;
  price: number;
  currency: string; // 'FCFA' or 'EUR'
  delay_label: string; // '24h', '12h', '48h'
  image_url: string;
  is_available: boolean;
  is_featured: boolean;
  is_live_broadcast: boolean;
  features?: string[];
  created_at: string;
  updated_at: string;
}

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'accepted'
  | 'in_progress'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export interface Order {
  id: string;
  order_number: string;
  client_id: string;
  client_name?: string;
  client_phone?: string;
  client_email?: string;
  service_id: string;
  service_name?: string;
  service_image?: string;
  category_id: string;
  category_name?: string;
  recipient_name: string;
  recipient_phone: string;
  birthday_date: string;
  message: string;
  special_instructions?: string;
  status: OrderStatus;
  amount: number;
  currency: string;
  commission_rate: number;
  commission_amount: number;
  net_amount: number;
  payment_method?: string;
  deliverables?: OrderDeliverable[];
  delivered_at?: string;
  created_at: string;
  updated_at: string;
}

export type PaymentStatus = 'pending' | 'success' | 'failed' | 'refunded';
export type PaymentProviderType =
  | 'mock'
  | 'mtn'
  | 'moov'
  | 'orange'
  | 'celtiis'
  | 'cinetpay'
  | 'fedapay'
  | 'flutterwave';

export interface Payment {
  id: string;
  order_id: string;
  order_number?: string;
  user_id: string;
  user_name?: string;
  provider: PaymentProviderType;
  provider_reference: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  phone_number: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Commission {
  id: string;
  category_id: string;
  category_name?: string;
  rate: number;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export type ReviewStatus = 'pending' | 'published' | 'hidden';

export interface Review {
  id: string;
  order_id: string;
  service_id: string;
  service_name?: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  rating: number;
  comment: string;
  status: ReviewStatus;
  created_at: string;
  updated_at: string;
}

export interface FeaturedVideo {
  id: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string;
  is_active: boolean;
  position: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderDeliverable {
  id: string;
  order_id: string;
  file_url: string;
  file_type: 'video' | 'audio' | 'image' | 'document';
  note?: string;
  uploaded_by: string;
  uploaded_by_name?: string;
  created_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  service_id: string;
  service?: Service;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'order' | 'payment' | 'system' | 'delivery' | 'review';
  is_read: boolean;
  link_url?: string;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface StaffDashboardStats {
  pendingOrdersCount: number;
  inProgressOrdersCount: number;
  deliveredOrdersCount: number;
  todayRevenue: number;
  activeServicesCount: number;
  featuredVideosCount: number;
}

export interface AdminDashboardStats {
  totalRevenue: number;
  totalCommissions: number;
  totalOrdersCount: number;
  newClientsCount: number;
  pendingReviewsCount: number;
  recentTransactions: Payment[];
  recentUsers: User[];
  ordersByStatus: Record<OrderStatus, number>;
  revenueByCategory: { category: string; revenue: number; commission: number }[];
}

export interface ClientDashboardStats {
  totalOrders: number;
  ordersInProgress: number;
  ordersDelivered: number;
  favoritesCount: number;
  unreadNotificationsCount: number;
}

export type ServiceHealthState = 'ok' | 'degraded' | 'down' | 'unknown';

export interface SystemStatusService {
  name: string;
  state: ServiceHealthState;
  detail?: string;
}

export interface SystemStatusError {
  message: string;
  path: string;
  at: string;
}

export interface ConnectedUserSummary {
  id: string;
  name: string;
  role: UserRole;
  lastActiveAt: string;
}

export interface SystemStatus {
  serverState: ServiceHealthState;
  apiState: ServiceHealthState;
  databaseState: ServiceHealthState;
  databasePingMs: number | null;
  avgResponseTimeMs: number;
  requestCount: number;
  recentErrors: SystemStatusError[];
  connectedUsersCount: number;
  connectedUsers: ConnectedUserSummary[];
  appVersion: string;
  lastDeployAt: string;
  lastBackupAt: string | null;
  uptimeSeconds: number;
  disk: { usedPercent: number; totalGB: number; usedGB: number } | null;
  memory: { usedPercent: number; totalMB: number; usedMB: number };
  cpuLoadPercent: number | null;
  services: SystemStatusService[];
}

// ---------------------------------------------------------------------------
// API management (clés API, webhooks, endpoints) — voir
// src/server/routes/publicApi.ts et src/server/routes/developer.ts
// ---------------------------------------------------------------------------

export const API_SCOPES = ['catalog:read', 'orders:read'] as const;
export type ApiScope = (typeof API_SCOPES)[number];

export interface ApiKeySummary {
  id: string;
  name: string;
  key_prefix: string;
  scopes: ApiScope[];
  status: 'active' | 'revoked';
  last_used_at: string | null;
  request_count: number;
  created_at: string;
  revoked_at: string | null;
}

export const WEBHOOK_EVENTS = ['order.created', 'order.delivered', 'payment.succeeded'] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export interface WebhookSummary {
  id: string;
  url: string;
  event: WebhookEvent;
  status: 'active' | 'disabled';
  last_triggered_at: string | null;
  last_status_code: number | null;
  created_at: string;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event: string;
  status_code: number | null;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

export interface EndpointStat {
  method: string;
  path: string;
  requestCount: number;
  errorCount: number;
  state: ServiceHealthState;
}

export interface ExternalServiceStatus {
  name: string;
  configured: boolean;
  detail: string;
}

export type LogLevel = 'error' | 'warn' | 'info';

export interface LogEntry {
  id: string;
  level: LogLevel;
  source: string;
  message: string;
  reference: string | null;
  at: string;
}

// ---------------------------------------------------------------------------
// Surveillance de la base de données — voir src/server/routes/developer.ts
// (/database/status, /database/tables, /database/migrations,
// /database/integrity-check). Introspection MySQL en direct, pas de valeurs
// simulées.
// ---------------------------------------------------------------------------

export interface DatabaseStatus {
  engine: 'MySQL';
  state: ServiceHealthState;
  databaseName: string | null;
  pingMs: number;
  tableCount: number;
  approxRecordCount: number;
  sizeBytes: number;
  activeConnections: number;
  slowQueriesTotal: number;
  mysqlUptimeSeconds: number;
  lastBackupAt: string | null;
  recentSqlErrors: LogEntry[];
}

export interface DatabaseTableInfo {
  name: string;
  engine: string | null;
  approxRows: number;
  sizeBytes: number;
  collation: string | null;
}

export interface DatabaseMigration {
  file: string;
  appliedInProduction: boolean;
}

export interface IntegrityCheckResult {
  check: string;
  status: 'ok' | 'warning' | 'error';
  detail: string;
}

// ---------------------------------------------------------------------------
// Fichiers et médias — voir src/server/mediaAudit.ts et
// src/server/routes/developer.ts (/media/summary, /media/check-links,
// /media/cleanup-orphan-references). Cette plateforme ne stocke aucun
// fichier elle-même : tout est audité comme des liens externes.
// ---------------------------------------------------------------------------

export type MediaKind = 'image' | 'video' | 'audio' | 'document' | 'autre';

export interface MediaSummary {
  total: number;
  byKind: Record<string, number>;
  byDomain: Record<string, number>;
}

export interface MediaReference {
  url: string;
  kind: MediaKind;
  source: string;
  sourceId: string;
}

export interface MediaLinkCheckResult extends MediaReference {
  ok: boolean;
  status: number | null;
  contentType: string | null;
  contentLengthBytes: number | null;
  error?: string;
}

// ---------------------------------------------------------------------------
// Déploiement et versions — voir src/server/routes/developer.ts
// (/deployment/info). Le commit réellement déployé est fourni via des
// variables Railway positionnées juste avant chaque redéploiement
// (GIT_COMMIT_SHA/MESSAGE/AUTHOR) et l'historique est enregistré durablement
// en base (journal d'activité, action 'deployment') à chaque démarrage sur
// un nouveau commit — pas de valeur simulée. Pas de rollback automatique par
// sécurité.
// ---------------------------------------------------------------------------

export interface DeployCommitEntry {
  sha: string;
  message: string | null;
  deployedAt: string;
  isCurrent: boolean;
}

export interface DeploymentEnvironmentInfo {
  key: 'development' | 'staging' | 'production';
  name: string;
  detail: string;
  exists: boolean;
  active: boolean;
}

export interface DeploymentInfo {
  currentVersion: {
    appVersion: string;
    commitSha: string | null;
    commitMessage: string | null;
    deployedAt: string;
  };
  history: DeployCommitEntry[];
  environments: DeploymentEnvironmentInfo[];
  deploymentStatus: { state: ServiceHealthState; uptimeSeconds: number; serverStartedAt: string };
  rollback: { available: boolean; reason: string };
}
