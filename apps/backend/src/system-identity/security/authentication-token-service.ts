import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export type IssuedAuthenticationToken = {
  secret: string;
  digest: Buffer;
};

export class AuthenticationTokenService {
  issue(): IssuedAuthenticationToken {
    const secret = randomBytes(32).toString('base64url');

    return { secret, digest: this.digest(secret) };
  }

  matches(secret: string, expectedDigest: Uint8Array): boolean {
    const actualDigest = this.digest(secret);

    return (
      actualDigest.length === expectedDigest.length &&
      timingSafeEqual(actualDigest, expectedDigest)
    );
  }

  digest(secret: string): Buffer {
    return createHash('sha256').update(secret, 'utf8').digest();
  }
}
