import { Router, Response } from 'express';
import { db } from '../dataStore.ts';
import { authenticateToken, AuthRequest } from '../middleware/auth.ts';
import { Favorite } from '../../types.ts';

const router = Router();

// GET /api/favorites
router.get('/', authenticateToken, (req: AuthRequest, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Non authentifié.' });
    return;
  }

  const userFavorites = db.favorites
    .filter((f) => f.user_id === req.user?.id)
    .map((f) => ({
      ...f,
      service: db.services.find((s) => s.id === f.service_id),
    }));

  res.json({ favorites: userFavorites });
});

// POST /api/favorites/toggle
router.post('/toggle', authenticateToken, (req: AuthRequest, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Non authentifié.' });
    return;
  }

  const { service_id } = req.body;
  if (!service_id) {
    res.status(400).json({ error: 'Identifiant du service manquant.' });
    return;
  }

  const existingIndex = db.favorites.findIndex(
    (f) => f.user_id === req.user?.id && f.service_id === service_id
  );

  let isFavorite = false;
  if (existingIndex >= 0) {
    db.favorites.splice(existingIndex, 1);
    isFavorite = false;
  } else {
    const newFav: Favorite = {
      id: `fav-${Date.now()}`,
      user_id: req.user.id,
      service_id,
      service: db.services.find((s) => s.id === service_id),
      created_at: new Date().toISOString(),
    };
    db.favorites.unshift(newFav);
    isFavorite = true;
  }

  res.json({
    isFavorite,
    message: isFavorite ? 'Ajouté à vos favoris.' : 'Retiré de vos favoris.',
  });
});

export default router;
