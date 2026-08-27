import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';

import authRouter from './src/server/routes/auth.ts';
import categoriesRouter from './src/server/routes/categories.ts';
import servicesRouter from './src/server/routes/services.ts';
import ordersRouter from './src/server/routes/orders.ts';
import paymentsRouter from './src/server/routes/payments.ts';
import reviewsRouter from './src/server/routes/reviews.ts';
import favoritesRouter from './src/server/routes/favorites.ts';
import notificationsRouter from './src/server/routes/notifications.ts';
import videosRouter from './src/server/routes/videos.ts';
import staffRouter from './src/server/routes/staff.ts';
import adminRouter from './src/server/routes/admin.ts';
import settingsRouter from './src/server/routes/settings.ts';
import faqRouter from './src/server/routes/faq.ts';
import supportRouter from './src/server/routes/support.ts';
import { db } from './src/server/dataStore.ts';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Basic Middlewares
  // En production, seules les origines explicitement autorisées (le vrai
  // domaine de l'appli) peuvent appeler l'API en cross-origin ; en dev, tout
  // est accepté pour ne pas gêner le travail local.
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.use(
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
  app.use(express.json());

  // MySQL must be ready before any API route can execute.
  await db.ready;

  // Ensure array-based legacy route mutations are persisted before JSON responses are sent.
  app.use((req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      db.flush()
        .then(() => originalJson(body))
        .catch((error) => {
          console.error('[MySQL] Impossible de finaliser les écritures:', error);
          if (!res.headersSent) res.status(500);
          originalJson({ error: 'Erreur de persistance en base de données.' });
        });
      return res;
    }) as typeof res.json;
    next();
  });

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
  app.use('/api/settings', settingsRouter);
  app.use('/api/faq', faqRouter);
  app.use('/api/support-messages', supportRouter);

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
});
