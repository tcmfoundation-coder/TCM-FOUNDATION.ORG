import type { Response } from 'express';
import { COOKIE_NAMES } from './auth.constants';

// Cookies are the only place session tokens live — never returned in JSON
// response bodies — so client-side JS can't read or exfiltrate them.
// Authorization is still enforced server-side regardless (see RolesGuard);
// httpOnly is defense in depth, not the security boundary itself.
function baseCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: maxAgeSeconds * 1000,
    path: '/',
  };
}

export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
  ttls: { accessTtlSeconds: number; refreshTtlSeconds: number },
) {
  res.cookie(
    COOKIE_NAMES.ACCESS,
    tokens.accessToken,
    baseCookieOptions(ttls.accessTtlSeconds),
  );
  res.cookie(
    COOKIE_NAMES.REFRESH,
    tokens.refreshToken,
    baseCookieOptions(ttls.refreshTtlSeconds),
  );
  res.clearCookie(COOKIE_NAMES.MFA_PENDING, { path: '/' });
}

export function setMfaPendingCookie(
  res: Response,
  token: string,
  ttlSeconds: number,
) {
  res.cookie(COOKIE_NAMES.MFA_PENDING, token, baseCookieOptions(ttlSeconds));
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(COOKIE_NAMES.ACCESS, { path: '/' });
  res.clearCookie(COOKIE_NAMES.REFRESH, { path: '/' });
  res.clearCookie(COOKIE_NAMES.MFA_PENDING, { path: '/' });
}
