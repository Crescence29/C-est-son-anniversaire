import mysql, { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { User, Category, Service, Order, Payment, Commission, Review, FeaturedVideo, OrderDeliverable, Favorite, Notification, ActivityLog, OrderStatus, UserRole, StaffDashboardStats, AdminDashboardStats, ClientDashboardStats, SiteSettings, FaqItem, SupportMessage } from '../types.ts';

const DEFAULT_SITE_SETTINGS: SiteSettings = {
  logo_mode: 'image',
  logo_text: 'C’EST SON ANNIVERSAIRE',
  hero_title_line1: 'Votre émission',
  hero_title_line2: 'C’EST SON ANNIVERSAIRE',
  hero_subtitle: 'Moment de détente',
  hero_images: ['/HDB1.jpg', '/HBD2.jpg', '/HBD3.jpg', '/HBD4.jpg'],
  hero_cta_primary_label: 'Découvrir les prestations',
  hero_cta_secondary_label: 'Voir les réactions en direct',
  trust_rating_value: '4.0 / 5',
  trust_rating_suffix: '(100+ jubilaires émus)',
  show_videos_section: true,
  show_steps_section: true,
  show_testimonials_section: true,
  show_bottom_cta_section: true,
  bottom_cta_title: 'Un anniversaire arrive bientôt ?',
  bottom_cta_subtitle: 'Ne laissez pas passer l’occasion d’offrir des frissons et des souvenirs éternels. Réservez la surprise en quelques clics.',
  bottom_cta_button_label: 'Explorer le catalogue',
  social_whatsapp: 'https://whatsapp.com/channel/0029VanTjhu05MUXjsn0l51S',
  social_facebook: 'https://www.facebook.com/cortexbenintv',
  social_youtube: 'https://youtube.com/@cortexbenintv',
  social_tiktok: 'https://vm.tiktok.com/ZS9Brm9XQDjB7-TbCqm/',
  social_linkedin: '',
  social_live_stream: '',
};

interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
}

type TableName =
  | 'users' | 'categories' | 'services' | 'orders' | 'payments' | 'commissions'
  | 'reviews' | 'featured_videos' | 'order_deliverables' | 'favorites' | 'notifications' | 'refresh_tokens'
  | 'activity_logs' | 'faq_items' | 'support_messages';

const TABLES: Record<TableName, { primaryKey: string; columns: string[] }> = {
  users: { primaryKey: 'id', columns: ['id', 'full_name', 'email', 'phone', 'password_hash', 'role', 'status', 'is_super_admin', 'is_banned', 'status_reason', 'avatar_url', 'reset_password_token', 'reset_password_expires_at', 'created_at', 'updated_at'] },
  categories: { primaryKey: 'id', columns: ['id', 'name', 'slug', 'description', 'image_url', 'icon_name', 'commission_rate', 'is_active', 'created_at', 'updated_at'] },
  services: { primaryKey: 'id', columns: ['id', 'category_id', 'name', 'slug', 'description', 'short_description', 'price', 'currency', 'delay_label', 'image_url', 'is_available', 'is_featured', 'is_live_broadcast', 'created_at', 'updated_at'] },
  orders: { primaryKey: 'id', columns: ['id', 'order_number', 'client_id', 'service_id', 'category_id', 'recipient_name', 'recipient_phone', 'birthday_date', 'message', 'special_instructions', 'status', 'amount', 'currency', 'commission_rate', 'commission_amount', 'net_amount', 'delivered_at', 'created_at', 'updated_at'] },
  payments: { primaryKey: 'id', columns: ['id', 'order_id', 'user_id', 'provider', 'provider_reference', 'amount', 'currency', 'status', 'phone_number', 'paid_at', 'created_at', 'updated_at'] },
  commissions: { primaryKey: 'id', columns: ['id', 'category_id', 'rate', 'updated_by', 'created_at', 'updated_at'] },
  reviews: { primaryKey: 'id', columns: ['id', 'order_id', 'service_id', 'user_id', 'rating', 'comment', 'status', 'created_at', 'updated_at'] },
  featured_videos: { primaryKey: 'id', columns: ['id', 'title', 'description', 'video_url', 'thumbnail_url', 'is_active', 'position', 'created_by', 'created_at', 'updated_at'] },
  order_deliverables: { primaryKey: 'id', columns: ['id', 'order_id', 'file_url', 'file_type', 'note', 'uploaded_by', 'created_at'] },
  favorites: { primaryKey: 'id', columns: ['id', 'user_id', 'service_id', 'created_at'] },
  notifications: { primaryKey: 'id', columns: ['id', 'user_id', 'title', 'message', 'type', 'is_read', 'link_url', 'created_at'] },
  refresh_tokens: { primaryKey: 'id', columns: ['id', 'user_id', 'token_hash', 'expires_at', 'revoked_at', 'created_at'] },
  activity_logs: { primaryKey: 'id', columns: ['id', 'actor_id', 'actor_name', 'actor_role', 'action', 'target_type', 'target_id', 'details', 'ip_address', 'created_at'] },
  faq_items: { primaryKey: 'id', columns: ['id', 'question', 'answer', 'position', 'is_active', 'created_at', 'updated_at'] },
  support_messages: { primaryKey: 'id', columns: ['id', 'user_id', 'subject', 'message', 'status', 'reply', 'replied_by', 'replied_by_name', 'replied_at', 'created_at', 'updated_at'] },
};

function envConfig(): DbConfig {
  return {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'cest_son_anniversaire',
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  };
}

function iso(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normalizeRow(row: Record<string, any>): Record<string, any> {
  const out = { ...row };
  for (const key of ['created_at', 'updated_at', 'paid_at', 'delivered_at', 'reset_password_expires_at', 'expires_at', 'revoked_at']) {
    if (key in out && out[key] != null) out[key] = iso(out[key]);
  }
  for (const key of ['is_active', 'is_available', 'is_featured', 'is_live_broadcast', 'is_read', 'is_super_admin', 'is_banned']) {
    if (key in out) out[key] = Boolean(out[key]);
  }
  for (const key of ['price', 'amount', 'commission_rate', 'commission_amount', 'net_amount', 'rate']) {
    if (key in out && out[key] != null) out[key] = Number(out[key]);
  }
  return out;
}

function columnsFor(table: TableName) {
  return TABLES[table].columns;
}

class DataStore {
  users: User[] = [];
  categories: Category[] = [];
  services: Service[] = [];
  orders: Order[] = [];
  payments: Payment[] = [];
  commissions: Commission[] = [];
  reviews: Review[] = [];
  featuredVideos: FeaturedVideo[] = [];
  orderDeliverables: OrderDeliverable[] = [];
  favorites: Favorite[] = [];
  notifications: Notification[] = [];
  activityLogs: ActivityLog[] = [];
  faqItems: FaqItem[] = [];
  supportMessages: SupportMessage[] = [];
  siteSettings: SiteSettings = { ...DEFAULT_SITE_SETTINGS };
  passwords = new Map<string, string>();
  refreshTokens = new Map<string, { userId: string; expiresAt: Date }>();

  readonly pool: Pool;
  readonly ready: Promise<void>;
  private pendingWrites: Promise<unknown>[] = [];
  private writeChain: Promise<void> = Promise.resolve();
  private proxiesReady = false;

  constructor() {
    this.pool = mysql.createPool(envConfig());
    this.ready = this.initialize();
  }

  private queue(taskFactory: () => Promise<unknown>) {
    // Exécute les écritures séquentiellement. Cela évite les courses entre
    // INSERT/UPDATE et les contraintes de clés étrangères (ex. user -> notification).
    const safe = this.writeChain
      .then(() => taskFactory())
      .then(() => undefined)
      .catch((error) => {
        console.error('[MySQL] Write failed:', error.message);
        throw error;
      });

    this.writeChain = safe.catch(() => undefined);
    this.pendingWrites.push(safe);

    safe.finally(() => {
      this.pendingWrites = this.pendingWrites.filter((p) => p !== safe);
    }).catch(() => undefined);
  }

  async flush() {
    await this.writeChain;
  }

  private async initialize() {
    const connection = await this.pool.getConnection();
    try {
      await connection.ping();
      await this.loadAll(connection);
      this.installPersistenceProxies();
      console.log('[MySQL] Connexion établie et données chargées.');
    } finally {
      connection.release();
    }
  }

  private async loadAll(connection: mysql.PoolConnection) {
    const load = async <T extends Record<string, any>>(table: TableName): Promise<T[]> => {
      const [rows] = await connection.query<RowDataPacket[]>(`SELECT * FROM \`${table}\``);
      return rows.map((row) => normalizeRow(row as Record<string, any>)) as T[];
    };

    this.users = await load<User>('users');
    this.categories = await load<Category>('categories');
    this.services = await load<Service>('services');
    this.orders = await load<Order>('orders');
    this.payments = await load<Payment>('payments');
    this.commissions = await load<Commission>('commissions');
    this.reviews = await load<Review>('reviews');
    this.featuredVideos = await load<FeaturedVideo>('featured_videos');
    this.orderDeliverables = await load<OrderDeliverable>('order_deliverables');
    this.favorites = await load<Favorite>('favorites');
    this.notifications = await load<Notification>('notifications');
    this.faqItems = await load<FaqItem>('faq_items');
    this.supportMessages = await load<SupportMessage>('support_messages');

    // Ne garder que les événements récents en mémoire : le journal grossit en
    // continu, contrairement aux autres tables qui restent de taille bornée.
    const [activityRows] = await connection.query<RowDataPacket[]>(
      'SELECT * FROM `activity_logs` ORDER BY created_at DESC LIMIT 500'
    );
    this.activityLogs = activityRows.map((row) => normalizeRow(row as Record<string, any>)) as ActivityLog[];

    const [settingsRows] = await connection.query<RowDataPacket[]>(
      "SELECT data FROM `site_settings` WHERE id = 'main'"
    );
    if (settingsRows.length > 0) {
      const stored = typeof settingsRows[0].data === 'string' ? JSON.parse(settingsRows[0].data) : settingsRows[0].data;
      this.siteSettings = { ...DEFAULT_SITE_SETTINGS, ...stored };
    } else {
      this.siteSettings = { ...DEFAULT_SITE_SETTINGS };
    }

    for (const user of this.users) {
      const row = user as User & { password_hash?: string };
      if (row.password_hash) this.passwords.set(user.id, row.password_hash);
      delete row.password_hash;
    }

    this.refreshTokens.clear();

    this.enrichData();
  }

  private enrichData() {
    const categoryMap = new Map(this.categories.map((c) => [c.id, c]));
    const serviceMap = new Map(this.services.map((s) => [s.id, s]));
    const userMap = new Map(this.users.map((u) => [u.id, u]));

    this.services.forEach((s) => {
      const c = categoryMap.get(s.category_id);
      s.category_name = c?.name;
      s.category_slug = c?.slug;
    });

    this.orders.forEach((o) => {
      const client = userMap.get(o.client_id);
      const service = serviceMap.get(o.service_id);
      const category = categoryMap.get(o.category_id);
      o.client_name = client?.full_name;
      o.client_phone = client?.phone;
      o.client_email = client?.email;
      o.service_name = service?.name;
      o.service_image = service?.image_url;
      o.category_name = category?.name;
      o.deliverables = this.orderDeliverables.filter((d) => d.order_id === o.id);
    });

    this.supportMessages.forEach((m) => {
      const author = userMap.get(m.user_id);
      m.user_name = author?.full_name;
      m.user_email = author?.email;
      m.user_phone = author?.phone;
    });

    this.payments.forEach((p) => {
      const order = this.orders.find((o) => o.id === p.order_id);
      const user = userMap.get(p.user_id);
      p.order_number = order?.order_number;
      p.user_name = user?.full_name;
    });

    this.reviews.forEach((r) => {
      const service = serviceMap.get(r.service_id);
      const user = userMap.get(r.user_id);
      r.service_name = service?.name;
      r.user_name = user?.full_name || '';
      r.user_avatar = user?.avatar_url;
    });

    this.favorites.forEach((f) => {
      f.service = serviceMap.get(f.service_id);
    });

    this.orderDeliverables.forEach((d) => {
      d.uploaded_by_name = userMap.get(d.uploaded_by)?.full_name || 'Équipe Régie';
    });

    this.commissions.forEach((c) => {
      c.category_name = categoryMap.get(c.category_id)?.name;
    });
  }

  private installPersistenceProxies() {
    if (this.proxiesReady) return;
    this.proxiesReady = true;

    this.users = this.makePersistentArray(this.users, 'users');
    this.categories = this.makePersistentArray(this.categories, 'categories');
    this.services = this.makePersistentArray(this.services, 'services');
    this.orders = this.makePersistentArray(this.orders, 'orders');
    this.payments = this.makePersistentArray(this.payments, 'payments');
    this.commissions = this.makePersistentArray(this.commissions, 'commissions');
    this.reviews = this.makePersistentArray(this.reviews, 'reviews');
    this.featuredVideos = this.makePersistentArray(this.featuredVideos, 'featured_videos');
    this.orderDeliverables = this.makePersistentArray(this.orderDeliverables, 'order_deliverables');
    this.favorites = this.makePersistentArray(this.favorites, 'favorites');
    this.notifications = this.makePersistentArray(this.notifications, 'notifications');
    this.activityLogs = this.makePersistentArray(this.activityLogs, 'activity_logs');
    this.faqItems = this.makePersistentArray(this.faqItems, 'faq_items');
    this.supportMessages = this.makePersistentArray(this.supportMessages, 'support_messages');

    const originalSet = this.passwords.set.bind(this.passwords);
    this.passwords.set = ((userId: string, hash: string) => {
      originalSet(userId, hash);
      this.queue(() => this.updateById('users', userId, { password_hash: hash }));
      return this.passwords;
    }) as typeof this.passwords.set;
  }

  private makePersistentArray<T extends Record<string, any>>(source: T[], table: TableName): T[] {
    const rows = source.map((row) => this.wrapRow(row, table));
    const store = this;
    const handler: ProxyHandler<T[]> = {
      get(target, property, receiver) {
        if (property === 'push' || property === 'unshift') {
          return (...items: T[]) => {
            const wrapped = items.map((item) => store.wrapRow(item, table));
            const result = property === 'push' ? target.push(...wrapped) : target.unshift(...wrapped);
            for (const item of wrapped) store.queue(() => store.insertRow(table, item));
            return result;
          };
        }
        if (property === 'splice') {
          return (start: number, deleteCount?: number, ...items: T[]) => {
            const removed = target.slice(start, deleteCount === undefined ? target.length : start + deleteCount);
            const wrapped = items.map((item) => store.wrapRow(item, table));
            const result = target.splice(start, deleteCount ?? target.length - start, ...wrapped);
            for (const item of removed) store.queue(() => store.deleteRow(table, item));
            for (const item of wrapped) store.queue(() => store.insertRow(table, item));
            return result;
          };
        }
        return Reflect.get(target, property, receiver);
      },
    };
    return new Proxy(rows, handler);
  }

  private wrapRow<T extends Record<string, any>>(row: T, table: TableName): T {
    const store = this;
    return new Proxy(row, {
      set(target, property, value) {
        Reflect.set(target, property, value);
        if (typeof property === 'string' && columnsFor(table).includes(property)) {
          const id = target[TABLES[table].primaryKey];
          if (id !== undefined) store.queue(() => store.updateById(table, id, { [property]: value }));
        }
        return true;
      },
    });
  }

  private dbValue(value: unknown): unknown {
    if (value === undefined) return null;
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
      return new Date(value);
    }
    return value;
  }

  private async insertRow(table: TableName, row: Record<string, any>) {
    const cols = columnsFor(table).filter((column) => row[column] !== undefined || (table === 'users' && column === 'password_hash'));
    const values = cols.map((column) => {
      if (table === 'users' && column === 'password_hash' && row[column] === undefined) return this.passwords.get(row.id) || null;
      return this.dbValue(row[column]);
    });
    if (values.includes(null) && table === 'users' && !this.passwords.get(row.id)) {
      throw new Error('password_hash manquant pour le nouvel utilisateur.');
    }
    const placeholders = cols.map(() => '?').join(', ');
    await this.pool.execute(`INSERT INTO \`${table}\` (${cols.map((c) => `\`${c}\``).join(', ')}) VALUES (${placeholders})`, values as any[]);
  }

  private async updateById(table: TableName, id: string, changes: Record<string, any>) {
    const cols = Object.keys(changes).filter((column) => columnsFor(table).includes(column));
    if (!cols.length) return;
    const values = cols.map((column) => this.dbValue(changes[column]));
    values.push(id);
    await this.pool.execute(`UPDATE \`${table}\` SET ${cols.map((c) => `\`${c}\` = ?`).join(', ')} WHERE \`${TABLES[table].primaryKey}\` = ?`, values as any[]);
  }

  private async deleteRow(table: TableName, row: Record<string, any>) {
    const id = row[TABLES[table].primaryKey];
    await this.pool.execute(`DELETE FROM \`${table}\` WHERE \`${TABLES[table].primaryKey}\` = ?`, [id]);
  }

  isValidStatusTransition(from: OrderStatus, to: OrderStatus): boolean {
    const allowed: Record<OrderStatus, OrderStatus[]> = {
      pending_payment: ['paid', 'cancelled'],
      paid: ['accepted', 'cancelled', 'refunded'],
      accepted: ['in_progress', 'cancelled', 'refunded'],
      in_progress: ['delivered', 'refunded'],
      delivered: ['refunded'],
      cancelled: [],
      refunded: [],
    };

    return allowed[from]?.includes(to) ?? false;
  }

  logActivity(entry: {
    actor_id?: string;
    actor_name?: string;
    actor_role?: UserRole;
    action: string;
    target_type?: string;
    target_id?: string;
    details?: string;
    ip_address?: string;
  }) {
    this.activityLogs.unshift({
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      created_at: new Date().toISOString(),
      ...entry,
    });

    // Le tableau en mémoire reste borné ; l'historique complet vit en base.
    if (this.activityLogs.length > 500) {
      this.activityLogs.length = 500;
    }
  }

  updateSiteSettings(partial: Partial<SiteSettings>) {
    this.siteSettings = { ...this.siteSettings, ...partial };
    const snapshot = this.siteSettings;
    this.queue(() =>
      this.pool.execute(
        "INSERT INTO `site_settings` (id, data) VALUES ('main', ?) ON DUPLICATE KEY UPDATE data = VALUES(data)",
        [JSON.stringify(snapshot)]
      )
    );
  }

  calculateCommission(price: number, categoryId: string) {
    const category = this.categories.find((c) => c.id === categoryId);
    const rate = category?.commission_rate ?? 15;
    const commission = Math.round(price * rate) / 100;
    const net = price - commission;
    return { rate, commission, net };
  }

  getStaffStats(): StaffDashboardStats {
    const pendingOrdersCount = this.orders.filter((o) => o.status === 'paid').length;
    const inProgressOrdersCount = this.orders.filter((o) => o.status === 'in_progress' || o.status === 'accepted').length;
    const deliveredOrdersCount = this.orders.filter((o) => o.status === 'delivered').length;
    const today = new Date().toISOString().slice(0, 10);
    const todayRevenue = this.orders.filter((o) => o.status === 'paid' || o.status === 'accepted' || o.status === 'in_progress' || o.status === 'delivered').filter((o) => o.created_at.slice(0, 10) === today).reduce((sum, o) => sum + Number(o.amount), 0);
    return { pendingOrdersCount, inProgressOrdersCount, deliveredOrdersCount, todayRevenue, activeServicesCount: this.services.filter((s) => s.is_available).length, featuredVideosCount: this.featuredVideos.filter((v) => v.is_active).length };
  }

  getAdminStats(): AdminDashboardStats {
    const validOrders = this.orders.filter((o) => !['pending_payment', 'cancelled', 'refunded'].includes(o.status));
    const totalRevenue = validOrders.reduce((sum, o) => sum + Number(o.amount), 0);
    const totalCommissions = validOrders.reduce((sum, o) => sum + Number(o.commission_amount), 0);
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
    const newClientsCount = this.users.filter((u) => u.role === 'client' && new Date(u.created_at).getTime() >= monthStart).length;
    const ordersByStatus: Record<OrderStatus, number> = { pending_payment: 0, paid: 0, accepted: 0, in_progress: 0, delivered: 0, cancelled: 0, refunded: 0 };
    this.orders.forEach((o) => { ordersByStatus[o.status]++; });
    const revenueByCategory = this.categories.map((c) => {
      const categoryOrders = validOrders.filter((o) => o.category_id === c.id);
      return { category: c.name, revenue: categoryOrders.reduce((sum, o) => sum + Number(o.amount), 0), commission: categoryOrders.reduce((sum, o) => sum + Number(o.commission_amount), 0) };
    }).filter((x) => x.revenue > 0);
    return { totalRevenue, totalCommissions, totalOrdersCount: this.orders.length, newClientsCount, pendingReviewsCount: this.reviews.filter((r) => r.status === 'pending').length, recentTransactions: this.payments.slice(0, 8), recentUsers: this.users.slice(-8).reverse(), ordersByStatus, revenueByCategory };
  }

  getClientStats(userId: string): ClientDashboardStats {
    const userOrders = this.orders.filter((o) => o.client_id === userId);
    return { totalOrders: userOrders.length, ordersInProgress: userOrders.filter((o) => o.status === 'accepted' || o.status === 'in_progress').length, ordersDelivered: userOrders.filter((o) => o.status === 'delivered').length, favoritesCount: this.favorites.filter((f) => f.user_id === userId).length, unreadNotificationsCount: this.notifications.filter((n) => n.user_id === userId && !n.is_read).length };
  }
}

export const db = new DataStore();
