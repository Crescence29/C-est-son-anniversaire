export type UserRole = 'client' | 'staff' | 'admin';
export type UserStatus = 'active' | 'suspended';

export interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  is_super_admin?: boolean;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
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
