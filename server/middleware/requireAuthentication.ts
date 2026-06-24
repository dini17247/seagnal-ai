import { Response, NextFunction } from 'express';
import { workos } from '../auth/workosClient';
import { SESSION_COOKIE_NAME, getSessionCookieOptions } from '../auth/workosSession';
import * as env from '../config/env';

export async function requireAuthentication(req: any, res: Response, next: NextFunction) {
  // If authentication is not required, bypass and inject a mock/default user
  if (!env.AUTH_REQUIRED) {
    req.user = {
      user_id: 'usr-mock-001',
      auth_uid: 'auth_admin',
      full_name: 'Duty Command Officer',
      email: 'commander@seagnal.ai',
      role: 'System Administrator',
      organization: 'Seagnal Operations',
      account_status: 'Active'
    };
    return next();
  }

  // If mock auth is enabled, bypass using mock user
  if (env.USE_MOCK_AUTH) {
    const mockUid = req.headers['x-mock-uid'] as string || 'auth_admin';
    req.user = {
      user_id: 'usr-mock-001',
      auth_uid: mockUid,
      full_name: 'Mock Operations Officer',
      email: 'mock.officer@seagnal.ai',
      role: 'System Administrator',
      organization: 'Seagnal Operations',
      account_status: 'Active'
    };
    return next();
  }

  const cookieVal = req.cookies?.[SESSION_COOKIE_NAME];

  if (!cookieVal) {
    if (req.path.startsWith('/api/') || req.xhr) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'WorkOS session cookie not found.' }
      });
    }
    return res.redirect('/login');
  }

  if (!workos) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'WorkOS Client is not initialized on server.' }
    });
  }

  try {
    // Authenticate using the official WorkOS SDK method
    const authResult = await workos.userManagement.authenticateWithSessionCookie({
      sessionData: cookieVal,
      cookiePassword: env.WORKOS_COOKIE_PASSWORD!,
    });

    if (!authResult.authenticated) {
      res.clearCookie(SESSION_COOKIE_NAME, getSessionCookieOptions());
      if (req.path.startsWith('/api/') || req.xhr) {
        return res.status(401).json({
          success: false,
          error: { code: 'SESSION_EXPIRED', message: 'WorkOS session is invalid or expired.' }
        });
      }
      return res.redirect('/login');
    }

    // Map WorkOS user to Seagnal AI AuthUser
    const workosUser = authResult.user;
    req.user = {
      user_id: workosUser.id,
      auth_uid: workosUser.id,
      full_name: [workosUser.firstName, workosUser.lastName].filter(Boolean).join(' ') || workosUser.email.split('@')[0],
      email: workosUser.email,
      role: (authResult.role as any) || 'System Administrator',
      organization: authResult.organizationId || 'WorkOS Org',
      account_status: 'Active'
    };

    next();
  } catch (err: any) {
    console.error('❌ WorkOS session authentication error:', err);
    res.clearCookie(SESSION_COOKIE_NAME, getSessionCookieOptions());
    if (req.path.startsWith('/api/') || req.xhr) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid session cookie.' }
      });
    }
    return res.redirect('/login');
  }
}
