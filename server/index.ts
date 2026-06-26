import cookieParser from 'cookie-parser';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';

import * as env from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import apiRouter from './routes/api';
import { authRoutes } from './routes/authRoutes';

async function bootstrap(): Promise<void> {
  env.validateEnv();

  const app = express();

  /**
   * Cloud Run terminates HTTPS before forwarding the
   * request to Express.
   *
   * This allows req.protocol to correctly return https
   * from the X-Forwarded-Proto header.
   */
  app.set('trust proxy', 1);

  app.use(express.json());

  app.use(
    express.urlencoded({
      extended: true,
    }),
  );

  app.use(cookieParser());

  app.use((req, res, next) => {
    res.setHeader(
      'X-Content-Type-Options',
      'nosniff',
    );

    res.setHeader(
      'X-Frame-Options',
      'DENY',
    );

    res.setHeader(
      'Referrer-Policy',
      'same-origin',
    );

    /**
     * CORS is only required when the frontend and backend
     * are running separately during local development.
     *
     * On Cloud Run, both frontend and backend use the same
     * origin.
     */
    const requestOrigin =
      req.headers.origin;

    if (
      env.APP_BASE_URL &&
      requestOrigin === env.APP_BASE_URL
    ) {
      res.setHeader(
        'Access-Control-Allow-Origin',
        env.APP_BASE_URL,
      );

      res.setHeader(
        'Access-Control-Allow-Credentials',
        'true',
      );

      res.setHeader(
        'Vary',
        'Origin',
      );
    }

    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, x-csrf-token',
    );

    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    );

    next();
  });

  app.options('*', (_req, res) => {
    res.sendStatus(204);
  });

  app.use(requestLogger);

  /**
   * WorkOS routes:
   *
   * /login
   * /callback
   * /logout
   * /api/auth/*
   * /api/health/auth
   */
  app.use('/', authRoutes);

  /**
   * Seagnal AI REST endpoints.
   */
  app.use('/api', apiRouter);

  /**
   * Serve the Vite production build.
   */
  const distPath = path.resolve(
    process.cwd(),
    'dist',
  );

  const indexPath = path.join(
    distPath,
    'index.html',
  );

  if (!fs.existsSync(indexPath)) {
    throw new Error(
      `Frontend build was not found at ${indexPath}. Run npm run build first.`,
    );
  }

  app.use(
    express.static(distPath, {
      index: false,

      maxAge:
        env.NODE_ENV === 'production'
          ? '1h'
          : 0,
    }),
  );

  /**
   * React SPA fallback.
   *
   * Routes such as /dashboard, /login and /alerts should
   * return index.html.
   *
   * API routes are never rewritten to index.html.
   */
  app.get('*', (req, res, next) => {
    if (
      req.path.startsWith('/api/')
    ) {
      return next();
    }

    if (!req.accepts('html')) {
      return next();
    }

    return res.sendFile(indexPath);
  });

  /**
   * Error middleware must be registered last.
   */
  app.use(errorHandler);

  app.listen(
    env.PORT,
    '0.0.0.0',
    () => {
      console.log(
        `🚀 Seagnal AI listening on 0.0.0.0:${env.PORT}`,
      );
    },
  );
}

bootstrap().catch((error) => {
  console.error(
    '💥 Server bootstrap failed:',
    error,
  );

  process.exit(1);
});