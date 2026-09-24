import { StreamableFile } from '@nestjs/common';
import type { Response } from 'express';

// Rebuilt image variants are served with a fixed content type and sniffing
// disabled (ADR-0073); the caller decides the caching policy (ADR-0063).
export const streamImage = (
  response: Response,
  bytes: Buffer,
  mediaType: string,
  cacheControl: string,
): StreamableFile => {
  response.setHeader('Content-Type', mediaType);
  response.setHeader('Cache-Control', cacheControl);
  response.setHeader('X-Content-Type-Options', 'nosniff');
  return new StreamableFile(bytes);
};
