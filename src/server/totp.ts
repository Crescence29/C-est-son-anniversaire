// TOTP (RFC 6238) écrit à la main avec le module crypto natif de Node —
// volontairement sans dépendance externe, dans le même esprit que le hachage
// des clés API (src/server/apiKeys.ts) ou le limiteur de requêtes maison.
// Compatible avec Google Authenticator / Authy (SHA-1, 6 chiffres, pas de 30s).
import crypto from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_SECONDS = 30;
const DIGITS = 6;
const WINDOW = 1; // tolère ±1 pas (±30s) de dérive d'horloge

export function generateBase32Secret(byteLength = 20): string {
  const bytes = crypto.randomBytes(byteLength);
  let bits = '';
  for (const byte of bytes) bits += byte.toString(2).padStart(8, '0');
  let secret = '';
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    secret += BASE32_ALPHABET[parseInt(bits.slice(i, i + 5), 2)];
  }
  return secret;
}

function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = '';
  for (const char of clean) {
    const val = BASE32_ALPHABET.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function hotp(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', secret).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 10 ** DIGITS).padStart(DIGITS, '0');
}

export function verifyTotp(token: string, base32Secret: string): boolean {
  if (!/^\d{6}$/.test(token)) return false;
  const secret = base32Decode(base32Secret);
  const counter = Math.floor(Date.now() / 1000 / STEP_SECONDS);
  for (let errorWindow = -WINDOW; errorWindow <= WINDOW; errorWindow++) {
    if (hotp(secret, counter + errorWindow) === token) return true;
  }
  return false;
}

export function buildOtpAuthUrl(base32Secret: string, accountEmail: string): string {
  const issuerRaw = 'C’est son anniversaire';
  const label = encodeURIComponent(`${issuerRaw}:${accountEmail}`);
  const issuer = encodeURIComponent(issuerRaw);
  return `otpauth://totp/${label}?secret=${base32Secret}&issuer=${issuer}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;
}

export function generateBackupCodes(count = 8): string[] {
  return Array.from({ length: count }, () => crypto.randomBytes(5).toString('hex').toUpperCase().match(/.{1,5}/g)!.join('-'));
}
