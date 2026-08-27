import { Router, Response } from 'express';
import { db } from '../dataStore.ts';
import { authenticateToken, AuthRequest } from '../middleware/auth.ts';
import { Review } from '../../types.ts';

const router = Router();

// GET /api/reviews
router.get('/', (req, res: Response): void => {
  const { service_id } = req.query;
  let reviews = db.reviews.filter((r) => r.status === 'published');

  if (service_id && typeof service_id === 'string') {
    reviews = reviews.filter((r) => r.service_id === service_id);
  }

  res.json({ reviews });
});

// POST /api/reviews (Client leaves a review for an order)
router.post('/', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Non authentifié.' });
      return;
    }

    const { order_id, rating, comment } = req.body;

    if (!order_id || !rating || !comment) {
      res.status(400).json({ error: 'Commande, note et commentaire obligatoires.' });
      return;
    }

    const order = db.orders.find((o) => o.id === order_id);
    if (!order) {
      res.status(404).json({ error: 'Commande introuvable.' });
      return;
    }

    if (order.client_id !== req.user.id) {
      res.status(403).json({ error: 'Vous ne pouvez laisser un avis que sur vos propres commandes.' });
      return;
    }

    const existingReview = db.reviews.find((r) => r.order_id === order_id);
    if (existingReview) {
      res.status(400).json({ error: 'Vous avez déjà laissé un avis pour cette commande.' });
      return;
    }

    const newReview: Review = {
      id: `rev-${Date.now()}`,
      order_id,
      service_id: order.service_id,
      service_name: order.service_name,
      user_id: req.user.id,
      user_name: req.user.full_name,
      user_avatar: req.user.avatar_url,
      rating: Number(rating),
      comment,
      status: 'published',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.reviews.unshift(newReview);

    res.status(201).json({
      message: 'Merci pour votre précieux avis !',
      review: newReview,
    });
  } catch {
    res.status(500).json({ error: 'Erreur lors de l’envoi de l’avis.' });
  }
});

export default router;
