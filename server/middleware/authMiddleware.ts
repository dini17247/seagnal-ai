import { Request, Response, NextFunction } from 'express';
import * as env from '../config/env';
import { AuthUser, Permission, UserRole } from '../../src/types';
import { requireAuthentication } from './requireAuthentication';

// Extend typical Express Request parameters inline via type assertion in handlers or here
export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

// Role-to-Permission mapping
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  'System Administrator': [
    'dashboard.view', 'map.view', 'vessels.view', 'alerts.view', 'alerts.audit', 'alerts.resolve',
    'reports.view', 'reports.create', 'reports.edit', 'reports.finalize', 'reports.export',
    'settings.view', 'settings.update', 'users.view', 'users.manage', 'audit_logs.view'
  ],
  'Watch Commander': [
    'dashboard.view', 'map.view', 'vessels.view', 'alerts.view', 'alerts.audit', 'alerts.resolve',
    'reports.view', 'reports.finalize', 'reports.export', 'settings.view'
  ],
  'Intelligence Analyst': [
    'dashboard.view', 'map.view', 'vessels.view', 'alerts.view',
    'reports.view', 'reports.create', 'reports.edit', 'reports.export'
  ],
  'Alert Officer': [
    'dashboard.view', 'map.view', 'vessels.view', 'alerts.view', 'alerts.audit', 'alerts.resolve'
  ],
  'Read Only Viewer': [
    'dashboard.view', 'map.view', 'vessels.view'
  ]
};

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  return requireAuthentication(req, res, next);
}

// Curried Helper to enforce specific RBAC Permission
export function requirePermission(permission: Permission) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!env.AUTH_REQUIRED) {
      return next(); // Enforce nothing in open mock development
    }

    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Session user context is missing.' }
      });
    }

    const allowedPermissions = ROLE_PERMISSIONS[user.role] || [];
    if (!allowedPermissions.includes(permission)) {
      console.warn(`🔒 RBAC Access Denied: User ${user.email} (${user.role}) attempted to access ${permission}`);
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Your current role '${user.role}' lacks the mandatory permission node '${permission}' to execute this action.`
        }
      });
    }

    next();
  };
}
