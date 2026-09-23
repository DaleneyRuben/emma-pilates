import { HttpException, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { AuthenticationFailedError } from './authenticate-credentials';
import { LoginThrottledError } from './login';

/**
 * ADR-0029: one neutral failure for every rejected Login and a neutral
 * throttling problem whose only hint is the server-computed `Retry-After`.
 */
export const toLoginProblem = (error: unknown, response: Response): unknown => {
  if (error instanceof AuthenticationFailedError) {
    return new HttpException(
      {
        code: 'authentication_failed',
        detail: 'Email or password is incorrect',
      },
      HttpStatus.UNAUTHORIZED,
    );
  }

  if (error instanceof LoginThrottledError) {
    response.setHeader('Retry-After', String(error.retryAfterSeconds));
    return new HttpException(
      {
        code: 'login_throttled',
        detail: 'Login is temporarily unavailable. Try again later',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  return error;
};
