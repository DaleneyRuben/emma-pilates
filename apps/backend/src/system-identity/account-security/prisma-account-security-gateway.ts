import { randomUUID } from 'node:crypto';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import { toPrismaBytes } from '../../database/prisma-bytes';
import type { PgBoss } from 'pg-boss';
import {
  AuditActorKind,
  AuditOutcome,
  AuthenticationSessionRevocationReason,
  AuthenticationSessionSurface,
  AuthenticationThrottleEventKind,
  AuthenticationThrottlePurpose,
  AuthenticationTokenPurpose,
  StaffRole,
} from '../../generated/prisma/enums';
import { scheduleAuthenticationEmail } from '../../jobs/authentication-email/schedule-authentication-email';
import type { AuthenticationLinkGateway } from './authentication-links';
import type { PasswordChangeGateway } from './change-password';
import type { PasswordRecoveryGateway } from './password-recovery';

export class AuthenticationLinkStateChangedError extends Error {}

export class PrismaAccountSecurityGateway
  implements
    AuthenticationLinkGateway,
    PasswordChangeGateway,
    PasswordRecoveryGateway
{
  constructor(
    private readonly prisma: PrismaClient,
    private readonly recoveryDependencies?: {
      boss: Pick<PgBoss, 'send'>;
      digestEmail(email: string): Uint8Array;
    },
  ) {}

  requestRecovery(
    input: Parameters<PasswordRecoveryGateway['requestRecovery']>[0],
  ): ReturnType<PasswordRecoveryGateway['requestRecovery']> {
    if (this.recoveryDependencies === undefined) {
      throw new Error('Password recovery email dependencies are required');
    }

    return this.prisma.$transaction(async (transaction) => {
      const account = await transaction.account.findUnique({
        where: { email: input.email },
        select: {
          id: true,
          passwordHash: true,
          emailVerifiedAt: true,
          activatedAt: true,
          disabledAt: true,
        },
      });

      if (
        account === null ||
        account.passwordHash === null ||
        account.emailVerifiedAt === null ||
        account.activatedAt === null ||
        account.disabledAt !== null
      ) {
        return 'unknown';
      }

      const recipientDigest = toPrismaBytes(
        this.recoveryDependencies!.digestEmail(input.email),
      );
      const events = await transaction.authenticationThrottleEvent.findMany({
        where: {
          purpose: AuthenticationThrottlePurpose.PASSWORD_RECOVERY,
          eventKind: AuthenticationThrottleEventKind.MESSAGE_ISSUED,
          recipientDigest,
          occurredAt: {
            gte: new Date(input.requestedAt.getTime() - dayMilliseconds),
          },
        },
        select: { occurredAt: true },
      });

      if (!canIssueRecoveryEmail(events, input.requestedAt)) {
        return 'suppressed';
      }

      await transaction.authenticationToken.updateMany({
        where: {
          accountId: account.id,
          purpose: AuthenticationTokenPurpose.PASSWORD_RECOVERY,
          usedAt: null,
          invalidatedAt: null,
        },
        data: { invalidatedAt: input.requestedAt },
      });
      await transaction.authenticationToken.create({
        data: {
          id: input.token.id,
          accountId: account.id,
          purpose: AuthenticationTokenPurpose.PASSWORD_RECOVERY,
          tokenDigest: toPrismaBytes(input.token.digest),
          issuedAt: input.requestedAt,
          expiresAt: input.token.expiresAt,
        },
      });
      await transaction.authenticationThrottleEvent.create({
        data: {
          purpose: AuthenticationThrottlePurpose.PASSWORD_RECOVERY,
          eventKind: AuthenticationThrottleEventKind.MESSAGE_ISSUED,
          recipientDigest,
          occurredAt: input.requestedAt,
          expiresAt: new Date(input.requestedAt.getTime() + dayMilliseconds),
        },
      });
      await scheduleAuthenticationEmail(
        this.recoveryDependencies!.boss,
        transaction,
        {
          version: 1,
          accountId: account.id,
          ...input.emailJob,
        },
      );

      return 'issued';
    });
  }

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
      const account = await transaction.account.update({
        where: { id: token.accountId },
        data: {
          passwordHash: input.passwordHash,
          passwordChangedAt: input.completedAt,
          emailVerifiedAt: input.completedAt,
          activatedAt: input.completedAt,
          pendingExpiresAt: null,
        },
        select: { clientId: true },
      });
      const auditRecordId = randomUUID();
      await transaction.auditRecord.create({
        data: {
          id: auditRecordId,
          actionCode: 'account.activated',
          outcome: AuditOutcome.SUCCEEDED,
          actorKind: AuditActorKind.ACCOUNT,
          actorAccountId: token.accountId,
          targetType: 'account',
          targetId: token.accountId,
          correlationId: auditRecordId,
          metadata: {
            domainIdentity: account.clientId === null ? 'staff' : 'client',
          },
          occurredAt: input.completedAt,
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
  ): ReturnType<PasswordRecoveryGateway['completeRecovery']> {
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
      const staffMember =
        token.account.staffMemberId === null
          ? null
          : await transaction.staffMember.findUnique({
              where: { id: token.account.staffMemberId },
              select: { role: true },
            });
      const sessionOpened =
        input.sessionEligibility === 'any' ||
        staffMember?.role === StaffRole.ADMINISTRATOR;

      if (sessionOpened) {
        await transaction.authenticationSession.create({
          data: {
            ...input.authenticationSession,
            accountId: token.accountId,
            surface:
              input.authenticationSession.surface === 'admin_web'
                ? AuthenticationSessionSurface.ADMIN_WEB
                : AuthenticationSessionSurface.MOBILE,
            credentialDigest: toPrismaBytes(
              input.authenticationSession.credentialDigest,
            ),
          },
        });
      }
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

      return { sessionOpened };
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

const minuteMilliseconds = 60 * 1_000;
const hourMilliseconds = 60 * minuteMilliseconds;
const dayMilliseconds = 24 * hourMilliseconds;

const canIssueRecoveryEmail = (
  events: { occurredAt: Date }[],
  now: Date,
): boolean => {
  const inLastFiveMinutes = events.some(
    ({ occurredAt }) =>
      occurredAt >= new Date(now.getTime() - 5 * minuteMilliseconds),
  );
  const inLastHour = events.filter(
    ({ occurredAt }) =>
      occurredAt >= new Date(now.getTime() - hourMilliseconds),
  ).length;

  return !inLastFiveMinutes && inLastHour < 3 && events.length < 5;
};
