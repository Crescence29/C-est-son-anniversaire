import { Router, Response } from 'express';
import { db } from '../dataStore.ts';
import { requireApiKey, ApiKeyRequest } from '../middleware/apiKeyAuth.ts';
import { createRateLimiter } from '../rateLimiter.ts';

const router = Router();

// 120 requests/minute per API key — generous enough for a real integration,
// tight enough to be a genuine limit rather than decorative. Keyed by the
// API key itself (set by requireApiKey below, which runs first) so one
// partner's traffic can't exhaust another's allowance.
const v1RateLimit = createRateLimiter({
  windowMs: 60_000,
  max: 120,
  keyFn: (req) => (req as ApiKeyRequest).apiKeyId || req.ip || 'unknown',
});

// GET /api/v1/categories
router.get('/categories', requireApiKey('catalog:read'), v1RateLimit, (req: ApiKeyRequest, res: Response): void => {
  const categories = db.categories
    .filter((c) => c.is_active)
    .map((c) => ({ id: c.id, name: c.name, slug: c.slug, description: c.description }));
  res.json({ data: categories });
});

// GET /api/v1/services
router.get('/services', requireApiKey('catalog:read'), v1RateLimit, (req: ApiKeyRequest, res: Response): void => {
  const services = db.services
    .filter((s) => s.is_available)
    .map((s) => ({
      id: s.id,
      category_id: s.category_id,
      name: s.name,
      slug: s.slug,
      short_description: s.short_description,
      price: s.price,
      currency: s.currency,
      delay_label: s.delay_label,
    }));
  res.json({ data: services });
});

// GET /api/v1/orders/:order_number — statut uniquement, aucune coordonnée
// client : une intégration externe n'a besoin de savoir où en est une
// commande, pas d'en récupérer les données personnelles.
router.get('/orders/:order_number', requireApiKey('orders:read'), v1RateLimit, (req: ApiKeyRequest, res: Response): void => {
  const order = db.orders.find((o) => o.order_number === req.params.order_number);
  if (!order) {
    res.status(404).json({ error: 'Commande introuvable.' });
    return;
  }
  res.json({
    data: {
      order_number: order.order_number,
      status: order.status,
      service_name: order.service_name,
      created_at: order.created_at,
      updated_at: order.updated_at,
    },
  });
});

export default router;
