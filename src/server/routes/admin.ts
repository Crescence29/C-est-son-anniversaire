import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../dataStore.ts';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth.ts';
import { User, UserRole, UserStatus, ReviewStatus, Category, Service } from '../../types.ts';

const router = Router();

// Require Admin Role for all routes
router.use(authenticateToken, requireRole('admin'));

// GET /api/admin/stats
router.get('/stats', (req: AuthRequest, res: Response): void => {
  const stats = db.getAdminStats();
  res.json({ stats });
});

// GET /api/admin/activity-logs (réservé au compte développeur protégé)
router.get('/activity-logs', (req: AuthRequest, res: Response): void => {
  if (!req.user?.is_super_admin) {
    res.status(403).json({ error: 'Accès réservé au compte développeur.' });
    return;
  }

  res.json({ logs: db.activityLogs });
});

// GET /api/admin/users
router.get('/users', (req: AuthRequest, res: Response): void => {
  const { role, status, search } = req.query;

  let users = [...db.users];

  // Le compte développeur protégé reste invisible pour tout le monde sauf
  // son titulaire : les autres admins/staff ne doivent même pas savoir qu'il existe.
  if (!req.user?.is_super_admin) {
    users = users.filter((u) => !u.is_super_admin);
  }

  if (role && typeof role === 'string' && role !== 'all') {
    users = users.filter((u) => u.role === role);
  }

  if (status && typeof status === 'string' && status !== 'all') {
    users = users.filter((u) => u.status === status);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    users = users.filter(
      (u) =>
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q)
    );
  }

  res.json({ users });
});

// POST /api/admin/users (créer directement un compte staff/admin/client)
router.post('/users', async (req: AuthRequest, res: Response): Promise<void> => {
  const { full_name, email, phone, password, role } = req.body;

  if (!full_name || !email || !phone || !password) {
    res.status(400).json({ error: 'Tous les champs (nom, email, téléphone, mot de passe) sont obligatoires.' });
    return;
  }

  if (!['client', 'staff', 'admin'].includes(role)) {
    res.status(400).json({ error: 'Rôle invalide.' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
    return;
  }

  const existingUser = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    res.status(409).json({ error: 'Un compte avec cette adresse email existe déjà.' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const userId = `usr-${role}-${Date.now()}`;

  const newUser: User = {
    id: userId,
    full_name,
    email: email.toLowerCase(),
    phone,
    role: role as UserRole,
    status: 'active',
    avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(full_name)}&backgroundColor=d94a76,4a2170`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.users.push(newUser);
  db.passwords.set(userId, passwordHash);

  db.logActivity({
    actor_id: req.user?.id,
    actor_name: req.user?.full_name,
    actor_role: req.user?.role,
    action: 'user_created',
    target_type: 'user',
    target_id: newUser.id,
    details: `Compte "${newUser.full_name}" créé avec le rôle "${newUser.role}".`,
    ip_address: req.ip,
  });

  res.status(201).json({ message: 'Compte créé avec succès.', user: newUser });
});

// PUT /api/admin/users/:id/role
router.put('/users/:id/role', (req: AuthRequest, res: Response): void => {
  const { id } = req.params;
  const { role } = req.body;

  if (!['client', 'staff', 'admin'].includes(role)) {
    res.status(400).json({ error: 'Rôle invalide.' });
    return;
  }

  const user = db.users.find((u) => u.id === id);
  if (!user) {
    res.status(404).json({ error: 'Utilisateur introuvable.' });
    return;
  }

  // Le compte développeur protégé ne peut être modifié que par lui-même,
  // quel que soit le rôle de la personne qui fait la demande.
  if (user.is_super_admin && user.id !== req.user?.id) {
    res.status(403).json({ error: 'Ce compte est protégé et ne peut être modifié que par son titulaire.' });
    return;
  }

  // Prevent self-demoting the primary admin if it's the last admin
  if (user.id === req.user?.id && role !== 'admin') {
    const adminCount = db.users.filter((u) => u.role === 'admin').length;
    if (adminCount <= 1) {
      res.status(400).json({ error: 'Impossible de rétrograder le dernier administrateur du système.' });
      return;
    }
  }

  const previousRole = user.role;
  user.role = role as UserRole;
  user.updated_at = new Date().toISOString();

  db.logActivity({
    actor_id: req.user?.id,
    actor_name: req.user?.full_name,
    actor_role: req.user?.role,
    action: 'user_role_changed',
    target_type: 'user',
    target_id: user.id,
    details: `Rôle de ${user.full_name} changé de "${previousRole}" à "${role}".`,
    ip_address: req.ip,
  });

  res.json({ message: `Rôle de ${user.full_name} modifié en "${role}".`, user });
});

// PUT /api/admin/users/:id/status
router.put('/users/:id/status', (req: AuthRequest, res: Response): void => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['active', 'suspended'].includes(status)) {
    res.status(400).json({ error: 'Statut invalide.' });
    return;
  }

  const user = db.users.find((u) => u.id === id);
  if (!user) {
    res.status(404).json({ error: 'Utilisateur introuvable.' });
    return;
  }

  if (user.is_super_admin && user.id !== req.user?.id) {
    res.status(403).json({ error: 'Ce compte est protégé et ne peut être modifié que par son titulaire.' });
    return;
  }

  if (user.id === req.user?.id) {
    res.status(400).json({ error: 'Vous ne pouvez pas suspendre votre propre compte.' });
    return;
  }

  user.status = status as UserStatus;
  user.updated_at = new Date().toISOString();

  db.logActivity({
    actor_id: req.user?.id,
    actor_name: req.user?.full_name,
    actor_role: req.user?.role,
    action: 'user_status_changed',
    target_type: 'user',
    target_id: user.id,
    details: `Compte de ${user.full_name} ${status === 'active' ? 'réactivé' : 'suspendu'}.`,
    ip_address: req.ip,
  });

  res.json({ message: `Compte ${status === 'active' ? 'réactivé' : 'suspendu'}.`, user });
});

// GET /api/admin/settings (reprend les mêmes valeurs que la route publique,
// exposée sous /admin pour préremplir le formulaire de réglages)
router.get('/settings', (req: AuthRequest, res: Response): void => {
  res.json({ settings: db.siteSettings });
});

// PUT /api/admin/settings
router.put('/settings', (req: AuthRequest, res: Response): void => {
  db.updateSiteSettings(req.body || {});

  db.logActivity({
    actor_id: req.user?.id,
    actor_name: req.user?.full_name,
    actor_role: req.user?.role,
    action: 'settings_updated',
    target_type: 'site_settings',
    details: 'Réglages du site (page d’accueil, blocs, réseaux sociaux) mis à jour.',
    ip_address: req.ip,
  });

  res.json({ message: 'Réglages mis à jour.', settings: db.siteSettings });
});

// GET /api/admin/commissions
router.get('/commissions', (req: AuthRequest, res: Response): void => {
  const commissions = db.categories.map((c) => ({
    id: `com-${c.id}`,
    category_id: c.id,
    category_name: c.name,
    category_slug: c.slug,
    rate: c.commission_rate,
    created_at: c.created_at,
    updated_at: c.updated_at,
  }));

  res.json({ commissions });
});

// PUT /api/admin/commissions/:categoryId
router.put('/commissions/:categoryId', (req: AuthRequest, res: Response): void => {
  const { categoryId } = req.params;
  const { rate } = req.body;

  const numRate = Number(rate);
  if (isNaN(numRate) || numRate < 0 || numRate > 100) {
    res.status(400).json({ error: 'Le taux de commission doit être compris entre 0 et 100%.' });
    return;
  }

  const category = db.categories.find((c) => c.id === categoryId);
  if (!category) {
    res.status(404).json({ error: 'Catégorie introuvable.' });
    return;
  }

  category.commission_rate = numRate;
  category.updated_at = new Date().toISOString();

  const commission = db.commissions.find((com) => com.category_id === categoryId);
  if (commission) {
    commission.rate = numRate;
    commission.updated_by = req.user?.id;
    commission.updated_at = new Date().toISOString();
  }

  res.json({
    message: `Taux de commission pour "${category.name}" fixé à ${numRate}%.`,
    category,
  });
});

// GET /api/admin/categories (full list, including inactive)
router.get('/categories', (req: AuthRequest, res: Response): void => {
  res.json({ categories: db.categories });
});

// POST /api/admin/categories
router.post('/categories', (req: AuthRequest, res: Response): void => {
  const { name, slug, description, image_url, icon_name, commission_rate } = req.body;

  if (!name || !slug || !description || !image_url) {
    res.status(400).json({ error: 'Nom, slug, description et image sont obligatoires.' });
    return;
  }

  if (db.categories.some((c) => c.slug === slug)) {
    res.status(409).json({ error: 'Ce slug de catégorie est déjà utilisé.' });
    return;
  }

  const now = new Date().toISOString();
  const newCategory: Category = {
    id: `cat-${Date.now()}`,
    name,
    slug,
    description,
    image_url,
    commission_rate: Number(commission_rate) || 15,
    is_active: true,
    icon_name: icon_name || 'celebration',
    created_at: now,
    updated_at: now,
  };

  db.categories.push(newCategory);
  res.status(201).json({ message: 'Catégorie créée avec succès.', category: newCategory });
});

// PUT /api/admin/categories/:id
router.put('/categories/:id', (req: AuthRequest, res: Response): void => {
  const { id } = req.params;
  const category = db.categories.find((c) => c.id === id);

  if (!category) {
    res.status(404).json({ error: 'Catégorie introuvable.' });
    return;
  }

  const { name, description, image_url, icon_name, is_active } = req.body;
  if (name !== undefined) category.name = name;
  if (description !== undefined) category.description = description;
  if (image_url !== undefined) category.image_url = image_url;
  if (icon_name !== undefined) category.icon_name = icon_name;
  if (is_active !== undefined) category.is_active = Boolean(is_active);
  category.updated_at = new Date().toISOString();

  res.json({ message: 'Catégorie mise à jour.', category });
});

// DELETE /api/admin/categories/:id
router.delete('/categories/:id', (req: AuthRequest, res: Response): void => {
  const { id } = req.params;
  const category = db.categories.find((c) => c.id === id);

  if (!category) {
    res.status(404).json({ error: 'Catégorie introuvable.' });
    return;
  }

  const hasServices = db.services.some((s) => s.category_id === id);
  if (hasServices) {
    res.status(409).json({
      error: 'Impossible de supprimer : des prestations sont encore rattachées à cette catégorie.',
    });
    return;
  }

  const index = db.categories.findIndex((c) => c.id === id);
  db.categories.splice(index, 1);
  res.json({ message: 'Catégorie supprimée.' });
});

// POST /api/admin/services
router.post('/services', (req: AuthRequest, res: Response): void => {
  const {
    category_id,
    name,
    slug,
    description,
    short_description,
    price,
    currency,
    delay_label,
    image_url,
    is_featured,
    is_live_broadcast,
  } = req.body;

  if (!category_id || !name || !slug || !description || !short_description || !price || !image_url) {
    res.status(400).json({ error: 'Champs obligatoires manquants pour créer la prestation.' });
    return;
  }

  const category = db.categories.find((c) => c.id === category_id);
  if (!category) {
    res.status(404).json({ error: 'Catégorie introuvable.' });
    return;
  }

  if (db.services.some((s) => s.slug === slug)) {
    res.status(409).json({ error: 'Ce slug de prestation est déjà utilisé.' });
    return;
  }

  const now = new Date().toISOString();
  const newService: Service = {
    id: `srv-${Date.now()}`,
    category_id,
    name,
    slug,
    description,
    short_description,
    price: Number(price),
    currency: currency || 'FCFA',
    delay_label: delay_label || '24h',
    image_url,
    is_available: true,
    is_featured: Boolean(is_featured),
    is_live_broadcast: Boolean(is_live_broadcast),
    created_at: now,
    updated_at: now,
  };

  db.services.push(newService);
  res.status(201).json({ message: 'Prestation créée avec succès.', service: newService });
});

// PUT /api/admin/services/:id
router.put('/services/:id', (req: AuthRequest, res: Response): void => {
  const { id } = req.params;
  const service = db.services.find((s) => s.id === id);

  if (!service) {
    res.status(404).json({ error: 'Prestation introuvable.' });
    return;
  }

  const {
    name,
    description,
    short_description,
    price,
    currency,
    delay_label,
    image_url,
    is_available,
    is_featured,
    is_live_broadcast,
  } = req.body;

  if (name !== undefined) service.name = name;
  if (description !== undefined) service.description = description;
  if (short_description !== undefined) service.short_description = short_description;
  if (price !== undefined) service.price = Number(price);
  if (currency !== undefined) service.currency = currency;
  if (delay_label !== undefined) service.delay_label = delay_label;
  if (image_url !== undefined) service.image_url = image_url;
  if (is_available !== undefined) service.is_available = Boolean(is_available);
  if (is_featured !== undefined) service.is_featured = Boolean(is_featured);
  if (is_live_broadcast !== undefined) service.is_live_broadcast = Boolean(is_live_broadcast);
  service.updated_at = new Date().toISOString();

  res.json({ message: 'Prestation mise à jour.', service });
});

// DELETE /api/admin/services/:id
router.delete('/services/:id', (req: AuthRequest, res: Response): void => {
  const { id } = req.params;
  const service = db.services.find((s) => s.id === id);

  if (!service) {
    res.status(404).json({ error: 'Prestation introuvable.' });
    return;
  }

  const hasOrders = db.orders.some((o) => o.service_id === id);
  if (hasOrders) {
    res.status(409).json({
      error: 'Impossible de supprimer : des commandes existent pour cette prestation. Désactivez-la plutôt.',
    });
    return;
  }

  const index = db.services.findIndex((s) => s.id === id);
  db.services.splice(index, 1);
  res.json({ message: 'Prestation supprimée.' });
});

// GET /api/admin/transactions
router.get('/transactions', (req: AuthRequest, res: Response): void => {
  const transactionsWithDetails = db.payments.map((p) => {
    const order = db.orders.find((o) => o.id === p.order_id);
    return {
      ...p,
      order,
    };
  });

  res.json({ transactions: transactionsWithDetails });
});

// GET /api/admin/reviews
router.get('/reviews', (req: AuthRequest, res: Response): void => {
  res.json({ reviews: db.reviews });
});

// PUT /api/admin/reviews/:id/status
router.put('/reviews/:id/status', (req: AuthRequest, res: Response): void => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['pending', 'published', 'hidden'].includes(status)) {
    res.status(400).json({ error: 'Statut d’avis invalide.' });
    return;
  }

  const review = db.reviews.find((r) => r.id === id);
  if (!review) {
    res.status(404).json({ error: 'Avis introuvable.' });
    return;
  }

  review.status = status as ReviewStatus;
  review.updated_at = new Date().toISOString();

  res.json({ message: `Statut de l’avis mis à jour (${status}).`, review });
});

export default router;
