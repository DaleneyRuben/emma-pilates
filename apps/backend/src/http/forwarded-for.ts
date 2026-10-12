import type { IncomingMessage } from 'node:http';

/** The `X-Forwarded-For` entries in arrival order, leftmost first. */
export const forwardedEntries = (request: IncomingMessage): string[] => {
  const header = request.headers['x-forwarded-for'];
  const value = Array.isArray(header) ? header.join(',') : (header ?? '');
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '');
};
