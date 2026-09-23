import {
  type AuthenticationSurface,
  authenticationSessionTimes,
  type NewAuthenticationSession,
} from '../authentication/create-authentication-session';

/** Who may receive the replacement session a completed recovery opens. */
export type RecoverySessionEligibility = 'any' | 'administrator';

type RecoveryToken = {
  id: string;
  digest: Uint8Array;
  expiresAt: Date;
};

type RecoveryEmailJob = {
  purpose: 'password_recovery';
  authenticationTokenId: string;
  encryptedLinkSecret: string;
  encryptionKeyId: string;
};

export type PasswordRecoveryGateway = {
  requestRecovery(input: {
    email: string;
    token: RecoveryToken;
    emailJob: RecoveryEmailJob;
    requestedAt: Date;
  }): Promise<'issued' | 'suppressed' | 'unknown'>;
  inspectRecoveryLink(input: {
    tokenDigest: Uint8Array;
    inspectedAt: Date;
  }): Promise<'current' | 'expired' | 'invalid'>;
  completeRecovery(input: {
    tokenDigest: Uint8Array;
    passwordHash: string;
    completedAt: Date;
    authenticationSession: Omit<NewAuthenticationSession, 'accountId'>;
    sessionEligibility: RecoverySessionEligibility;
    auditRecordId: string;
  }): Promise<{ sessionOpened: boolean }>;
};

type PasswordRecoveryDependencies = {
  gateway: PasswordRecoveryGateway;
  issueLinkToken(): { secret: string; digest: Uint8Array };
  issueSessionCredential(): { secret: string; digest: Uint8Array };
  digestToken(secret: string): Uint8Array;
  encryptLinkSecret(secret: string): {
    encryptedLinkSecret: string;
    encryptionKeyId: string;
  };
  hashPassword(password: string): Promise<string>;
  now(): Date;
  newTokenId(): string;
  newSessionId(): string;
  newAuditRecordId(): string;
};

const minuteMilliseconds = 60 * 1_000;

export const requestPasswordRecovery = async (
  command: { email: string },
  dependencies: PasswordRecoveryDependencies,
): Promise<{ status: 'accepted' }> => {
  const requestedAt = dependencies.now();
  const token = dependencies.issueLinkToken();
  const authenticationTokenId = dependencies.newTokenId();

  await dependencies.gateway.requestRecovery({
    email: command.email.trim().toLowerCase(),
    token: {
      id: authenticationTokenId,
      digest: token.digest,
      expiresAt: new Date(requestedAt.getTime() + 30 * minuteMilliseconds),
    },
    emailJob: {
      purpose: 'password_recovery',
      authenticationTokenId,
      ...dependencies.encryptLinkSecret(token.secret),
    },
    requestedAt,
  });

  return { status: 'accepted' };
};

export const completePasswordRecovery = async (
  command: { token: string; password: string },
  dependencies: PasswordRecoveryDependencies,
  surface: AuthenticationSurface = 'mobile',
): Promise<
  | { status: 'invalid' | 'expired' }
  | { status: 'recovered'; credential?: string }
> => {
  const completedAt = dependencies.now();
  const tokenDigest = dependencies.digestToken(command.token);
  const linkState = await dependencies.gateway.inspectRecoveryLink({
    tokenDigest,
    inspectedAt: completedAt,
  });

  if (linkState !== 'current') {
    return { status: linkState };
  }

  const passwordHash = await dependencies.hashPassword(command.password);
  const credential = dependencies.issueSessionCredential();
  const authenticationSession = {
    id: dependencies.newSessionId(),
    surface,
    credentialDigest: credential.digest,
    ...authenticationSessionTimes(surface, completedAt),
  };

  // ADR-0030 opens one replacement session where the reset completed; the
  // admin web may hold one only for an Administrator (ADR-0053).
  const { sessionOpened } = await dependencies.gateway.completeRecovery({
    tokenDigest,
    passwordHash,
    completedAt,
    authenticationSession,
    sessionEligibility: surface === 'admin_web' ? 'administrator' : 'any',
    auditRecordId: dependencies.newAuditRecordId(),
  });

  if (!sessionOpened) {
    return { status: 'recovered' };
  }

  return { status: 'recovered', credential: credential.secret };
};
