import { ForbiddenException } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { adminSessionCookieName, readCookie } from './admin-web-cookies';

const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);
const adminWebPathPrefix = '/api/v1/admin-web/';

/**
 * ADR-0084: the admin web authenticates with a host-only cookie, so every
 * state-changing request that the cookie authenticates, and every admin-web
 * session endpoint, must come from an exact configured origin. The cookie is
 * then handed to the ordinary principal resolution as an `AdminSession`
 * credential; a caller can never send that scheme itself.
 */
export const createAdminWebRequestMiddleware =
  (trustedOrigins: readonly string[]) =>
  (request: Request, _response: Response, next: NextFunction): void => {
    if (/^adminsession\b/i.test(request.headers.authorization ?? '')) {
      delete request.headers.authorization;
    }

    const sessionCredential =
      request.headers.authorization === undefined
        ? readCookie(request.headers.cookie, adminSessionCookieName)
        : null;
    const path = request.originalUrl.split('?')[0] ?? '';
    const needsTrustedOrigin =
      !safeMethods.has(request.method) &&
      (sessionCredential !== null || path.startsWith(adminWebPathPrefix));

    if (
      needsTrustedOrigin &&
      !trustedOrigins.includes(request.headers.origin ?? '')
    ) {
      throw new ForbiddenException({
        code: 'untrusted_origin',
        detail: 'The request origin is not trusted',
      });
    }

    if (sessionCredential !== null) {
      request.headers.authorization = `AdminSession ${sessionCredential}`;
    }
    next();
  };
