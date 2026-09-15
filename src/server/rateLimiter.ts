import { Request, Response, NextFunction } from 'express';

// A real, general-purpose rate limiter (fixed window, in-memory) — not the
// bespoke one-off counter already used for login/register in auth.ts, which
// only ever tracked attempts on those two routes. This one is reusable and
// applied to the public v1 API, keyed by whatever the caller identifies the
// requester by (API key or IP).
interface Bucket {
  count: number;
  resetAt: number;
}

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyFn: (req: Request) => string;
}

export function createRateLimiter({ windowMs, max, keyFn }: RateLimitOptions) {
  const buckets = new Map<string, Bucket>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyFn(req);
    const now = Date.now();
    let bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;

    const remaining = Math.max(0, max - bucket.count);
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > max) {
      res.status(429).json({ error: 'Limite de requêtes dépassée. Réessayez plus tard.' });
      return;
    }

    next();
  };
}
