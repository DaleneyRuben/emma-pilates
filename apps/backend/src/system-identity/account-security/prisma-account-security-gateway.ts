import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import {
  AuditActorKind,
  AuditOutcome,
  AuthenticationSessionRevocationReason,
  AuthenticationSessionSurface,
  AuthenticationTokenPurpose,
} from '../../generated/prisma/enums';
import type { AuthenticationLinkGateway } from './authentication-links';
import type { PasswordChangeGateway } from './change-password';
import type { PasswordRecoveryGateway } from './password-recovery';

export class AuthenticationLinkStateChangedError extends Error {}

export class PrismaAccountSecurityGateway
  implements
    AuthenticationLinkGateway,
    PasswordChangeGateway,
    Pick<PasswordRecoveryGateway, 'inspectRecoveryLink' | 'completeRecovery'>
{
  constructor(private readonly prisma: PrismaClient) {}

  async inspectLink(
    input: Parameters<AuthenticationLinkGateway['inspectLink']>[0],
  ): ReturnType<AuthenticationLinkGateway['inspectLink']> {
    const token = await this.prisma.authenticationToken.findUnique({
      where: { tokenDigest: toPrismaBytes(input.tokenDigest) },
      include: { account: true },
    });

    if (
      token === null ||
      (token.purpose !== AuthenticationTokenPurpose.ACTIVATION &&
        token.purpose !== AuthenticationTokenPurpose.PASSWORD_RECOVERY)
    ) {
      return null;
    }

    const purpose =
      token.purpose === AuthenticationTokenPurpose.ACTIVATION
        ? 'activation'
        : 'password_recovery';

    return {
      purpose,
      state: isCurrentToken(token, input.inspectedAt, purpose)
        ? 'current'
        : 'expired',
    };
  }

  activateAccount(
    input: Parameters<AuthenticationLinkGateway['activateAccount']>[0],
  ): Promise<void> {
    return this.prisma.$transaction(async (transaction) => {
      const token = await findToken(transaction, input.tokenDigest);

      if (
        token === null ||
        token.purpose !== AuthenticationTokenPurpose.ACTIVATION ||
        !isCurrentToken(token, input.completedAt, 'activation')
      ) {
        throw new AuthenticationLinkStateChangedError();
      }

      await transaction.authenticationToken.update({
        where: { id: token.id },
        data: { usedAt: input.completedAt },
      });
      await transaction.authenticationToken.updateMany({
        where: {
          accountId: token.accountId,
          id: { not: token.id },
          usedAt: null,
          invalidatedAt: null,
        },
        data: { invalidatedAt: input.completedAt },
      });
      await transaction.account.update({
        where: { id: token.accountId },
        data: {
          passwordHash: input.passwordHash,
          passwordChangedAt: input.completedAt,
          emailVerifiedAt: input.completedAt,
          activatedAt: input.completedAt,
          pendingExpiresAt: null,
        },
      });
    });
  }

  findPasswordHash(accountId: string): Promise<string | null> {
    return this.prisma.account
      .findUnique({ where: { id: accountId }, select: { passwordHash: true } })
      .then((account) => account?.passwordHash ?? null);
  }

  completePasswordChange(
    input: Parameters<PasswordChangeGateway['completePasswordChange']>[0],
  ): Promise<void> {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.account.update({
        where: { id: input.accountId },
        data: {
          passwordHash: input.passwordHash,
          passwordChangedAt: input.changedAt,
        },
      });
      await transaction.authenticationSession.updateMany({
        where: {
          accountId: input.accountId,
          id: { not: input.authenticationSessionId },
          revokedAt: null,
        },
        data: {
          revokedAt: input.changedAt,
          revocationReason:
            AuthenticationSessionRevocationReason.PASSWORD_CHANGED,
        },
      });
      await transaction.auditRecord.create({
        data: {
          id: input.auditRecordId,
          actionCode: 'account.password_changed',
          outcome: AuditOutcome.SUCCEEDED,
          actorKind: AuditActorKind.ACCOUNT,
          actorAccountId: input.accountId,
          targetType: 'account',
          targetId: input.accountId,
          correlationId: input.auditRecordId,
          occurredAt: input.changedAt,
        },
      });
    });
  }

  async inspectRecoveryLink(
    input: Parameters<PasswordRecoveryGateway['inspectRecoveryLink']>[0],
  ): ReturnType<PasswordRecoveryGateway['inspectRecoveryLink']> {
    const link = await this.inspectLink(input);

    if (link === null || link.purpose !== 'password_recovery') {
      return 'invalid';
    }

    return link.state;
  }

  completeRecovery(
    input: Parameters<PasswordRecoveryGateway['completeRecovery']>[0],
  ): Promise<void> {
    return this.prisma.$transaction(async (transaction) => {
      const token = await findToken(transaction, input.tokenDigest);

      if (
        token === null ||
        token.purpose !== AuthenticationTokenPurpose.PASSWORD_RECOVERY ||
        !isCurrentToken(token, input.completedAt, 'password_recovery')
      ) {
        throw new AuthenticationLinkStateChangedError();
      }

      await transaction.authenticationToken.update({
        where: { id: token.id },
        data: { usedAt: input.completedAt },
      });
      await transaction.account.update({
        where: { id: token.accountId },
        data: {
          passwordHash: input.passwordHash,
          passwordChangedAt: input.completedAt,
        },
      });
      await transaction.authenticationSession.updateMany({
        where: { accountId: token.accountId, revokedAt: null },
        data: {
          revokedAt: input.completedAt,
          revocationReason:
            AuthenticationSessionRevocationReason.PASSWORD_RECOVERED,
        },
      });
      await transaction.authenticationSession.create({
        data: {
          ...input.authenticationSession,
          accountId: token.accountId,
          surface: AuthenticationSessionSurface.MOBILE,
          credentialDigest: toPrismaBytes(
            input.authenticationSession.credentialDigest,
          ),
        },
      });
      await transaction.auditRecord.create({
        data: {
          id: input.auditRecordId,
          actionCode: 'account.password_recovered',
          outcome: AuditOutcome.SUCCEEDED,
          actorKind: AuditActorKind.SYSTEM,
          targetType: 'account',
          targetId: token.accountId,
          correlationId: input.auditRecordId,
          metadata: { initiatedBy: 'password_recovery_link' },
          occurredAt: input.completedAt,
        },
      });
    });
  }
}

type StoredToken = NonNullable<Awaited<ReturnType<typeof findToken>>>;

const isCurrentToken = (
  token: StoredToken,
  now: Date,
  purpose: 'activation' | 'password_recovery',
): boolean =>
  token.usedAt === null &&
  token.invalidatedAt === null &&
  token.expiresAt > now &&
  token.account.disabledAt === null &&
  (purpose === 'password_recovery'
    ? token.account.activatedAt !== null &&
      token.account.emailVerifiedAt !== null &&
      token.account.passwordHash !== null
    : token.account.activatedAt === null &&
      token.account.emailVerifiedAt === null &&
      token.account.passwordHash === null &&
      token.account.pendingExpiresAt !== null &&
      token.account.pendingExpiresAt > now);

const findToken = (transaction: Prisma.TransactionClient, digest: Uint8Array) =>
  transaction.authenticationToken.findUnique({
    where: { tokenDigest: toPrismaBytes(digest) },
    include: { account: true },
  });

const toPrismaBytes = (value: Uint8Array): Uint8Array<ArrayBuffer> => {
  const bytes = new Uint8Array(value.byteLength);
  bytes.set(value);

  return bytes;
};
