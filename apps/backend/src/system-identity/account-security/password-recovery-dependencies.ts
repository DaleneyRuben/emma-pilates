import { randomUUID } from 'node:crypto';
import { argon2PasswordHasher } from '../security/argon2-password-hasher';
import type { AuthenticationLinkCipher } from '../security/authentication-link-cipher';
import { authenticationTokens } from '../security/authentication-token-service';
import type { completePasswordRecovery } from './password-recovery';
import type { PrismaAccountSecurityGateway } from './prisma-account-security-gateway';

export const passwordRecoveryDependencies = (
  gateway: PrismaAccountSecurityGateway,
  linkCipher: AuthenticationLinkCipher,
): Parameters<typeof completePasswordRecovery>[1] => ({
  gateway,
  issueLinkToken: authenticationTokens.issue,
  issueSessionCredential: authenticationTokens.issue,
  digestToken: authenticationTokens.digest,
  encryptLinkSecret: (secret) => linkCipher.encrypt(secret),
  hashPassword: argon2PasswordHasher.hash,
  now: () => new Date(),
  newTokenId: randomUUID,
  newSessionId: randomUUID,
  newAuditRecordId: randomUUID,
});
