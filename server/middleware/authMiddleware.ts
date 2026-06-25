import {
  NextFunction,
  Request,
  Response,
} from 'express';

import {
  AuthUser,
  Permission,
} from '../../src/types';

import {
  requireAuthentication,
} from './requireAuthentication';

export interface AuthenticatedRequest
  extends Request {
  user?: AuthUser;
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  return requireAuthentication(
    req,
    res,
    next
  );
}

export function requirePermission(
  permission: Permission
) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    const user =
      req.user;

    if (!user) {
      return res
        .status(401)
        .json({
          success: false,

          error: {
            code:
              'UNAUTHORIZED',

            message:
              'Authenticated user context is missing.',
          },
        });
    }

    const permissions =
      user.permissions ?? [];

    if (
      !permissions.includes(
        permission
      )
    ) {
      console.warn(
        `[Authorization] ${user.email} (${user.role}) attempted ${permission}`
      );

      return res
        .status(403)
        .json({
          success: false,

          error: {
            code:
              'INSUFFICIENT_PERMISSIONS',

            message:
              `Your role does not allow the permission "${permission}".`,
          },
        });
    }

    return next();
  };
}