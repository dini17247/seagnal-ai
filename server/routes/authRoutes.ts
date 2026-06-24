import { Router } from 'express';
import { workos } from '../auth/workosClient';
import * as env from '../config/env';
import { SESSION_COOKIE_NAME, getSessionCookieOptions } from '../auth/workosSession';
import { doubleCsrf } from 'csrf-csrf';

const router = Router();

const {
  generateCsrfToken,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => env.CSRF_SECRET || 'a-very-secure-secret-key-default',
  getSessionIdentifier: (req) => req.cookies?.[SESSION_COOKIE_NAME] || '',
  cookieName: 'x-csrf-token',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: env.NODE_ENV === 'production',
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
});

// ── GET /login ────────────────────────────────────────────────────────────────
// Generates WorkOS AuthKit authorization URL and redirects the browser.
router.get('/login', (req, res) => {
  // Dev convenience: if auth is not required, bypass to a mock session
  if (!env.AUTH_REQUIRED) {
    res.cookie(SESSION_COOKIE_NAME, 'mock_sealed_session', getSessionCookieOptions());
    return res.redirect('/');
  }

  if (!workos) {
    return res.status(500).send(
      'WorkOS client is not initialized. Check WORKOS_API_KEY server configuration.'
    );
  }

  if (!env.WORKOS_CLIENT_ID || !env.WORKOS_REDIRECT_URI) {
    return res.status(500).send(
      'WorkOS WORKOS_CLIENT_ID or WORKOS_REDIRECT_URI is not configured.'
    );
  }

  try {
    const authUrl = workos.userManagement.getAuthorizationUrl({
      provider: 'authkit',
      clientId: env.WORKOS_CLIENT_ID,
      redirectUri: env.WORKOS_REDIRECT_URI,
      ...(env.WORKOS_ORGANIZATION_ID ? { organizationId: env.WORKOS_ORGANIZATION_ID } : {}),
    });

    console.log(`[Auth] Redirecting to WorkOS: ${authUrl.substring(0, 80)}...`);
    res.redirect(authUrl);
  } catch (err: any) {
    console.error('❌ Failed to generate WorkOS auth URL:', err);
    res.status(500).send(`Authentication error: ${err.message}`);
  }
});

// ── GET /callback ─────────────────────────────────────────────────────────────
// Exchanges WorkOS authorization code for a sealed session cookie.
router.get('/callback', async (req, res) => {
  const code = req.query.code as string;

  if (!code) {
    return res.status(400).send('Authorization code is missing from the callback request.');
  }

  // Dev convenience bypass
  if (!env.AUTH_REQUIRED) {
    res.cookie(SESSION_COOKIE_NAME, 'mock_sealed_session', getSessionCookieOptions());
    return res.redirect('/');
  }

  if (!workos) {
    return res.status(500).send('WorkOS client is not initialized on the server.');
  }

  if (!env.WORKOS_CLIENT_ID || !env.WORKOS_COOKIE_PASSWORD) {
    return res.status(500).send('WorkOS server credentials are not configured.');
  }

  try {
    const authResponse = await workos.userManagement.authenticateWithCode({
      code,
      clientId: env.WORKOS_CLIENT_ID,
      session: {
        sealSession: true,
        cookiePassword: env.WORKOS_COOKIE_PASSWORD,
      },
    });

    const sealedSession = authResponse.sealedSession;
    if (!sealedSession) {
      throw new Error('No sealed session was returned from WorkOS.');
    }

    console.log(`[Auth] Session created for user: ${authResponse.user?.email}`);
    res.cookie(SESSION_COOKIE_NAME, sealedSession, getSessionCookieOptions());
    res.redirect('/');
  } catch (err: any) {
    console.error('❌ WorkOS callback authentication failed:', err);
    res.status(500).send(`Authentication failed: ${err.message}`);
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
// Returns only safe, non-sensitive user profile data to the React client.
router.get('/api/auth/me', async (req, res) => {
  // Dev convenience mock user
  if (!env.AUTH_REQUIRED) {
    return res.json({
      id: 'usr-mock-001',
      email: 'commander@seagnal.ai',
      fullName: 'Duty Command Officer',
      organizationId: 'org_mock_dev',
      role: 'System Administrator',
      permissions: [
        'dashboard.view', 'map.view', 'vessels.view', 'alerts.view', 'alerts.audit', 'alerts.resolve',
        'reports.view', 'reports.create', 'reports.edit', 'reports.finalize', 'reports.export',
        'settings.view', 'settings.update', 'users.view', 'users.manage', 'audit_logs.view',
      ],
    });
  }

  const cookieVal = req.cookies?.[SESSION_COOKIE_NAME];

  if (!cookieVal) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'No active session.' } });
  }

  if (!workos || !env.WORKOS_COOKIE_PASSWORD) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'WorkOS client is not initialized.' } });
  }

  try {
    const authResult = await workos.userManagement.authenticateWithSessionCookie({
      sessionData: cookieVal,
      cookiePassword: env.WORKOS_COOKIE_PASSWORD,
    });

    if (!authResult.authenticated || !authResult.user) {
      return res.status(401).json({ success: false, error: { code: 'SESSION_INVALID', message: 'Session is not authenticated.' } });
    }

    const { user } = authResult;
    const fullName =
      [user.firstName, user.lastName].filter(Boolean).join(' ') ||
      user.email.split('@')[0];

    // Return ONLY safe, non-sensitive fields — no tokens, no cookie contents
    return res.json({
      id: user.id,
      email: user.email,
      fullName,
      organizationId: authResult.organizationId ?? undefined,
      role: authResult.role ?? 'System Administrator',
      permissions: authResult.permissions ?? [
        'dashboard.view', 'map.view', 'vessels.view', 'alerts.view', 'alerts.audit', 'alerts.resolve',
        'reports.view', 'reports.create', 'reports.edit', 'reports.finalize', 'reports.export',
        'settings.view', 'settings.update', 'users.view', 'users.manage', 'audit_logs.view',
      ],
    });
  } catch (err: any) {
    console.error('❌ Failed to load user profile from session:', err);
    return res.status(401).json({ success: false, error: { code: 'SESSION_INVALID', message: 'Session is invalid or expired.' } });
  }
});

// ── GET /api/auth/csrf-token ──────────────────────────────────────────────────
// Issues a CSRF token that must be sent as the x-csrf-token header on mutating requests.
router.get('/api/auth/csrf-token', (req, res) => {
  const token = generateCsrfToken(req, res);
  res.json({ csrfToken: token });
});

// ── GET /api/health/auth ──────────────────────────────────────────────────────
// Returns safe configuration status — no secrets, no keys, no tokens.
router.get('/api/health/auth', (_req, res) => {
  res.json({
    authMode: env.AUTH_REQUIRED ? 'workos' : 'disabled',
    workosConfigured: !!(env.WORKOS_API_KEY && env.WORKOS_CLIENT_ID && env.WORKOS_COOKIE_PASSWORD),
    redirectUri: env.WORKOS_REDIRECT_URI,
    useMockAuth: env.USE_MOCK_AUTH,
  });
});

// ── POST /logout ──────────────────────────────────────────────────────────────
// Validates CSRF, clears the session cookie, redirects through WorkOS logout.
router.post('/logout', doubleCsrfProtection, async (req, res) => {
  const cookieVal = req.cookies?.[SESSION_COOKIE_NAME];

  // Always clear the session cookie first
  res.clearCookie(SESSION_COOKIE_NAME, getSessionCookieOptions());

  if (!env.AUTH_REQUIRED || !cookieVal || cookieVal === 'mock_sealed_session') {
    return res.redirect('/login');
  }

  if (!workos || !env.WORKOS_COOKIE_PASSWORD) {
    return res.redirect('/login');
  }

  try {
    const authResult = await workos.userManagement.authenticateWithSessionCookie({
      sessionData: cookieVal,
      cookiePassword: env.WORKOS_COOKIE_PASSWORD,
    });

    if (authResult.authenticated && authResult.sessionId) {
      const logoutUrl = workos.userManagement.getLogoutUrl({ sessionId: authResult.sessionId });
      console.log(`[Auth] Redirecting to WorkOS logout for session ${authResult.sessionId}`);
      return res.redirect(logoutUrl);
    }
  } catch (err) {
    console.error('❌ Failed to obtain WorkOS logout URL:', err);
  }

  res.redirect('/login');
});

export { router as authRoutes, doubleCsrfProtection };
