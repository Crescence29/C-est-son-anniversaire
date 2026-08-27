import { Router, Response } from 'express';
import { db } from '../dataStore.ts';
import { authenticateToken, AuthRequest } from '../middleware/auth.ts';

const router = Router();

// GET /api/notifications
router.get('/', authenticateToken, (req: AuthRequest, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Non authentifié.' });
    return;
  }

  const userNotifs = db.notifications.filter((n) => n.user_id === req.user?.id);
  const unreadCount = userNotifs.filter((n) => !n.is_read).length;

  res.json({
    notifications: userNotifs,
    unreadCount,
  });
});

// PUT /api/notifications/:id/read
router.put('/:id/read', authenticateToken, (req: AuthRequest, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Non authentifié.' });
    return;
  }

  const { id } = req.params;
  const notif = db.notifications.find((n) => n.id === id && n.user_id === req.user?.id);

  if (!notif) {
    res.status(404).json({ error: 'Notification introuvable.' });
    return;
  }

  notif.is_read = true;
  res.json({ message: 'Notification marquée comme lue.', notification: notif });
});

// PUT /api/notifications/read-all
router.put('/read-all', authenticateToken, (req: AuthRequest, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Non authentifié.' });
    return;
  }

  db.notifications.forEach((n) => {
    if (n.user_id === req.user?.id) {
      n.is_read = true;
    }
  });

  res.json({ message: 'Toutes les notifications ont été marquées comme lues.' });
});

export default router;
