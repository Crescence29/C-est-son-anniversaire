import type { Express, Router } from 'express';

// Walks Express's own internal router stack to list every registered
// endpoint — this is the actual registry, not a hand-maintained list that
// would drift from the real routes the moment someone adds one and forgets
// to update a doc.
interface Layer {
  route?: { path: string; methods: Record<string, boolean> };
  name?: string;
  handle?: { stack?: Layer[] };
  regexp?: RegExp;
}

function pathFromRegexp(regexp: RegExp): string {
  // Express mount paths show up as regexes like /^\/api\/admin\/?(?=\/|$)/i
  // — this recovers the literal prefix well enough for a readable listing.
  const match = regexp
    .toString()
    .replace('/^', '')
    .replace('\\/?(?=\\/|$)/i', '')
    .replace(/\\\//g, '/');
  return match.startsWith('/') ? match : `/${match}`;
}

export function listEndpoints(app: Express): { method: string; path: string }[] {
  const results: { method: string; path: string }[] = [];

  function walk(stack: Layer[], prefix: string) {
    for (const layer of stack) {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods).filter((m) => layer.route!.methods[m]);
        for (const method of methods) {
          results.push({ method: method.toUpperCase(), path: `${prefix}${layer.route.path}`.replace(/\/{2,}/g, '/') });
        }
      } else if (layer.name === 'router' && layer.handle?.stack && layer.regexp) {
        walk(layer.handle.stack, `${prefix}${pathFromRegexp(layer.regexp)}`);
      }
    }
  }

  const router = (app as unknown as { _router?: { stack: Layer[] } })._router;
  if (router?.stack) walk(router.stack, '');

  return results
    .filter((r) => r.path.startsWith('/api/'))
    .sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
}
