import {
  Router,
  type Response,
} from 'express';

import {
  doubleCsrf,
} from 'csrf-csrf';

import {
  workos,
} from '../auth/workosClient';

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

/**
 * Normalize email addresses before comparison.
 */
function normalizeEmail(
  value: unknown
): string {
  return typeof value === 'string'
    ? value.trim().toLowerCase()
    : '';
}

/**
 * Read administrator email addresses from:
 *
 * WORKOS_ADMIN_EMAILS=email1@example.com,email2@example.com
 *
 * WORKOS_ADMIN_EMAIL is also supported for compatibility.
 */
function getConfiguredAdminEmails():
  Set<string> {
  const configuredEmails = [
    process.env.WORKOS_ADMIN_EMAILS,
    process.env.WORKOS_ADMIN_EMAIL,
  ]
    .filter(
      (
        value
      ): value is string =>
        typeof value === 'string'
    )
    .join(',')
    .split(',')
    .map(normalizeEmail)
    .filter(Boolean);

  return new Set(
    configuredEmails
  );
}

/**
 * Extract role slugs from the WorkOS session.
 *
 * Supports either:
 * - "system_admin"
 * - { slug: "system_admin" }
 * - an array containing either format
 */
function extractRoleSlugs(
  ...roleValues: unknown[]
): string[] {
  return roleValues
    .flatMap((value) =>
      Array.isArray(value)
        ? value
        : [value]
    )
    .map((value) => {
      if (
        typeof value ===
        'string'
      ) {
        return value;
      }

      if (
        value &&
        typeof value ===
          'object' &&
        'slug' in value
      ) {
        const slug = (
          value as {
            slug?: unknown;
          }
        ).slug;

        return typeof slug ===
          'string'
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
          '_'
        )
    )
    .filter(Boolean);
}

/**
 * Resolve the application role without creating,
 * updating, deleting, or reactivating any WorkOS
 * organization membership.
 */
function resolveAuthorizationForUser(
  email: string,
  sessionRole?: unknown,
  sessionRoles?: unknown
) {
  const normalizedEmail =
    normalizeEmail(email);

  const adminEmails =
    getConfiguredAdminEmails();

  const sessionRoleSlugs =
    extractRoleSlugs(
      sessionRole,
      sessionRoles
    );

  const isAdministrator =
    adminEmails.has(
      normalizedEmail
    ) ||
    sessionRoleSlugs.includes(
      WORKOS_ROLE_SLUGS.ADMIN
    );

  return getDevelopmentAuthorization(
    isAdministrator
      ? WORKOS_ROLE_SLUGS.ADMIN
      : WORKOS_ROLE_SLUGS.VIEWER
  );
}

/**
 * Express recommends clearing a cookie with the same
 * options used when setting it, but without maxAge or
 * expires.
 */
function clearSessionCookie(
  res: Response
): void {
  const options = {
    ...getSessionCookieOptions(),
  };

  delete options.maxAge;
  delete options.expires;

  res.clearCookie(
    SESSION_COOKIE_NAME,
    options
  );
}

const {
  generateCsrfToken,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () =>
    env.CSRF_SECRET ||
    'development-only-csrf-secret-change-me',

  getSessionIdentifier: (
    req
  ) =>
    req.cookies?.[
      SESSION_COOKIE_NAME
    ] ||
    req.ip ||
    'anonymous',

  cookieName:
    'x-csrf-token',

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
    req
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
 * Start a fresh WorkOS AuthKit login.
 */
router.get(
  '/login',
  (_req, res) => {
    if (
      !env.AUTH_REQUIRED ||
      env.USE_MOCK_AUTH
    ) {
      return res.redirect(
        env.APP_BASE_URL
      );
    }

    if (
      !workos ||
      !env.WORKOS_CLIENT_ID
    ) {
      return res
        .status(500)
        .send(
          'WorkOS is not configured. Check WORKOS_API_KEY and WORKOS_CLIENT_ID.'
        );
    }

    try {
      const authorizationUrl =
        workos.userManagement
          .getAuthorizationUrl({
            provider:
              'authkit',

            clientId:
              env.WORKOS_CLIENT_ID,

            redirectUri:
              env.WORKOS_REDIRECT_URI,
          });

      /*
       * Force AuthKit to display a fresh sign-in screen
       * instead of silently choosing the previous user.
       *
       * These are added as URL parameters to avoid SDK
       * version differences in parameter naming.
       */
      const freshLoginUrl =
        new URL(
          authorizationUrl
        );

      freshLoginUrl.searchParams.set(
        'screen_hint',
        'sign-in'
      );

      freshLoginUrl.searchParams.set(
        'prompt',
        'login'
      );

      return res.redirect(
        freshLoginUrl.toString()
      );
    } catch (error: any) {
      console.error(
        '[Auth] Failed to generate WorkOS authorization URL:',
        error
      );

      return res
        .status(500)
        .send(
          `Authentication could not start: ${
            error?.message ||
            'Unknown WorkOS error'
          }`
        );
    }
  }
);

/**
 * WorkOS OAuth callback.
 *
 * This route only authenticates the user and stores the
 * sealed session. It performs no membership operations.
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
          }`
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
          'The WorkOS callback did not include an authorization code.'
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
          'WorkOS server credentials are incomplete.'
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
              sealSession:
                true,

              cookiePassword:
                env.WORKOS_COOKIE_PASSWORD,
            },
          });

      if (
        !authResponse.sealedSession
      ) {
        throw new Error(
          'WorkOS did not return a sealed session.'
        );
      }

      /*
       * Do not call:
       * - createOrganizationMembership
       * - reactivateOrganizationMembership
       * - ensureViewerMembership
       *
       * Authentication and membership management are
       * deliberately kept separate.
       */
      res.cookie(
        SESSION_COOKIE_NAME,
        authResponse.sealedSession,
        getSessionCookieOptions()
      );

      return res.redirect(
        env.APP_BASE_URL
      );
    } catch (error: any) {
      console.error(
        '[Auth] WorkOS callback failed:',
        error
      );

      const message =
        error?.message ||
        'Unknown WorkOS authentication error.';

      if (
        message
          .toLowerCase()
          .includes(
            'pending organization membership'
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
              'After removing it, return to http://localhost:3000/login and sign in again.',
            ].join('\n')
          );
      }

      return res
        .status(500)
        .send(
          `Authentication failed: ${message}`
        );
    }
  }
);

/**
 * Return the currently authenticated user.
 */
router.get(
  '/api/auth/me',
  async (req, res) => {
    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate'
    );

    if (!env.AUTH_REQUIRED) {
      const authorization =
        getDevelopmentAuthorization(
          WORKOS_ROLE_SLUGS.ADMIN
        );

      return res.json({
        id:
          'usr-dev-admin',

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
          requestedRole
        );

      return res.json({
        id:
          'usr-mock',

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
        clearSessionCookie(
          res
        );

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

      /*
       * Authorization is determined from:
       *
       * 1. WORKOS_ADMIN_EMAILS
       * 2. The system_admin role in the WorkOS session
       * 3. Viewer fallback
       *
       * No organization membership API is called.
       */
      const authorization =
        resolveAuthorizationForUser(
          authResult.user.email,
          authResult.role,
          authResult.roles
        );

      const fullName =
        [
          authResult.user.firstName,
          authResult.user.lastName,
        ]
          .filter(Boolean)
          .join(' ') ||
        authResult.user.name ||
        authResult.user.email
          .split('@')[0];

      return res.json({
        id:
          authResult.user.id,

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
        error
      );

      clearSessionCookie(
        res
      );

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
  }
);

/**
 * CSRF token used for logout.
 */
router.get(
  '/api/auth/csrf-token',
  (req, res) => {
    const csrfToken =
      generateCsrfToken(
        req,
        res
      );

    return res.json({
      csrfToken,
    });
  }
);

/**
 * Authentication configuration health check.
 */
router.get(
  '/api/health/auth',
  (_req, res) => {
    return res.json({
      authMode:
        env.AUTH_REQUIRED
          ? 'workos'
          : 'disabled',

      workosConfigured:
        Boolean(
          env.WORKOS_API_KEY &&
          env.WORKOS_CLIENT_ID &&
          env.WORKOS_COOKIE_PASSWORD
        ),

      redirectUri:
        env.WORKOS_REDIRECT_URI,

      organizationConfigured:
        Boolean(
          env.WORKOS_ORGANIZATION_ID
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
  }
);

/**
 * Clear the application session and end the WorkOS
 * hosted session when possible.
 */
router.post(
  '/logout',
  doubleCsrfProtection,
  async (req, res) => {
    const sessionData =
      req.cookies?.[
        SESSION_COOKIE_NAME
      ];

    /*
     * Clear the application cookie first so the user
     * cannot remain logged into the local application.
     */
    clearSessionCookie(
      res
    );

    if (
      !env.AUTH_REQUIRED ||
      env.USE_MOCK_AUTH ||
      !sessionData ||
      !workos ||
      !env.WORKOS_COOKIE_PASSWORD
    ) {
      return res.json({
        logoutUrl:
          `${env.APP_BASE_URL}/login`,
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
        authResult.authenticated
      ) {
        const logoutUrl =
          workos.userManagement
            .getLogoutUrl({
              sessionId:
                authResult.sessionId,

              returnTo:
                `${env.APP_BASE_URL}/login`,
            });

        return res.json({
          logoutUrl,
        });
      }
    } catch (error) {
      console.error(
        '[Auth] Could not generate WorkOS logout URL:',
        error
      );
    }

    return res.json({
      logoutUrl:
        `${env.APP_BASE_URL}/login`,
    });
  }
);

export {
  router as authRoutes,
  doubleCsrfProtection,
};