import { Request, Response, NextFunction } from 'express';
import { db } from '../dataStore.ts';
import { hashApiKey } from '../apiKeys.ts';
import { ApiScope } from '../../types.ts';

export interface ApiKeyRequest extends Request {
  apiKeyId?: string;
}

export function requireApiKey(scope: ApiScope) {
  return (req: ApiKeyRequest, res: Response, next: NextFunction): void => {
    const provided = req.headers['x-api-key'];
    if (!provided || typeof provided !== 'string') {
      res.status(401).json({ error: 'En-tête X-API-Key manquant.' });
      return;
    }

    const hash = hashApiKey(provided);
    const key = db.apiKeys.find((k) => k.key_hash === hash);

    if (!key || key.status !== 'active') {
      res.status(401).json({ error: 'Clé API invalide ou révoquée.' });
      return;
    }

    if (!key.scopes.includes(scope)) {
      res.status(403).json({ error: `Cette clé API n'a pas la portée "${scope}" requise pour cet endpoint.` });
      return;
    }

    key.last_used_at = new Date().toISOString();
    key.request_count = (key.request_count || 0) + 1;
    req.apiKeyId = key.id;
    next();
  };
}
