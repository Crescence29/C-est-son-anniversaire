import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '../dataStore.ts';
import { authenticateToken, AuthRequest, generateToken, generateRefreshToken } from '../middleware/auth.ts';
import { User } from '../../types.ts';

interface UserWithResetToken extends User {
  reset_password_token?: string | null;
  reset_password_expires_at?: string | null;
}

const router = Router();

// Anti brute-force basique sur les routes sensibles : limite les tentatives
// par IP + identifiant visé, indépendamment de la validité des identifiants.
const RATE_LIMIT_MAX_ATTEMPTS = 8;
const RATE_LIMIT_WINDOW_MS = 10 * 60_000;
const attemptsByKey = new Map<string, number[]>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const attempts = (attemptsByKey.get(key) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  attempts.push(now);
  attemptsByKey.set(key, attempts);
  return attempts.length > RATE_LIMIT_MAX_ATTEMPTS;
}

// POST /api/auth/register
router.post('/register', async (req, res: Response): Promise<void> => {
  try {
    if (isRateLimited(`register:${req.ip}`)) {
      res.status(429).json({ error: 'Trop de tentatives d’inscription. Veuillez réessayer plus tard.' });
      return;
    }

    const { full_name, email, phone, password } = req.body;

    if (!full_name || !email || !phone || !password) {
      res.status(400).json({ error: 'Tous les champs (nom, email, téléphone, mot de passe) sont obligatoires.' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
      return;
    }

    const existingUser = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      res.status(409).json({ error: 'Un compte avec cette adresse email existe déjà.' });
      return;
    }

    // Le bannissement est définitif : un compte banni ne peut pas revenir en
    // recréant un compte avec le même email ou le même numéro de téléphone.
    const bannedMatch = db.users.find(
      (u) => u.is_banned && (u.email.toLowerCase() === email.toLowerCase() || u.phone === phone)
    );
    if (bannedMatch) {
      db.logActivity({
        action: 'register_blocked_banned',
        target_type: 'user',
        details: `Tentative d'inscription bloquée : email/téléphone déjà banni (${email} / ${phone}).`,
        ip_address: req.ip,
      });
      res.status(403).json({
        error: 'Ce compte a été banni définitivement et ne peut pas être recréé.',
        banned: true,
      });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `usr-client-${Date.now()}`;

    const newUser: User = {
      id: userId,
      full_name,
      email: email.toLowerCase(),
      phone,
      role: 'client',
      status: 'active',
      avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(full_name)}&backgroundColor=d94a76,4a2170`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.users.push(newUser);
    db.passwords.set(userId, passwordHash);

    // Initial welcome notification
    db.notifications.push({
      id: `notif-${Date.now()}`,
      user_id: userId,
      title: 'Bienvenue sur C’est son anniversaire ! ✨',
      message: 'Votre compte est prêt. Offrez un moment magique et inoubliable dès maintenant.',
      type: 'system',
      is_read: false,
      link_url: '/catalogue',
      created_at: new Date().toISOString(),
    });

    const token = generateToken(newUser);
    const refreshToken = generateRefreshToken(newUser);

    db.logActivity({
      actor_id: newUser.id,
      actor_name: newUser.full_name,
      actor_role: newUser.role,
      action: 'register',
      target_type: 'user',
      target_id: newUser.id,
      details: `Inscription de ${newUser.full_name} (${newUser.email}).`,
      ip_address: req.ip,
    });

    res.status(201).json({
      message: 'Inscription réussie.',
      user: newUser,
      token,
      refreshToken,
    });
  } catch {
    res.status(500).json({ error: 'Erreur lors de l’inscription.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email et mot de passe requis.' });
      return;
    }

    if (isRateLimited(`login:${req.ip}:${String(email).toLowerCase()}`)) {
      res.status(429).json({ error: 'Trop de tentatives de connexion. Veuillez réessayer plus tard.' });
      return;
    }

    const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      db.logActivity({
        action: 'login_failed',
        target_type: 'user',
        details: `Tentative de connexion avec un email inconnu (${email}).`,
        ip_address: req.ip,
      });
      res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
      return;
    }

    if (user.is_banned) {
      db.logActivity({
        actor_id: user.id,
        actor_name: user.full_name,
        actor_role: user.role,
        action: 'login_failed',
        target_type: 'user',
        target_id: user.id,
        details: 'Tentative de connexion sur un compte banni définitivement.',
        ip_address: req.ip,
      });
      res.status(403).json({
        error: 'Ce compte a été banni définitivement. Cette décision est sans appel.',
        banned: true,
        reason: user.status_reason || null,
      });
      return;
    }

    if (user.status === 'suspended') {
      db.logActivity({
        actor_id: user.id,
        actor_name: user.full_name,
        actor_role: user.role,
        action: 'login_failed',
        target_type: 'user',
        target_id: user.id,
        details: 'Tentative de connexion sur un compte suspendu.',
        ip_address: req.ip,
      });
      res.status(403).json({
        error: 'Ce compte a été suspendu par un administrateur.',
        suspended: true,
        reason: user.status_reason || null,
      });
      return;
    }

    const storedHash = db.passwords.get(user.id);
    if (!storedHash) {
      res.status(401).json({ error: 'Identifiants invalides.' });
      return;
    }

    const isValid = await bcrypt.compare(password, storedHash);
    if (!isValid) {
      db.logActivity({
        actor_id: user.id,
        actor_name: user.full_name,
        actor_role: user.role,
        action: 'login_failed',
        target_type: 'user',
        target_id: user.id,
        details: 'Mot de passe incorrect.',
        ip_address: req.ip,
      });
      res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
      return;
    }

    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    db.logActivity({
      actor_id: user.id,
      actor_name: user.full_name,
      actor_role: user.role,
      action: 'login_success',
      target_type: 'user',
      target_id: user.id,
      details: `Connexion réussie de ${user.full_name}.`,
      ip_address: req.ip,
    });

    res.json({
      message: 'Connexion réussie.',
      user,
      token,
      refreshToken,
    });
  } catch {
    res.status(500).json({ error: 'Erreur lors de la connexion.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req: AuthRequest, res: Response): void => {
  res.json({ user: req.user });
});

// PUT /api/auth/profile
router.put('/profile', authenticateToken, (req: AuthRequest, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Non authentifié.' });
    return;
  }

  const { full_name, phone, avatar_url } = req.body;
  const user = db.users.find((u) => u.id === req.user?.id);

  if (!user) {
    res.status(404).json({ error: 'Utilisateur introuvable.' });
    return;
  }

  if (full_name) user.full_name = full_name;
  if (phone) user.phone = phone;
  if (avatar_url !== undefined) user.avatar_url = avatar_url;
  user.updated_at = new Date().toISOString();

  db.logActivity({
    actor_id: user.id,
    actor_name: user.full_name,
    actor_role: user.role,
    action: 'profile_updated',
    target_type: 'user',
    target_id: user.id,
    details: `${user.full_name} a modifié son profil (nom et/ou photo).`,
    ip_address: req.ip,
  });

  res.json({ message: 'Profil mis à jour.', user });
});

// POST /api/auth/change-password
router.post('/change-password', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Non authentifié.' });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword || newPassword.length < 6) {
      res.status(400).json({ error: 'Le nouveau mot de passe doit faire au moins 6 caractères.' });
      return;
    }

    const storedHash = db.passwords.get(req.user.id);
    if (!storedHash) {
      res.status(400).json({ error: 'Erreur interne.' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, storedHash);
    if (!isMatch) {
      res.status(400).json({ error: 'Le mot de passe actuel est incorrect.' });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    db.passwords.set(req.user.id, newHash);
    req.user.token_version = (req.user.token_version || 0) + 1;

    res.json({ message: 'Mot de passe modifié avec succès.' });
  } catch {
    res.status(500).json({ error: 'Erreur lors du changement de mot de passe.' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res: Response): Promise<void> => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ error: 'Adresse email requise.' });
    return;
  }

  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) as
    | UserWithResetToken
    | undefined;

  // On ne révèle jamais si un compte existe ou non pour cet email.
  if (user) {
    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    user.reset_password_token = token;
    user.reset_password_expires_at = expiresAt;

    // Aucun service d'email n'est configuré pour cette démo : le code est
    // journalisé côté serveur. En production, il faudrait l'envoyer par email/SMS.
    console.log(
      `[Auth] Code de réinitialisation pour ${user.email} : ${token} (valide 1h)`
    );
  }

  res.json({
    message:
      'Si un compte existe avec cet email, un code de réinitialisation a été généré.',
  });
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res: Response): Promise<void> => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword || newPassword.length < 6) {
      res.status(400).json({
        error:
          'Email, code de réinitialisation et nouveau mot de passe (6 caractères min.) requis.',
      });
      return;
    }

    const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) as
      | UserWithResetToken
      | undefined;

    const isExpired =
      !user?.reset_password_expires_at ||
      new Date(user.reset_password_expires_at) < new Date();

    if (!user || !user.reset_password_token || user.reset_password_token !== code || isExpired) {
      res.status(400).json({ error: 'Code invalide ou expiré.' });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    db.passwords.set(user.id, newHash);
    user.token_version = (user.token_version || 0) + 1;

    user.reset_password_token = null;
    user.reset_password_expires_at = null;

    res.json({ message: 'Mot de passe réinitialisé avec succès. Vous pouvez vous connecter.' });
  } catch {
    res.status(500).json({ error: 'Erreur lors de la réinitialisation du mot de passe.' });
  }
});

export default router;
