import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';

import authRouter from './src/server/routes/auth.ts';
import categoriesRouter from './src/server/routes/categories.ts';
import servicesRouter from './src/server/routes/services.ts';
import ordersRouter from './src/server/routes/orders.ts';
import paymentsRouter, { handleFedaPayWebhook } from './src/server/routes/payments.ts';
import reviewsRouter from './src/server/routes/reviews.ts';
import favoritesRouter from './src/server/routes/favorites.ts';
import notificationsRouter from './src/server/routes/notifications.ts';
import videosRouter from './src/server/routes/videos.ts';
import staffRouter from './src/server/routes/staff.ts';
import adminRouter from './src/server/routes/admin.ts';
import developerRouter, { setExpressApp } from './src/server/routes/developer.ts';
import publicApiRouter from './src/server/routes/publicApi.ts';
import settingsRouter from './src/server/routes/settings.ts';
import faqRouter from './src/server/routes/faq.ts';
import supportRouter from './src/server/routes/support.ts';
import { db } from './src/server/dataStore.ts';
import { recordRequest, recordTiming, recordError, recordEndpointHit } from './src/server/metrics.ts';
import { recordLog } from './src/server/logs.ts';
import logsRouter from './src/server/routes/logs.ts';
import { maintenanceGate } from './src/server/maintenanceMode.ts';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Masque le framework utilisé (en-tête X-Powered-By ajouté par défaut par
  // Express) plutôt que de donner gratuitement cette information à un
  // attaquant qui scannerait le site.
  app.disable('x-powered-by');

  // Hash SHA-256 du script inline de index.html (bascule thème clair/sombre
  // avant le premier rendu) : autorise précisément ce script dans la CSP
  // ci-dessous sans avoir à ouvrir 'unsafe-inline' pour tous les scripts. À
  // recalculer si ce script change un jour (voir index.html).
  const THEME_SCRIPT_CSP_HASH = 'sha256-6gALs6pNHY4EbOKZ950cY6R4JlYUo6wP+lMwVaz0mdQ=';

  // En-têtes de sécurité HTTP standards, absents par défaut d'une app
  // Express nue (repérés par un scan de sécurité externe) : bloquent le
  // clickjacking, le sniffing de type MIME, forcent HTTPS, et limitent les
  // origines capables de charger scripts/styles/images.
  app.use((req, res, next) => {
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        `script-src 'self' '${THEME_SCRIPT_CSP_HASH}'`,
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https:",
        "media-src 'self' data: https:",
        "frame-src https://www.youtube.com",
        "connect-src 'self'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; ')
    );
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });

  // Basic Middlewares
  // En production, seules les origines explicitement autorisées (le vrai
  // domaine de l'appli) peuvent appeler l'API en cross-origin ; en dev, tout
  // est accepté pour ne pas gêner le travail local. Limité à /api : le reste
  // du site (pages, fichiers statiques) n'a jamais besoin d'en-têtes CORS.
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.use(
    '/api',
    cors(
      process.env.NODE_ENV === 'production'
        ? {
            origin(origin, callback) {
              if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
              } else {
                callback(new Error('Origine non autorisée par CORS.'));
              }
            },
          }
        : undefined
    )
  );
  // Corps brut requis pour vérifier la signature FedaPay (HMAC calculé sur
  // les octets exacts reçus) : doit être monté AVANT express.json() global,
  // sinon le corps serait déjà consommé/reparsé en objet à ce stade.
  app.post('/api/payments/fedapay/webhook', express.raw({ type: 'application/json' }), handleFedaPayWebhook);

  // Les réponses de l'API peuvent contenir des données propres à
  // l'utilisateur connecté (commandes, paiements, profil) : jamais à mettre
  // en cache par le navigateur ou un proxy intermédiaire.
  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  // Relevé au-delà de la limite par défaut (100kb) pour laisser passer une
  // photo de profil importée/prise par l'utilisateur, redimensionnée et
  // encodée en base64 côté navigateur avant envoi.
  app.use(express.json({ limit: '2mb' }));

  // Metrics for the developer system-status panel: request volume, response
  // time, and any request that ends in a 5xx (recorded from the body's
  // `error` field, since routes reply with res.status(500).json({error})
  // directly rather than throwing into a shared error handler).
  app.use((req, res, next) => {
    recordRequest();
    const startedAt = Date.now();
    res.on('finish', () => {
      recordTiming(Date.now() - startedAt);
      // req.route/req.baseUrl are only populated once Express has matched a
      // specific route handler, which has already happened by the time
      // 'finish' fires — this groups /api/orders/abc123 and .../xyz789
      // under the same "/api/orders/:id" endpoint instead of one row each.
      if (req.originalUrl.startsWith('/api/')) {
        const pattern = req.route ? `${req.baseUrl}${req.route.path}`.replace(/\/{2,}/g, '/') : req.path;
        recordEndpointHit(req.method, pattern, res.statusCode >= 400);
      }
    });
    next();
  });

  // MySQL must be ready before any API route can execute.
  await db.ready;

  // Historique de déploiement réel : GIT_COMMIT_SHA/MESSAGE/AUTHOR sont
  // positionnées comme variables Railway juste avant chaque redéploiement
  // (le conteneur n'a pas de .git, donc aucune RAILWAY_GIT_* n'est
  // disponible ici pour le savoir autrement). N'enregistre un nouvel
  // événement que si le commit a changé, pour qu'un simple redémarrage du
  // conteneur (sans nouveau déploiement) ne duplique pas l'historique.
  const deployedCommitSha = process.env.GIT_COMMIT_SHA;
  if (deployedCommitSha && !db.activityLogs.some((a) => a.action === 'deployment' && a.target_id === deployedCommitSha)) {
    const message = process.env.GIT_COMMIT_MESSAGE;
    const author = process.env.GIT_COMMIT_AUTHOR;
    db.logActivity({
      actor_name: 'Système',
      action: 'deployment',
      target_type: 'commit',
      target_id: deployedCommitSha,
      details: message ? `${message}${author ? ` — ${author}` : ''}` : undefined,
    });
  }

  // Ensure array-based legacy route mutations are persisted before JSON responses are sent.
  app.use((req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      if (res.statusCode >= 500) {
        const message = (body && typeof body === 'object' && 'error' in body ? String((body as { error?: unknown }).error) : null) || 'Erreur serveur';
        recordError(message, req.originalUrl);
        recordLog('error', 'API', message, req.originalUrl);
      }
      db.flush()
        .then(() => originalJson(body))
        .catch((error) => {
          console.error('[MySQL] Impossible de finaliser les écritures:', error);
          if (!res.headersSent) res.status(500);
          recordError(error?.message || 'Échec de persistance', req.originalUrl);
          recordLog('error', 'SyncService', error?.message || 'Échec de persistance', req.originalUrl);
          originalJson({ error: 'Erreur de persistance en base de données.' });
        });
      return res;
    }) as typeof res.json;
    next();
  });

  // Bloque l'API publique/métier pendant la maintenance, en laissant passer
  // l'authentification et /api/developer/* pour que le développeur puisse
  // toujours se connecter et désactiver la maintenance lui-même.
  app.use(maintenanceGate);

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', app: 'C’est son anniversaire', timestamp: new Date().toISOString() });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/categories', categoriesRouter);
  app.use('/api/services', servicesRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/payments', paymentsRouter);
  app.use('/api/reviews', reviewsRouter);
  app.use('/api/favorites', favoritesRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/videos', videosRouter);
  app.use('/api/staff', staffRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/developer', developerRouter);
  app.use('/api/v1', publicApiRouter);

  // Needs every router already mounted above so the introspection in
  // GET /api/developer/endpoints sees the real, complete route table.
  setExpressApp(app);
  app.use('/api/settings', settingsRouter);
  app.use('/api/faq', faqRouter);
  app.use('/api/support-messages', supportRouter);
  app.use('/api/logs', logsRouter);

  // Catches anything a route threw instead of handling itself (routes here
  // normally reply with res.status(500).json(...) directly, which the
  // res.json override above already records — this is the fallback for the
  // rare case something throws past that).
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) {
      next(err);
      return;
    }
    console.error('[Server] Erreur non gérée:', err);
    recordError(err.message || 'Erreur non gérée', req.originalUrl);
    recordLog('error', 'Server', err.message || 'Erreur non gérée', req.originalUrl);
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  });

  // Vite middleware for development vs Static files for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] "C’est son anniversaire" running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  // Exit so the host's process supervisor (Railway, PM2, etc.) sees a real
  // crash and restarts/retries instead of leaving a process alive that
  // never actually called app.listen().
  process.exit(1);
});
