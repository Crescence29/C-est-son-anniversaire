import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../dataStore.ts';
import { User, UserRole } from '../../types.ts';

// En production, un secret par défaut prévisible permettrait de forger des
// tokens (y compris "role: admin") : on préfère arrêter le serveur plutôt
// que de démarrer avec une authentification falsifiable.
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET est obligatoire en production. Configurez-le dans .env avant de démarrer le serveur.');
}

const JWT_SECRET = process.env.JWT_SECRET || 'secret-anniversaire-key-jwt-2026';

export interface AuthRequest extends Request {
  user?: User;
}

export function generateToken(user: User): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      tv: user.token_version || 0,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function generateRefreshToken(user: User): string {
  const token = jwt.sign({ id: user.id, type: 'refresh' }, JWT_SECRET, { expiresIn: '30d' });
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);
  db.refreshTokens.set(token, { userId: user.id, expiresAt });
  return token;
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Token d’authentification manquant.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: UserRole; tv?: number };
    const user = db.users.find((u) => u.id === decoded.id);

    if (!user) {
      res.status(401).json({ error: 'Utilisateur introuvable.' });
      return;
    }

    if (user.status === 'suspended') {
      res.status(403).json({ error: 'Votre compte est suspendu. Veuillez contacter le support.' });
      return;
    }

    // Un changement de mot de passe (par l'utilisateur ou par un admin) fait
    // avancer token_version : toute session émise avant devient invalide,
    // même si son JWT n'a pas encore expiré.
    if ((decoded.tv || 0) !== (user.token_version || 0)) {
      res.status(401).json({ error: 'Votre session a expiré suite à un changement de mot de passe. Veuillez vous reconnecter.' });
      return;
    }

    req.user = user;
    next();
  } catch {
    res.status(403).json({ error: 'Token invalide ou expiré.' });
  }
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Non authentifié.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Accès refusé. Rôle requis : ${allowedRoles.join(' ou ')}. Votre rôle actuel : ${req.user.role}.`,
      });
      return;
    }

    next();
  };
}
