import { Router, Response } from 'express';
import { db } from '../dataStore.ts';
import { authenticateToken, AuthRequest } from '../middleware/auth.ts';
import { Order, OrderStatus } from '../../types.ts';

const router = Router();

// POST /api/orders (Create an order from checkout)
router.post('/', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Non authentifié.' });
      return;
    }

    const {
      service_id,
      recipient_name,
      recipient_phone,
      birthday_date,
      message,
      special_instructions,
      client_name,
      client_phone,
    } = req.body;

    if (!service_id || !recipient_name || !recipient_phone || !birthday_date || !message) {
      res.status(400).json({ error: 'Veuillez remplir tous les champs obligatoires du formulaire.' });
      return;
    }

    const service = db.services.find((s) => s.id === service_id);
    if (!service) {
      res.status(404).json({ error: 'Prestation introuvable.' });
      return;
    }

    const category = db.categories.find((c) => c.id === service.category_id);
    const { rate, commission, net } = db.calculateCommission(service.price, service.category_id);

    const orderNumber = `CSA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const orderId = `ord-${Date.now()}`;

    const newOrder: Order = {
      id: orderId,
      order_number: orderNumber,
      client_id: req.user.id,
      client_name: client_name || req.user.full_name,
      client_phone: client_phone || req.user.phone,
      client_email: req.user.email,
      service_id: service.id,
      service_name: service.name,
      service_image: service.image_url,
      category_id: service.category_id,
      category_name: category ? category.name : 'Général',
      recipient_name,
      recipient_phone,
      birthday_date,
      message,
      special_instructions: special_instructions || '',
      status: 'pending_payment',
      amount: service.price,
      currency: service.currency,
      commission_rate: rate,
      commission_amount: commission,
      net_amount: net,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.orders.unshift(newOrder);

    // Add notification
    db.notifications.unshift({
      id: `notif-${Date.now()}`,
      user_id: req.user.id,
      title: 'Commande initiée ⏳',
      message: `Votre commande ${orderNumber} pour "${service.name}" a été initiée. Procédez au paiement pour la valider.`,
      type: 'order',
      is_read: false,
      link_url: `/payment/${newOrder.id}`,
      created_at: new Date().toISOString(),
    });

    res.status(201).json({
      message: 'Commande créée avec succès.',
      order: newOrder,
    });
  } catch {
    res.status(500).json({ error: 'Erreur lors de la création de la commande.' });
  }
});

// GET /api/orders (Client's orders, or filtered list)
router.get('/', authenticateToken, (req: AuthRequest, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Non authentifié.' });
    return;
  }

  const { status } = req.query;
  let userOrders = db.orders.filter((o) => o.client_id === req.user?.id);

  if (status && typeof status === 'string' && status !== 'all') {
    userOrders = userOrders.filter((o) => o.status === status);
  }

  // Populate deliverables
  userOrders = userOrders.map((o) => ({
    ...o,
    deliverables: db.orderDeliverables.filter((d) => d.order_id === o.id),
  }));

  res.json({ orders: userOrders });
});

// GET /api/orders/:id
router.get('/:id', authenticateToken, (req: AuthRequest, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Non authentifié.' });
    return;
  }

  const { id } = req.params;
  const order = db.orders.find((o) => o.id === id || o.order_number === id);

  if (!order) {
    res.status(404).json({ error: 'Commande introuvable.' });
    return;
  }

  // Authorization check: only order owner or staff/admin can view
  if (order.client_id !== req.user.id && req.user.role === 'client') {
    res.status(403).json({ error: 'Accès non autorisé à cette commande.' });
    return;
  }

  const deliverables = db.orderDeliverables.filter((d) => d.order_id === order.id);
  const payment = db.payments.find((p) => p.order_id === order.id);
  const review = db.reviews.find((r) => r.order_id === order.id);
  const service = db.services.find((s) => s.id === order.service_id);

  res.json({
    order: {
      ...order,
      deliverables,
    },
    payment,
    review,
    service,
  });
});

// POST /api/orders/:id/cancel
router.post('/:id/cancel', authenticateToken, (req: AuthRequest, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Non authentifié.' });
    return;
  }

  const { id } = req.params;
  const order = db.orders.find((o) => o.id === id);

  if (!order) {
    res.status(404).json({ error: 'Commande introuvable.' });
    return;
  }

  if (order.client_id !== req.user.id && req.user.role === 'client') {
    res.status(403).json({ error: 'Action non autorisée.' });
    return;
  }

  if (['delivered', 'in_progress'].includes(order.status)) {
    res.status(400).json({ error: 'Impossible d’annuler une commande déjà en cours ou livrée.' });
    return;
  }

  order.status = 'cancelled';
  order.updated_at = new Date().toISOString();

  res.json({ message: 'Commande annulée.', order });
});

export default router;
