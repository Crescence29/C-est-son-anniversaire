import { Router, Response } from 'express';
import { db } from '../dataStore.ts';
import { authenticateToken, AuthRequest } from '../middleware/auth.ts';
import { SupportMessage } from '../../types.ts';

const router = Router();

router.use(authenticateToken);

// GET /api/support-messages/mine (mes messages envoyés au staff/admin + leurs réponses)
router.get('/mine', (req: AuthRequest, res: Response): void => {
  const mine = db.supportMessages
    .filter((m) => m.user_id === req.user?.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  res.json({ messages: mine });
});

// POST /api/support-messages (envoyer un avis ou une suggestion)
router.post('/', (req: AuthRequest, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Non authentifié.' });
    return;
  }

  const { subject, message } = req.body;
  if (!subject || !message) {
    res.status(400).json({ error: 'Le sujet et le message sont obligatoires.' });
    return;
  }

  const now = new Date().toISOString();
  const newMessage: SupportMessage = {
    id: `sup-${Date.now()}`,
    user_id: req.user.id,
    user_name: req.user.full_name,
    user_email: req.user.email,
    user_phone: req.user.phone,
    subject,
    message,
    status: 'open',
    created_at: now,
    updated_at: now,
  };

  db.supportMessages.unshift(newMessage);

  db.logActivity({
    actor_id: req.user.id,
    actor_name: req.user.full_name,
    actor_role: req.user.role,
    action: 'support_message_sent',
    target_type: 'support_message',
    target_id: newMessage.id,
    details: `Nouveau message reçu de ${req.user.full_name} : "${subject}".`,
    ip_address: req.ip,
  });

  res.status(201).json({ message: 'Votre message a été envoyé à notre équipe.', supportMessage: newMessage });
});

export default router;
