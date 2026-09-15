import crypto from 'crypto';

// API keys are high-entropy random tokens, not user-chosen passwords, so a
// fast deterministic hash (SHA-256) is the right tool here — unlike
// bcrypt/passwords, there's no offline-guessing risk to slow down, and a
// key needs to be looked up by hash on every request.
const KEY_PREFIX = 'csa_live_';

export function generateApiKey(): { fullKey: string; prefix: string; hash: string } {
  const secret = crypto.randomBytes(24).toString('hex');
  const fullKey = `${KEY_PREFIX}${secret}`;
  const prefix = `${KEY_PREFIX}${secret.slice(0, 6)}…`;
  const hash = hashApiKey(fullKey);
  return { fullKey, prefix, hash };
}

export function hashApiKey(fullKey: string): string {
  return crypto.createHash('sha256').update(fullKey).digest('hex');
}
