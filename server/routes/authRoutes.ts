import {
  Router,
  type Request,
  type Response,
} from 'express';

import { doubleCsrf } from 'csrf-csrf';

import { workos } from '../auth/workosClient';

import {
  SESSION_COOKIE_NAME,
  getSessionCookieOptions,
} from '../auth/workosSession';

import {
  getDevelopmentAuthorization,
  WORKOS_ROLE_SLUGS,
} from '../auth/workosAuthorization';

import * as env from '../config/env';

const router = Router();

function firstForwardedValue(
  value: string | undefined,
): string | undefined {
  return (
    value
      ?.split(',')[0]
      ?.trim() || undefined
  );
}

/**
 * Resolve the public application URL.
 *
 * Local development may use APP_BASE_URL.
 *
 * Cloud Run derives the URL from:
 * - X-Forwarded-Proto
 * - X-Forwarded-Host
 */
function getApplicationBaseUrl(
  req: Request,
): string {
  if (env.APP_BASE_URL) {
    return env.APP_BASE_URL.replace(
      /\/$/,
      '',
    );
  }

  const protocol =
    firstForwardedValue(
      req.get('x-forwarded-proto'),
    ) ||
    req.protocol ||
    'http';

  const host =
    firstForwardedValue(
      req.get('x-forwarded-host'),
    ) || req.get('host');

  if (!host) {
    throw new Error(
      'Unable to determine the application host.',
    );
  }

  return `${protocol}://${host}`;
}

function getWorkOSRedirectUri(
  req: Request,
): string {
  return (
    env.WORKOS_REDIRECT_URI ||
    `${getApplicationBaseUrl(
      req,
    )}/callback`
  );
}

function normalizeEmail(
  value: unknown,
): string {
  return typeof value === 'string'
    ? value.trim().toLowerCase()
    : '';
}

/**
 * Supported environment variables:
 *
 * WORKOS_ADMIN_EMAILS=email1@example.com,email2@example.com
 * WORKOS_ADMIN_EMAIL=email@example.com
 */
function getConfiguredAdminEmails(): Set<string> {
  const configuredEmails = [
    process.env.WORKOS_ADMIN_EMAILS,
    process.env.WORKOS_ADMIN_EMAIL,
  ]
    .filter(
      (
        value,
      ): value is string =>
        typeof value === 'string',
    )
    .join(',')
    .split(',')
    .map(normalizeEmail)
    .filter(Boolean);

  return new Set(configuredEmails);
}

/**
 * WorkOS roles may be returned as:
 *
 * "system_admin"
 *
 * or:
 *
 * {
 *   slug: "system_admin"
 * }
 *
 * or an array containing either format.
 */
function extractRoleSlugs(
  ...roleValues: unknown[]
): string[] {
  return roleValues
    .flatMap((value) =>
      Array.isArray(value)
        ? value
        : [value],
    )
    .map((value) => {
      if (
        typeof value === 'string'
      ) {
        return value;
      }

      if (
        value &&
        typeof value === 'object' &&
        'slug' in value
      ) {
        const slug = (
          value as {
            slug?: unknown;
          }
        ).slug;

        return typeof slug === 'string'
          ? slug
          : '';
      }

      return '';
    })
    .map((value) =>
      value
        .trim()
        .toLowerCase()
        .replace(
          /[\s-]+/g,
          '_',
        ),
    )
    .filter(Boolean);
}

/**
 * Resolve authorization without creating, updating,
 * deleting or reactivating WorkOS organization
 * memberships.
 */
function resolveAuthorizationForUser(
  email: string,
  sessionRole?: unknown,
  sessionRoles?: unknown,
) {
  const normalizedEmail =
    normalizeEmail(email);

  const adminEmails =
    getConfiguredAdminEmails();

  const sessionRoleSlugs =
    extractRoleSlugs(
      sessionRole,
      sessionRoles,
    );

  const isAdministrator =
    adminEmails.has(
      normalizedEmail,
    ) ||
    sessionRoleSlugs.includes(
      WORKOS_ROLE_SLUGS.ADMIN,
    );

  return getDevelopmentAuthorization(
    isAdministrator
      ? WORKOS_ROLE_SLUGS.ADMIN
      : WORKOS_ROLE_SLUGS.VIEWER,
  );
}

/**
 * Clear the WorkOS session cookie using the same options
 * that were used when setting it.
 */
function clearSessionCookie(
  res: Response,
): void {
  const options = {
    ...getSessionCookieOptions(),
  };

  delete options.maxAge;
  delete options.expires;

  res.clearCookie(
    SESSION_COOKIE_NAME,
    options,
  );
}

const {
  generateCsrfToken,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () =>
    env.CSRF_SECRET ||
    'development-only-csrf-secret-change-me',

  getSessionIdentifier: (req) =>
    req.cookies?.[
      SESSION_COOKIE_NAME
    ] ||
    req.ip ||
    'anonymous',

  cookieName: 'x-csrf-token',

  cookieOptions: {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',

    secure:
      env.NODE_ENV ===
      'production',
  },

  size: 64,

  ignoredMethods: [
    'GET',
    'HEAD',
    'OPTIONS',
  ],

  getCsrfTokenFromRequest: (
    req,
  ) =>
    typeof req.headers[
      'x-csrf-token'
    ] === 'string'
      ? req.headers[
          'x-csrf-token'
        ]
      : undefined,
});

/**
 * Start WorkOS AuthKit login.
 */
router.get(
  '/login',
  (req, res) => {
    if (
      !env.AUTH_REQUIRED ||
      env.USE_MOCK_AUTH
    ) {
      return res.redirect(
        getApplicationBaseUrl(req),
      );
    }

    if (
      !workos ||
      !env.WORKOS_CLIENT_ID
    ) {
      return res
        .status(500)
        .send(
          'WorkOS is not configured. Check WORKOS_API_KEY and WORKOS_CLIENT_ID.',
        );
    }

    try {
      const authorizationUrl =
        workos.userManagement
          .getAuthorizationUrl({
            provider: 'authkit',

            clientId:
              env.WORKOS_CLIENT_ID,

            redirectUri:
              getWorkOSRedirectUri(
                req,
              ),
          });

      const freshLoginUrl =
        new URL(
          authorizationUrl,
        );

      freshLoginUrl.searchParams.set(
        'screen_hint',
        'sign-in',
      );

      freshLoginUrl.searchParams.set(
        'prompt',
        'login',
      );

      return res.redirect(
        freshLoginUrl.toString(),
      );
    } catch (error: any) {
      console.error(
        '[Auth] Failed to generate WorkOS authorization URL:',
        error,
      );

      return res
        .status(500)
        .send(
          `Authentication could not start: ${
            error?.message ||
            'Unknown WorkOS error'
          }`,
        );
    }
  },
);

/**
 * WorkOS OAuth callback.
 *
 * This route only authenticates the user and stores the
 * sealed WorkOS session.
 *
 * It does not create, update or reactivate organization
 * memberships.
 */
router.get(
  '/callback',
  async (req, res) => {
    const callbackError =
      typeof req.query.error ===
      'string'
        ? req.query.error
        : undefined;

    const callbackErrorDescription =
      typeof req.query
        .error_description ===
      'string'
        ? req.query
            .error_description
        : undefined;

    if (callbackError) {
      return res
        .status(400)
        .send(
          `WorkOS authentication failed: ${
            callbackErrorDescription ||
            callbackError
          }`,
        );
    }

    const code =
      typeof req.query.code ===
      'string'
        ? req.query.code
        : undefined;

    if (!code) {
      return res
        .status(400)
        .send(
          'The WorkOS callback did not include an authorization code.',
        );
    }

    if (
      !workos ||
      !env.WORKOS_CLIENT_ID ||
      !env.WORKOS_COOKIE_PASSWORD
    ) {
      return res
        .status(500)
        .send(
          'WorkOS server credentials are incomplete.',
        );
    }

    try {
      const authResponse =
        await workos.userManagement
          .authenticateWithCode({
            code,

            clientId:
              env.WORKOS_CLIENT_ID,

            session: {
              sealSession: true,

              cookiePassword:
                env.WORKOS_COOKIE_PASSWORD,
            },
          });

      if (
        !authResponse.sealedSession
      ) {
        throw new Error(
          'WorkOS did not return a sealed session.',
        );
      }

      /**
       * Never call:
       *
       * createOrganizationMembership
       * reactivateOrganizationMembership
       * ensureViewerMembership
       *
       * Login and membership management must remain
       * separate.
       */
      res.cookie(
        SESSION_COOKIE_NAME,
        authResponse.sealedSession,
        getSessionCookieOptions(),
      );

      return res.redirect(
        getApplicationBaseUrl(req),
      );
    } catch (error: any) {
      console.error(
        '[Auth] WorkOS callback failed:',
        error,
      );

      const message =
        error?.message ||
        'Unknown WorkOS authentication error.';

      if (
        message
          .toLowerCase()
          .includes(
            'pending organization membership',
          )
      ) {
        return res
          .status(409)
          .send(
            [
              'Authentication failed because WorkOS still has a pending organization membership for this account.',
              '',
              'Open the WorkOS organization member list and remove the pending membership record itself.',
              'Revoking only the invitation may not remove the pending membership.',
              '',
              `After removing it, return to ${getApplicationBaseUrl(
                req,
              )}/login and sign in again.`,
            ].join('\n'),
          );
      }

      return res
        .status(500)
        .send(
          `Authentication failed: ${message}`,
        );
    }
  },
);

/**
 * Return the currently authenticated user.
 */
router.get(
  '/api/auth/me',
  async (req, res) => {
    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate',
    );

    /**
     * Authentication completely disabled.
     */
    if (!env.AUTH_REQUIRED) {
      const authorization =
        getDevelopmentAuthorization(
          WORKOS_ROLE_SLUGS.ADMIN,
        );

      return res.json({
        id: 'usr-dev-admin',

        email:
          'admin@localhost',

        fullName:
          'Development Administrator',

        organizationId:
          authorization.organizationId,

        role:
          authorization.role,

        roleSlug:
          authorization.roleSlug,

        permissions:
          authorization.permissions,
      });
    }

    /**
     * Mock authentication enabled.
     */
    if (env.USE_MOCK_AUTH) {
      const requestedRole =
        typeof req.headers[
          'x-mock-role'
        ] === 'string'
          ? req.headers[
              'x-mock-role'
            ]
          : WORKOS_ROLE_SLUGS.VIEWER;

      const authorization =
        getDevelopmentAuthorization(
          requestedRole,
        );

      return res.json({
        id: 'usr-mock',

        email:
          'mock@localhost',

        fullName:
          'Mock WorkOS User',

        organizationId:
          authorization.organizationId,

        role:
          authorization.role,

        roleSlug:
          authorization.roleSlug,

        permissions:
          authorization.permissions,
      });
    }

    const sessionData =
      req.cookies?.[
        SESSION_COOKIE_NAME
      ];

    if (!sessionData) {
      return res
        .status(401)
        .json({
          success: false,

          error: {
            code:
              'UNAUTHENTICATED',

            message:
              'No active WorkOS session was found.',
          },
        });
    }

    if (
      !workos ||
      !env.WORKOS_COOKIE_PASSWORD
    ) {
      return res
        .status(500)
        .json({
          success: false,

          error: {
            code:
              'AUTH_NOT_CONFIGURED',

            message:
              'WorkOS authentication is not configured.',
          },
        });
    }

    try {
      const authResult =
        await workos.userManagement
          .authenticateWithSessionCookie({
            sessionData,

            cookiePassword:
              env.WORKOS_COOKIE_PASSWORD,
          });

      if (
        !authResult.authenticated
      ) {
        clearSessionCookie(res);

        return res
          .status(401)
          .json({
            success: false,

            error: {
              code:
                'SESSION_INVALID',

              message:
                'The WorkOS session is invalid or expired.',
            },
          });
      }

      /**
       * Authorization is resolved from:
       *
       * 1. WORKOS_ADMIN_EMAILS
       * 2. system_admin role from WorkOS
       * 3. Viewer fallback
       *
       * No WorkOS membership API is called here.
       */
      const authorization =
        resolveAuthorizationForUser(
          authResult.user.email,
          authResult.role,
          authResult.roles,
        );

      const fullName =
        [
          authResult.user
            .firstName,

          authResult.user
            .lastName,
        ]
          .filter(Boolean)
          .join(' ') ||
        authResult.user.name ||
        authResult.user.email
          .split('@')[0];

      return res.json({
        id: authResult.user.id,

        email:
          authResult.user.email,

        fullName,

        organizationId:
          authResult.organizationId ??
          authorization.organizationId,

        role:
          authorization.role,

        roleSlug:
          authorization.roleSlug,

        permissions:
          authorization.permissions,
      });
    } catch (error) {
      console.error(
        '[Auth] Failed to load current WorkOS user:',
        error,
      );

      clearSessionCookie(res);

      return res
        .status(401)
        .json({
          success: false,

          error: {
            code:
              'SESSION_INVALID',

            message:
              'The WorkOS session could not be validated.',
          },
        });
    }
  },
);

/**
 * Generate a CSRF token for logout.
 */
router.get(
  '/api/auth/csrf-token',
  (req, res) => {
    const csrfToken =
      generateCsrfToken(
        req,
        res,
      );

    return res.json({
      csrfToken,
    });
  },
);

/**
 * Authentication health check.
 */
router.get(
  '/api/health/auth',
  (req, res) => {
    return res.json({
      authMode:
        env.AUTH_REQUIRED
          ? 'workos'
          : 'disabled',

      workosConfigured:
        Boolean(
          env.WORKOS_API_KEY &&
          env.WORKOS_CLIENT_ID &&
          env.WORKOS_COOKIE_PASSWORD,
        ),

      redirectUri:
        getWorkOSRedirectUri(
          req,
        ),

      organizationConfigured:
        Boolean(
          env.WORKOS_ORGANIZATION_ID,
        ),

      adminEmailConfigured:
        getConfiguredAdminEmails()
          .size > 0,

      availableRoles: [
        WORKOS_ROLE_SLUGS.ADMIN,
        WORKOS_ROLE_SLUGS.VIEWER,
      ],

      useMockAuth:
        env.USE_MOCK_AUTH,
    });
  },
);

/**
 * Clear the application session and end the hosted
 * WorkOS session where possible.
 */
router.post(
  '/logout',
  doubleCsrfProtection,
  async (req, res) => {
    const sessionData =
      req.cookies?.[
        SESSION_COOKIE_NAME
      ];

    clearSessionCookie(res);

    const applicationBaseUrl =
      getApplicationBaseUrl(req);

    const returnToUrl =
      `${applicationBaseUrl}/login`;

    if (
      !env.AUTH_REQUIRED ||
      env.USE_MOCK_AUTH ||
      !sessionData ||
      !workos ||
      !env.WORKOS_COOKIE_PASSWORD
    ) {
      return res.json({
        logoutUrl: returnToUrl,
      });
    }

    try {
      const authResult =
        await workos.userManagement
          .authenticateWithSessionCookie({
            sessionData,

            cookiePassword:
              env.WORKOS_COOKIE_PASSWORD,
          });

      if (authResult.authenticated) {
        const logoutUrl =
          workos.userManagement
            .getLogoutUrl({
              sessionId:
                authResult.sessionId,

              returnTo:
                returnToUrl,
            });

        return res.json({
          logoutUrl,
        });
      }
    } catch (error) {
      console.error(
        '[Auth] Could not generate WorkOS logout URL:',
        error,
      );
    }

    return res.json({
      logoutUrl: returnToUrl,
    });
  },
);

export {
  router as authRoutes,
  doubleCsrfProtection,
};