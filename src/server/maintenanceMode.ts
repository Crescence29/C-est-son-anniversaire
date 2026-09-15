import { Request, Response, NextFunction } from 'express';
import { db } from './dataStore.ts';

// Laisse passer l'authentification (pour que le développeur puisse toujours
// se connecter et désactiver la maintenance) et tout /api/developer/*
// (le tableau de bord technique doit rester utilisable pendant la
// maintenance), ainsi que le simple contrôle de santé.
const ALWAYS_ALLOWED_PREFIXES = ['/api/auth', '/api/developer', '/api/health'];

export function maintenanceGate(req: Request, res: Response, next: NextFunction): void {
  if (!req.path.startsWith('/api/')) {
    next();
    return;
  }
  if (!db.siteSettings.maintenance_mode) {
    next();
    return;
  }
  if (ALWAYS_ALLOWED_PREFIXES.some((prefix) => req.path.startsWith(prefix))) {
    next();
    return;
  }
  res.status(503).json({ error: 'maintenance', message: db.siteSettings.maintenance_message });
}
