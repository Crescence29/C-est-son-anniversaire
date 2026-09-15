// Cette plateforme ne stocke aucun fichier sur son propre serveur : chaque
// image/vidéo/document est un lien externe saisi par l'équipe (pas
// d'upload, pas de S3/Cloudinary). Ce module fait donc un audit des LIENS
// réellement référencés dans la base plutôt que de simuler un espace disque
// qui n'existe pas.
import { db } from './dataStore.ts';

export type MediaKind = 'image' | 'video' | 'audio' | 'document' | 'autre';

export interface MediaReference {
  url: string;
  kind: MediaKind;
  source: string;
  sourceId: string;
}

export const ALLOWED_FORMATS: Record<Exclude<MediaKind, 'autre'>, string[]> = {
  image: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.avif'],
  video: ['.mp4', '.mov', '.webm', '.mkv', '.avi'],
  audio: ['.mp3', '.wav', '.ogg', '.m4a'],
  document: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt'],
};

function classify(url: string, hint?: string): MediaKind {
  if (hint === 'video' || hint === 'audio' || hint === 'document' || hint === 'image') return hint;
  const lower = url.toLowerCase().split('?')[0];
  for (const [kind, exts] of Object.entries(ALLOWED_FORMATS)) {
    if (exts.some((ext) => lower.endsWith(ext))) return kind as MediaKind;
  }
  return 'autre';
}

export function collectMediaReferences(): MediaReference[] {
  const refs: MediaReference[] = [];
  for (const c of db.categories) if (c.image_url) refs.push({ url: c.image_url, kind: classify(c.image_url), source: 'Catégorie', sourceId: c.id });
  for (const s of db.services) if (s.image_url) refs.push({ url: s.image_url, kind: classify(s.image_url), source: 'Prestation', sourceId: s.id });
  for (const d of db.orderDeliverables) {
    if (d.file_url) refs.push({ url: d.file_url, kind: classify(d.file_url, d.file_type), source: 'Livrable de commande', sourceId: d.id });
  }
  for (const v of db.featuredVideos) {
    if (v.video_url) refs.push({ url: v.video_url, kind: classify(v.video_url, 'video'), source: 'Vidéo mise en avant', sourceId: v.id });
    if (v.thumbnail_url) refs.push({ url: v.thumbnail_url, kind: classify(v.thumbnail_url, 'image'), source: 'Miniature vidéo', sourceId: v.id });
  }
  (db.siteSettings.hero_images || []).forEach((url, i) => {
    if (url) refs.push({ url, kind: classify(url, 'image'), source: 'Image du hero', sourceId: `hero-${i}` });
  });
  return refs;
}

export function domainOf(url: string): string {
  if (url.startsWith('/')) return 'Fichier local du site';
  try {
    return new URL(url).host || 'Inconnu';
  } catch {
    return 'Inconnu';
  }
}

export interface MediaSummary {
  total: number;
  byKind: Record<string, number>;
  byDomain: Record<string, number>;
}

export function getMediaSummary(): MediaSummary {
  const refs = collectMediaReferences();
  const byKind: Record<string, number> = {};
  const byDomain: Record<string, number> = {};
  for (const r of refs) {
    byKind[r.kind] = (byKind[r.kind] || 0) + 1;
    const d = domainOf(r.url);
    byDomain[d] = (byDomain[d] || 0) + 1;
  }
  return { total: refs.length, byKind, byDomain };
}

export interface LinkCheckResult extends MediaReference {
  ok: boolean;
  status: number | null;
  contentType: string | null;
  contentLengthBytes: number | null;
  error?: string;
}

export async function checkLinks(refs: MediaReference[], opts: { concurrency: number; timeoutMs: number }): Promise<LinkCheckResult[]> {
  const queue = [...refs];
  const results: LinkCheckResult[] = [];

  async function worker() {
    while (queue.length) {
      const ref = queue.shift();
      if (!ref) return;
      if (ref.url.startsWith('/')) {
        results.push({ ...ref, ok: true, status: null, contentType: null, contentLengthBytes: null });
        continue;
      }
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
        const response = await fetch(ref.url, { method: 'HEAD', signal: controller.signal });
        clearTimeout(timer);
        const lengthHeader = response.headers.get('content-length');
        results.push({
          ...ref,
          ok: response.ok,
          status: response.status,
          contentType: response.headers.get('content-type'),
          contentLengthBytes: lengthHeader ? Number(lengthHeader) : null,
        });
      } catch (error: any) {
        results.push({ ...ref, ok: false, status: null, contentType: null, contentLengthBytes: null, error: error.message || 'Requête échouée' });
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(opts.concurrency, refs.length) || 1 }, worker));
  return results;
}
