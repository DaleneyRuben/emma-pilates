import { randomBytes } from 'node:crypto';
import type { CookieOptions, Response } from 'express';
import { authenticationSessionLifetimes } from '../authentication/create-authentication-session';

// ADR-0030/ADR-0084: `__Host-` makes the browser itself refuse a Domain
// attribute, a non-root Path, or a cookie without Secure, so both cookies
// stay host-only on whichever origin proxies /api/v1.
export const adminSessionCookieName = '__Host-emma-admin-session';
export const adminClientCookieName = '__Host-emma-admin-client';

const cookieValuePattern = /^[A-Za-z0-9_-]{43}$/;
const browserIdentifierMaxAgeMilliseconds = 180 * 24 * 60 * 60 * 1_000;

const baseOptions: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  path: '/',
};

export const readCookie = (
  header: string | undefined,
  name: string,
): string | null => {
  for (const part of (header ?? '').split(';')) {
    const separator = part.indexOf('=');
    if (separator > 0 && part.slice(0, separator).trim() === name) {
      const value = part.slice(separator + 1).trim();
      return cookieValuePattern.test(value) ? value : null;
    }
  }
  return null;
};

export const setSessionCookie = (response: Response, credential: string) =>
  response.cookie(adminSessionCookieName, credential, {
    ...baseOptions,
    maxAge: authenticationSessionLifetimes.admin_web.absoluteMilliseconds,
  });

export const clearSessionCookie = (response: Response) =>
  response.cookie(adminSessionCookieName, '', { ...baseOptions, maxAge: 0 });

/**
 * ADR-0029: the admin web's broader throttling signal is a random
 * first-party identifier in a cookie, never a fingerprint. A missing or
 * malformed one is replaced; the backend still treats it as untrusted.
 */
export const browserClientIdentifier = (
  cookieHeader: string | undefined,
  response: Response,
): string => {
  const existing = readCookie(cookieHeader, adminClientCookieName);
  if (existing !== null) return existing;

  const identifier = randomBytes(32).toString('base64url');
  response.cookie(adminClientCookieName, identifier, {
    ...baseOptions,
    maxAge: browserIdentifierMaxAgeMilliseconds,
  });
  return identifier;
};
