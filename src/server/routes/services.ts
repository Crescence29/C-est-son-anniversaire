import { Router, Response } from 'express';
import { db } from '../dataStore.ts';

const router = Router();

// GET /api/services
router.get('/', (req, res: Response): void => {
  const { category, search, featured, sort } = req.query;

  let filtered = [...db.services];

  // Category filter by id or slug
  if (category && typeof category === 'string' && category !== 'all') {
    const matchedCategory = db.categories.find((c) => c.id === category || c.slug === category);
    if (matchedCategory) {
      filtered = filtered.filter((s) => s.category_id === matchedCategory.id);
    }
  }

  // Search by name or description
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.short_description.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
    );
  }

  // Featured filter
  if (featured === 'true') {
    filtered = filtered.filter((s) => s.is_featured);
  }

  // Sorting
  if (sort === 'price_asc') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (sort === 'price_desc') {
    filtered.sort((a, b) => b.price - a.price);
  } else {
    // Default by featured then name
    filtered.sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0));
  }

  res.json({ services: filtered, total: filtered.length });
});

// GET /api/services/:idOrSlug
router.get('/:idOrSlug', (req, res: Response): void => {
  const { idOrSlug } = req.params;
  const service = db.services.find((s) => s.id === idOrSlug || s.slug === idOrSlug);

  if (!service) {
    res.status(404).json({ error: 'Prestation introuvable.' });
    return;
  }

  const category = db.categories.find((c) => c.id === service.category_id);
  const reviews = db.reviews.filter((r) => r.service_id === service.id && r.status === 'published');
  const relatedServices = db.services
    .filter((s) => s.category_id === service.category_id && s.id !== service.id && s.is_available)
    .slice(0, 3);

  res.json({
    service,
    category,
    reviews,
    relatedServices,
  });
});

export default router;
