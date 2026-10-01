import { createHmac } from 'node:crypto';
import type { ConfigService } from '@nestjs/config';
import type { Environment } from '../../config/environment';

/**
 * ADR-0029 keyed digest for throttle keys and email lookups, so raw
 * addresses, client identifiers, and network addresses are never stored.
 */
export const authenticationDigest =
  (config: ConfigService<Environment, true>) =>
  (value: string): Buffer =>
    createHmac('sha256', config.getOrThrow('AUTHENTICATION_EMAIL_DIGEST_KEY'))
      .update(value)
      .digest();
