import { Router, Response } from 'express';
import { db } from '../dataStore.ts';

const router = Router();

// GET /api/faq (questions actives du centre d'aide, triées pour l'affichage)
router.get('/', (req, res: Response): void => {
  const items = db.faqItems
    .filter((f) => f.is_active)
    .sort((a, b) => a.position - b.position);

  res.json({ faq: items });
});

export default router;
