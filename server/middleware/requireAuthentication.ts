import {
  NextFunction,
  Response,
} from 'express';

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

function isApiRequest(
  req: any
): boolean {
  return (
    req.originalUrl?.startsWith(
      '/api/'
    ) ||
    req.xhr === true
  );
}

/**
 * Normalize an email address for comparison.
 */
function normalizeEmail(
  value: unknown
): string {
  return typeof value === 'string'
    ? value.trim().toLowerCase()
    : '';
}

/**
 * Read administrator email addresses from .env.
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
 * Extract role slugs from WorkOS session data.
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
 * Resolve authorization without reading or changing
 * WorkOS organization memberships.
 */
function resolveAuthorizationForUser(
  email: string,
  sessionRole?: unknown,
  sessionRoles?: unknown
) {
  const adminEmails =
    getConfiguredAdminEmails();

  const sessionRoleSlugs =
    extractRoleSlugs(
      sessionRole,
      sessionRoles
    );

  const isAdministrator =
    adminEmails.has(
      normalizeEmail(email)
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
 * Clear a session cookie without carrying maxAge or
 * expires into clearCookie().
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

export async function requireAuthentication(
  req: any,
  res: Response,
  next: NextFunction
) {
  /*
   * Authentication-disabled development mode.
   *
   * In the real WorkOS setup, .env must contain:
   *
   * AUTH_REQUIRED=true
   */
  if (!env.AUTH_REQUIRED) {
    const authorization =
      getDevelopmentAuthorization(
        WORKOS_ROLE_SLUGS.ADMIN
      );

    req.user = {
      user_id:
        'usr-dev-admin',

      auth_uid:
        'dev-admin',

      full_name:
        'Development Administrator',

      email:
        'admin@localhost',

      role:
        authorization.role,

      permissions:
        authorization.permissions,

      organization:
        'Local Development',

      account_status:
        'Active',
    };

    return next();
  }

  /*
   * Mock mode must be false for real WorkOS login.
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
        requestedRole
      );

    req.user = {
      user_id:
        'usr-mock',

      auth_uid:
        'mock-user',

      full_name:
        'Mock WorkOS User',

      email:
        'mock@localhost',

      role:
        authorization.role,

      permissions:
        authorization.permissions,

      organization:
        'Mock Organization',

      account_status:
        'Active',
    };

    return next();
  }

  const sessionData =
    req.cookies?.[
      SESSION_COOKIE_NAME
    ];

  /*
   * No cookie means the user is not authenticated.
   * Never create a Viewer user without a session.
   */
  if (!sessionData) {
    if (isApiRequest(req)) {
      return res
        .status(401)
        .json({
          success: false,

          error: {
            code:
              'UNAUTHORIZED',

            message:
              'No active WorkOS session was found.',
          },
        });
    }

    return res.redirect(
      '/login'
    );
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
            'WorkOS authentication is not configured on the server.',
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

      if (isApiRequest(req)) {
        return res
          .status(401)
          .json({
            success: false,

            error: {
              code:
                'SESSION_EXPIRED',

              message:
                'The WorkOS session is invalid or expired.',
            },
          });
      }

      return res.redirect(
        '/login'
      );
    }

    /*
     * No membership creation or reactivation occurs here.
     *
     * Admin:
     * - configured administrator email, or
     * - system_admin role in WorkOS session
     *
     * Everyone else:
     * - viewer
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

    req.user = {
      user_id:
        authResult.user.id,

      auth_uid:
        authResult.user.id,

      full_name:
        fullName,

      email:
        authResult.user.email,

      role:
        authorization.role,

      permissions:
        authorization.permissions,

      organization:
        authResult.organizationId ??
        authorization.organizationId ??
        'WorkOS',

      account_status:
        'Active',
    };

    return next();
  } catch (error) {
    console.error(
      '[Auth] WorkOS session validation failed:',
      error
    );

    clearSessionCookie(
      res
    );

    if (isApiRequest(req)) {
      return res
        .status(401)
        .json({
          success: false,

          error: {
            code:
              'UNAUTHORIZED',

            message:
              'The WorkOS session could not be validated.',
          },
        });
    }

    return res.redirect(
      '/login'
    );
  }
}