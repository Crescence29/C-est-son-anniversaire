import { Router, Response } from 'express';
import { db } from '../dataStore.ts';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth.ts';
import { OrderStatus, OrderDeliverable, Category, Service, FaqItem } from '../../types.ts';

const router = Router();

// Protect all staff routes
router.use(authenticateToken, requireRole('staff', 'admin'));

// GET /api/staff/stats
router.get('/stats', (req: AuthRequest, res: Response): void => {
  const stats = db.getStaffStats();
  res.json({ stats });
});

// GET /api/staff/orders
router.get('/orders', (req: AuthRequest, res: Response): void => {
  const { status, search } = req.query;

  let orders = db.orders.map((o) => ({
    ...o,
    deliverables: db.orderDeliverables.filter((d) => d.order_id === o.id),
  }));

  // Exclude unpaid orders by default or filter
  if (status && typeof status === 'string' && status !== 'all') {
    orders = orders.filter((o) => o.status === status);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    orders = orders.filter(
      (o) =>
        o.order_number.toLowerCase().includes(q) ||
        o.recipient_name.toLowerCase().includes(q) ||
        (o.client_name && o.client_name.toLowerCase().includes(q))
    );
  }

  res.json({ orders });
});

// PUT /api/staff/orders/:id/status
router.put('/orders/:id/status', (req: AuthRequest, res: Response): void => {
  const { id } = req.params;
  const { nextStatus } = req.body;

  const order = db.orders.find((o) => o.id === id);
  if (!order) {
    res.status(404).json({ error: 'Commande introuvable.' });
    return;
  }

  // Validate state transition
  if (!db.isValidStatusTransition(order.status, nextStatus as OrderStatus)) {
    res.status(400).json({
      error: `Transition de statut invalide : impossible de passer de "${order.status}" à "${nextStatus}".`,
    });
    return;
  }

  order.status = nextStatus as OrderStatus;
  order.updated_at = new Date().toISOString();

  if (nextStatus === 'delivered') {
    order.delivered_at = new Date().toISOString();
  }

  // Send notification to the client
  const statusMessages: Record<string, { title: string; msg: string }> = {
    accepted: {
      title: 'Commande prise en charge 🎬',
      msg: `L’équipe régie a validé et accepté votre commande #${order.order_number}.`,
    },
    in_progress: {
      title: 'Prestation en cours de réalisation 🎤',
      msg: `Nos artistes sont en train de préparer votre surprise pour #${order.order_number}.`,
    },
    delivered: {
      title: 'Surprise livrée avec succès ! 🎉',
      msg: `La surprise #${order.order_number} a été livrée au destinataire ! Consultez votre reçu et les livrables.`,
    },
  };

  if (statusMessages[nextStatus]) {
    db.notifications.unshift({
      id: `notif-${Date.now()}`,
      user_id: order.client_id,
      title: statusMessages[nextStatus].title,
      message: statusMessages[nextStatus].msg,
      type: nextStatus === 'delivered' ? 'delivery' : 'order',
      is_read: false,
      link_url: `/account/orders/${order.id}`,
      created_at: new Date().toISOString(),
    });
  }

  res.json({
    message: `Statut de la commande mis à jour vers "${nextStatus}".`,
    order,
  });
});

// POST /api/staff/orders/:id/deliverables
router.post('/orders/:id/deliverables', (req: AuthRequest, res: Response): void => {
  const { id } = req.params;
  const { file_url, file_type = 'video', note } = req.body;

  const order = db.orders.find((o) => o.id === id);
  if (!order) {
    res.status(404).json({ error: 'Commande introuvable.' });
    return;
  }

  if (!file_url) {
    res.status(400).json({ error: 'URL ou lien du livrable requis.' });
    return;
  }

  const deliverable: OrderDeliverable = {
    id: `del-${Date.now()}`,
    order_id: order.id,
    file_url,
    file_type,
    note: note || '',
    uploaded_by: req.user?.id || 'usr-staff-1',
    uploaded_by_name: req.user?.full_name || 'Équipe Régie',
    created_at: new Date().toISOString(),
  };

  db.orderDeliverables.unshift(deliverable);

  // Notify client
  db.notifications.unshift({
    id: `notif-${Date.now()}`,
    user_id: order.client_id,
    title: 'Nouveau livrable disponible 🎁',
    message: `Un souvenir média (${file_type}) a été ajouté à votre commande #${order.order_number}.`,
    type: 'delivery',
    is_read: false,
    link_url: `/account/orders/${order.id}`,
    created_at: new Date().toISOString(),
  });

  res.status(201).json({
    message: 'Livrable ajouté avec succès.',
    deliverable,
  });
});

// PUT /api/staff/services/:id/availability
router.put('/services/:id/availability', (req: AuthRequest, res: Response): void => {
  const { id } = req.params;
  const { is_available } = req.body;

  const service = db.services.find((s) => s.id === id);
  if (!service) {
    res.status(404).json({ error: 'Prestation introuvable.' });
    return;
  }

  service.is_available = Boolean(is_available);
  service.updated_at = new Date().toISOString();

  res.json({
    message: `Disponibilité du service mise à jour (${service.is_available ? 'Disponible' : 'Indisponible'}).`,
    service,
  });
});

// POST /api/staff/categories (le staff peut aussi enrichir le catalogue)
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

  db.logActivity({
    actor_id: req.user?.id,
    actor_name: req.user?.full_name,
    actor_role: req.user?.role,
    action: 'category_created',
    target_type: 'category',
    target_id: newCategory.id,
    details: `Catégorie "${newCategory.name}" créée.`,
    ip_address: req.ip,
  });

  res.status(201).json({ message: 'Catégorie créée avec succès.', category: newCategory });
});

// PUT /api/staff/categories/:id
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

  db.logActivity({
    actor_id: req.user?.id,
    actor_name: req.user?.full_name,
    actor_role: req.user?.role,
    action: 'category_updated',
    target_type: 'category',
    target_id: category.id,
    details: `Catégorie "${category.name}" modifiée.`,
    ip_address: req.ip,
  });

  res.json({ message: 'Catégorie mise à jour.', category });
});

// POST /api/staff/services
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

  db.logActivity({
    actor_id: req.user?.id,
    actor_name: req.user?.full_name,
    actor_role: req.user?.role,
    action: 'service_created',
    target_type: 'service',
    target_id: newService.id,
    details: `Prestation "${newService.name}" créée.`,
    ip_address: req.ip,
  });

  res.status(201).json({ message: 'Prestation créée avec succès.', service: newService });
});

// PUT /api/staff/services/:id
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

  db.logActivity({
    actor_id: req.user?.id,
    actor_name: req.user?.full_name,
    actor_role: req.user?.role,
    action: 'service_updated',
    target_type: 'service',
    target_id: service.id,
    details: `Prestation "${service.name}" modifiée.`,
    ip_address: req.ip,
  });

  res.json({ message: 'Prestation mise à jour.', service });
});

// POST /api/staff/videos
router.post('/videos', (req: AuthRequest, res: Response): void => {
  const { title, description, video_url, thumbnail_url } = req.body;

  if (!title || !description || !video_url || !thumbnail_url) {
    res.status(400).json({ error: 'Tous les champs sont requis.' });
    return;
  }

  const newVideo = {
    id: `vid-${Date.now()}`,
    title,
    description,
    video_url,
    thumbnail_url,
    is_active: true,
    position: db.featuredVideos.length + 1,
    created_by: req.user?.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.featuredVideos.push(newVideo);

  res.status(201).json({ message: 'Vidéo ajoutée aux Moments Magiques.', video: newVideo });
});

// DELETE /api/staff/videos/:id
router.delete('/videos/:id', (req: AuthRequest, res: Response): void => {
  const { id } = req.params;
  const index = db.featuredVideos.findIndex((v) => v.id === id);

  if (index === -1) {
    res.status(404).json({ error: 'Vidéo introuvable.' });
    return;
  }

  db.featuredVideos.splice(index, 1);
  res.json({ message: 'Vidéo retirée avec succès.' });
});

// GET /api/staff/faq (toutes les questions, y compris désactivées, pour la gestion)
router.get('/faq', (req: AuthRequest, res: Response): void => {
  const items = [...db.faqItems].sort((a, b) => a.position - b.position);
  res.json({ faq: items });
});

// POST /api/staff/faq
router.post('/faq', (req: AuthRequest, res: Response): void => {
  const { question, answer } = req.body;

  if (!question || !answer) {
    res.status(400).json({ error: 'La question et la réponse sont obligatoires.' });
    return;
  }

  const now = new Date().toISOString();
  const newItem: FaqItem = {
    id: `faq-${Date.now()}`,
    question,
    answer,
    position: db.faqItems.length,
    is_active: true,
    created_at: now,
    updated_at: now,
  };

  db.faqItems.push(newItem);

  db.logActivity({
    actor_id: req.user?.id,
    actor_name: req.user?.full_name,
    actor_role: req.user?.role,
    action: 'faq_created',
    target_type: 'faq_item',
    target_id: newItem.id,
    details: `Question du centre d'aide ajoutée : "${newItem.question}".`,
    ip_address: req.ip,
  });

  res.status(201).json({ message: 'Question ajoutée au centre d’aide.', faqItem: newItem });
});

// PUT /api/staff/faq/:id
router.put('/faq/:id', (req: AuthRequest, res: Response): void => {
  const { id } = req.params;
  const item = db.faqItems.find((f) => f.id === id);

  if (!item) {
    res.status(404).json({ error: 'Question introuvable.' });
    return;
  }

  const { question, answer, is_active } = req.body;
  if (question !== undefined) item.question = question;
  if (answer !== undefined) item.answer = answer;
  if (is_active !== undefined) item.is_active = Boolean(is_active);
  item.updated_at = new Date().toISOString();

  res.json({ message: 'Question mise à jour.', faqItem: item });
});

// DELETE /api/staff/faq/:id
router.delete('/faq/:id', (req: AuthRequest, res: Response): void => {
  const { id } = req.params;
  const index = db.faqItems.findIndex((f) => f.id === id);

  if (index === -1) {
    res.status(404).json({ error: 'Question introuvable.' });
    return;
  }

  db.faqItems.splice(index, 1);
  res.json({ message: 'Question supprimée.' });
});

// GET /api/staff/support-messages (avis & suggestions reçus des clients)
router.get('/support-messages', (req: AuthRequest, res: Response): void => {
  const messages = [...db.supportMessages].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  res.json({ messages });
});

// PUT /api/staff/support-messages/:id/reply
router.put('/support-messages/:id/reply', (req: AuthRequest, res: Response): void => {
  const { id } = req.params;
  const { reply } = req.body;

  if (!reply) {
    res.status(400).json({ error: 'La réponse ne peut pas être vide.' });
    return;
  }

  const supportMessage = db.supportMessages.find((m) => m.id === id);
  if (!supportMessage) {
    res.status(404).json({ error: 'Message introuvable.' });
    return;
  }

  supportMessage.reply = reply;
  supportMessage.status = 'answered';
  supportMessage.replied_by = req.user?.id;
  supportMessage.replied_by_name = req.user?.full_name;
  supportMessage.replied_at = new Date().toISOString();
  supportMessage.updated_at = new Date().toISOString();

  db.logActivity({
    actor_id: req.user?.id,
    actor_name: req.user?.full_name,
    actor_role: req.user?.role,
    action: 'support_message_replied',
    target_type: 'support_message',
    target_id: supportMessage.id,
    details: `Réponse envoyée à ${supportMessage.user_name || 'un client'} : "${supportMessage.subject}".`,
    ip_address: req.ip,
  });

  res.json({ message: 'Réponse envoyée.', supportMessage });
});

export default router;
