import { CookieOptions } from 'express';
import * as env from '../config/env';

export const SESSION_COOKIE_NAME =
  'wos-session';

export function getSessionCookieOptions():
  CookieOptions {
  return {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',

    secure:
      env.NODE_ENV ===
      'production',

    maxAge:
      7 *
      24 *
      60 *
      60 *
      1000,
  };
}