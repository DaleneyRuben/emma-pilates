import { createHmac, randomUUID } from 'node:crypto';
import type { ConfigService } from '@nestjs/config';
import type { Environment } from '../../config/environment';
import {
  argon2PasswordHasher,
  dummyPasswordHash,
} from '../security/argon2-password-hasher';
import { authenticationTokens } from '../security/authentication-token-service';
import type { login } from './login';
import type { PrismaAuthenticationGateway } from './prisma-authentication-gateway';

export const loginDependencies = (
  gateway: PrismaAuthenticationGateway,
  config: ConfigService<Environment, true>,
): Parameters<typeof login>[1] => ({
  findAccountByEmail: (email) => gateway.findAccountByEmail(email),
  verifyPassword: argon2PasswordHasher.verify,
  dummyPasswordHash,
  digestSignal: (value) =>
    createHmac('sha256', config.getOrThrow('AUTHENTICATION_EMAIL_DIGEST_KEY'))
      .update(value)
      .digest(),
  readThrottleEvents: (input) => gateway.readThrottleEvents(input),
  recordFailedCredentialCheck: (input) =>
    gateway.recordFailedCredentialCheck(input),
  completeLogin: (input) => gateway.completeLogin(input),
  issueCredential: authenticationTokens.issue,
  now: () => new Date(),
  newId: randomUUID,
});
