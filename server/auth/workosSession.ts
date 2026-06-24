import * as env from '../config/env';
import { CookieOptions } from 'express';

export const SESSION_COOKIE_NAME = 'wos-session';

export function getSessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
  };
}
