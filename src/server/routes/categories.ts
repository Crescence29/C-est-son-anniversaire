import { Router, Response } from 'express';
import { db } from '../dataStore.ts';

const router = Router();

// GET /api/categories
router.get('/', (req, res: Response): void => {
  const categoriesWithCount = db.categories
    .filter((c) => c.is_active)
    .map((c) => {
      const servicesCount = db.services.filter((s) => s.category_id === c.id && s.is_available).length;
      return {
        ...c,
        services_count: servicesCount,
      };
    });

  res.json({ categories: categoriesWithCount });
});

// GET /api/categories/:idOrSlug
router.get('/:idOrSlug', (req, res: Response): void => {
  const { idOrSlug } = req.params;
  const category = db.categories.find((c) => c.id === idOrSlug || c.slug === idOrSlug);

  if (!category) {
    res.status(404).json({ error: 'Catégorie non trouvée.' });
    return;
  }

  const services = db.services.filter((s) => s.category_id === category.id && s.is_available);
  res.json({ category, services });
});

export default router;
