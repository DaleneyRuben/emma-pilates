import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export type IssuedAuthenticationToken = {
  secret: string;
  digest: Buffer;
};

export const digestAuthenticationToken = (secret: string): Buffer =>
  createHash('sha256').update(secret, 'utf8').digest();

export const issueAuthenticationToken = (): IssuedAuthenticationToken => {
  const secret = randomBytes(32).toString('base64url');

  return { secret, digest: digestAuthenticationToken(secret) };
};

export const matchesAuthenticationToken = (
  secret: string,
  expectedDigest: Uint8Array,
): boolean => {
  const actualDigest = digestAuthenticationToken(secret);

  return (
    actualDigest.length === expectedDigest.length &&
    timingSafeEqual(actualDigest, expectedDigest)
  );
};

export const authenticationTokens = {
  digest: digestAuthenticationToken,
  issue: issueAuthenticationToken,
  matches: matchesAuthenticationToken,
} as const;
