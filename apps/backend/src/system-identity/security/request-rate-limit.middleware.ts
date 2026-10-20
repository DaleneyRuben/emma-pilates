import type { NextFunction, Request, Response } from 'express';
import type { RequestRateLimiter } from './request-rate-limit';

export const createRequestRateLimitMiddleware =
  (limiter: RequestRateLimiter) =>
  (_request: Request, _response: Response, next: NextFunction): void => {
    limiter.admit([]);
    next();
  };
