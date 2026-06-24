import express from 'express';
import cookieParser from 'cookie-parser';
import * as env from './config/env';
import apiRouter from './routes/api';
import { authRoutes } from './routes/authRoutes';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';

async function bootstrap() {
  // Validate and log configuration on startup
  env.validateEnv();

  const app = express();

  // ── Body parsing ──────────────────────────────────────────────────────────
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // ── Security headers ──────────────────────────────────────────────────────
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    // Allow the Vite dev server (port 3000) to receive cookies from this API
    res.setHeader('Access-Control-Allow-Origin', env.APP_BASE_URL);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-csrf-token');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    next();
  });

  // Handle CORS preflight
  app.options('*', (_req, res) => {
    res.sendStatus(204);
  });

  // ── Request logging ───────────────────────────────────────────────────────
  app.use(requestLogger);

  // ── Auth routes: /login, /callback, /logout, /api/auth/* ─────────────────
  app.use('/', authRoutes);

  // ── REST API endpoints: /api/* ────────────────────────────────────────────
  app.use('/api', apiRouter);

  // ── Centralised error handler ─────────────────────────────────────────────
  app.use(errorHandler);

  const port = env.PORT;
  app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Seagnal AI Express API running at http://localhost:${port}`);
    console.log(`   Frontend (Vite) expected at: http://localhost:3000`);
  });
}

bootstrap().catch((err) => {
  console.error('💥 Server bootstrap failed:', err);
  process.exit(1);
});
