import { Router, Request, Response } from 'express';
import { recordLog } from '../logs.ts';
import { createRateLimiter } from '../rateLimiter.ts';

const router = Router();

// No auth required — this has to work even for a visitor who isn't logged
// in (a JS error can happen on the public homepage). Rate-limited by IP so
// a broken page reloading in a crash loop can't flood the log store.
const clientErrorRateLimit = createRateLimiter({
  windowMs: 60_000,
  max: 30,
  keyFn: (req: Request) => req.ip || 'unknown',
});

// POST /api/logs/client-error
router.post('/client-error', clientErrorRateLimit, (req: Request, res: Response): void => {
  const { message, url } = req.body || {};

  if (!message || typeof message !== 'string') {
    res.status(400).json({ error: 'Message d’erreur requis.' });
    return;
  }

  recordLog('error', 'ClientError', message, typeof url === 'string' ? url : null);
  res.status(204).end();
});

export default router;
