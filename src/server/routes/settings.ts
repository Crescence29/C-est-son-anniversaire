import { Router, Response } from 'express';
import { db } from '../dataStore.ts';

const router = Router();

// GET /api/settings (contenu public de la page d'accueil, réglable sans code)
router.get('/', (req, res: Response): void => {
  res.json({ settings: db.siteSettings });
});

export default router;
