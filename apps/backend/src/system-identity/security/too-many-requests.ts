import { HttpException, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';

/** A 429 Problem with its stable code, after setting `Retry-After`. */
export const tooManyRequests = (
  response: Response,
  retryAfterSeconds: number,
  problem: { code: string; detail: string },
): HttpException => {
  response.setHeader('Retry-After', String(retryAfterSeconds));
  return new HttpException(problem, HttpStatus.TOO_MANY_REQUESTS);
};
