import type { AuthenticationEmailJob } from '../../jobs/authentication-email/authentication-email-job';
import type { AuthenticatedPrincipal } from '../authentication/resolve-authenticated-principal';
import type { EncryptedAuthenticationLink } from '../security/authentication-link-cipher';
import type { IssuedAuthenticationToken } from '../security/authentication-token-service';

// IDN-008: an active Account changes its login email only after opening a
// Verification Link sent to the new address (proposal decisions E1-E14).
const emailChangeLifetimeMilliseconds = 24 * 60 * 60 * 1_000;

export type EmailChangeToken = {
  id: string;
  digest: Uint8Array;
  expiresAt: Date;
};

export type PendingEmailChange = {
  email: string;
  requestedAt: Date;
  expiresAt: Date;
};

export type EmailChangeCompletionStatus =
  'changed' | 'expired' | 'invalid' | 'email_unavailable';

export type EmailChangeGateway = {
  // Stores the pending change and its token; queues the link and the notice
  // only when the address is free and the recipient lane has room (E7, E8).
  request: (input: {
    accountId: string;
    newEmail: string;
    now: Date;
    token: EmailChangeToken;
    linkJob: AuthenticationEmailJob;
    noticeJob: AuthenticationEmailJob;
  }) => Promise<'requested' | 'unchanged' | 'not_active'>;
  resend: (input: {
    accountId: string;
    now: Date;
    token: EmailChangeToken;
    linkJob: AuthenticationEmailJob;
  }) => Promise<'sent' | 'suppressed' | 'none'>;
  cancel: (input: {
    accountId: string;
    now: Date;
  }) => Promise<'cancelled' | 'none'>;
  readPending: (input: {
    accountId: string;
    now: Date;
  }) => Promise<PendingEmailChange | null>;
  complete: (input: {
    tokenDigest: Uint8Array;
    now: Date;
  }) => Promise<EmailChangeCompletionStatus>;
};

export type EmailChangeErrorCode =
  'email_unchanged' | 'account_not_active' | 'email_change_not_pending';

const statuses: Record<EmailChangeErrorCode, number> = {
  email_unchanged: 400,
  account_not_active: 409,
  email_change_not_pending: 404,
};

export class EmailChangeError extends Error {
  readonly status: number;

  constructor(readonly code: EmailChangeErrorCode) {
    super(code);
    this.name = 'EmailChangeError';
    this.status = statuses[code];
  }
}

export type EmailChangeDependencies = {
  gateway: EmailChangeGateway;
  tokens: {
    issue: () => IssuedAuthenticationToken;
    digest: (secret: string) => Uint8Array;
  };
  linkCipher: { encrypt: (secret: string) => EncryptedAuthenticationLink };
  now: () => Date;
  newId: () => string;
};

const issueLink = (dependencies: EmailChangeDependencies, now: Date) => {
  const issued = dependencies.tokens.issue();
  const encrypted = dependencies.linkCipher.encrypt(issued.secret);
  const id = dependencies.newId();
  return {
    token: {
      id,
      digest: issued.digest,
      expiresAt: new Date(now.getTime() + emailChangeLifetimeMilliseconds),
    },
    job: (purpose: 'email_change' | 'email_change_notice', accountId: string) =>
      ({
        version: 1,
        accountId,
        authenticationTokenId: id,
        purpose,
        encryptedLinkSecret: encrypted.encryptedLinkSecret,
        encryptionKeyId: encrypted.encryptionKeyId,
      }) satisfies AuthenticationEmailJob,
  };
};

export const requestEmailChange = async (
  command: { email: string },
  principal: AuthenticatedPrincipal,
  dependencies: EmailChangeDependencies,
): Promise<{ status: 'verification_required'; email: string }> => {
  const now = dependencies.now();
  const newEmail = command.email.trim().toLowerCase();
  const link = issueLink(dependencies, now);
  const outcome = await dependencies.gateway.request({
    accountId: principal.accountId,
    newEmail,
    now,
    token: link.token,
    linkJob: link.job('email_change', principal.accountId),
    noticeJob: link.job('email_change_notice', principal.accountId),
  });
  if (outcome === 'unchanged') throw new EmailChangeError('email_unchanged');
  if (outcome === 'not_active') {
    throw new EmailChangeError('account_not_active');
  }
  return { status: 'verification_required', email: newEmail };
};

export const resendEmailChange = async (
  principal: AuthenticatedPrincipal,
  dependencies: EmailChangeDependencies,
): Promise<{ status: 'verification_required' }> => {
  const now = dependencies.now();
  const link = issueLink(dependencies, now);
  const outcome = await dependencies.gateway.resend({
    accountId: principal.accountId,
    now,
    token: link.token,
    linkJob: link.job('email_change', principal.accountId),
  });
  if (outcome === 'none') {
    throw new EmailChangeError('email_change_not_pending');
  }
  // Sent or suppressed answer alike (ADR-0029 neutral resends).
  return { status: 'verification_required' };
};

export const cancelEmailChange = async (
  principal: AuthenticatedPrincipal,
  dependencies: EmailChangeDependencies,
): Promise<void> => {
  await dependencies.gateway.cancel({
    accountId: principal.accountId,
    now: dependencies.now(),
  });
};

export const readPendingEmailChange = async (
  principal: AuthenticatedPrincipal,
  dependencies: EmailChangeDependencies,
): Promise<{ pending: PendingEmailChange | null }> => ({
  pending: await dependencies.gateway.readPending({
    accountId: principal.accountId,
    now: dependencies.now(),
  }),
});

export const completeEmailChange = async (
  command: { token: string },
  dependencies: EmailChangeDependencies,
): Promise<{ status: EmailChangeCompletionStatus }> => ({
  status: await dependencies.gateway.complete({
    tokenDigest: dependencies.tokens.digest(command.token),
    now: dependencies.now(),
  }),
});
