import type { NextFunction, Request, Response } from 'express';
import { requestNetworkAddress } from './request-source';
import {
  type RequestRateLimiter,
  requestRateLimitLanes,
} from './request-rate-limit';
import { tooManyRequests } from './too-many-requests';

// The platform's health probes and Resend's signed delivery events must
// never be turned away.
const unlimitedPaths = ['/health/', '/api/v1/email-delivery-events'];

// Runs after the admin-web middleware, which turns the session cookie into
// an `AdminSession` authorization.
const credentialPattern = /^(?:Bearer|AdminSession) ([A-Za-z0-9_-]{43})$/;

/** BE-025: the general per-credential and per-address request limit. */
export const createRequestRateLimitMiddleware =
  (limiter: RequestRateLimiter) =>
  (request: Request, response: Response, next: NextFunction): void => {
    const path = request.originalUrl.split('?')[0] ?? '';
    if (unlimitedPaths.some((prefix) => path.startsWith(prefix))) {
      next();
      return;
    }

    const credential =
      credentialPattern.exec(request.headers.authorization ?? '')?.[1] ?? null;
    const retryAfterSeconds = limiter.admit(
      requestRateLimitLanes({
        networkAddress: requestNetworkAddress(request),
        credential,
      }),
    );

    if (retryAfterSeconds > 0) {
      throw tooManyRequests(response, retryAfterSeconds, {
        code: 'rate_limit_exceeded',
        detail: 'Too many requests. Try again later',
      });
    }
    next();
  };
