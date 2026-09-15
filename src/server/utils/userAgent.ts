// Deliberately simple heuristic parsing rather than a full UA-parser
// dependency: good enough to show "Chrome sur Windows" in a device list,
// not meant to be a precise device fingerprint.

function detectOS(ua: string): string {
  if (/windows/i.test(ua)) return 'Windows';
  if (/iphone/i.test(ua)) return 'iPhone';
  if (/ipad/i.test(ua)) return 'iPad';
  if (/android/i.test(ua)) return 'Android';
  if (/mac os x/i.test(ua)) return 'macOS';
  if (/linux/i.test(ua)) return 'Linux';
  return 'Appareil inconnu';
}

function detectBrowser(ua: string): string {
  if (/edg\//i.test(ua)) return 'Edge';
  if (/opr\/|opera/i.test(ua)) return 'Opera';
  if (/chrome\//i.test(ua)) return 'Chrome';
  if (/crios\//i.test(ua)) return 'Chrome';
  if (/fxios\/|firefox\//i.test(ua)) return 'Firefox';
  if (/safari\//i.test(ua)) return 'Safari';
  return 'Navigateur inconnu';
}

export function describeDevice(userAgent: string | undefined | null): string {
  if (!userAgent) return 'Appareil inconnu';
  return `${detectBrowser(userAgent)} sur ${detectOS(userAgent)}`;
}
