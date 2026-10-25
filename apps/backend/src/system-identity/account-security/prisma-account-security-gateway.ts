import { revokeAuthenticationSessions } from '../authentication/revoke-authentication-sessions';
import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '../../generated/prisma/client';
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
} from '../../generated/prisma/enums';
import { scheduleAuthenticationEmail } from '../../jobs/authentication-email/schedule-authentication-email';
import {
  AuthenticationLinkStateChangedError,
  type AuthenticationLinkGateway,
} from './authentication-links';
import type { PasswordChangeGateway } from './change-password';
import type { PasswordRecoveryGateway } from './password-recovery';
import { opensAdminWebSessions } from '../authentication/staff-role';
import {
  cancelPendingEmailChange,
  canIssueRecoveryEmail,
  dayMilliseconds,
  findToken,
  isCurrentToken,
  isRemovedInvitation,
} from './account-security-token-state';

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
      const account = await transaction.account.findFirst({
        where: { email: input.email, deletedAt: null },
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

    if (isCurrentToken(token, input.inspectedAt, purpose)) {
      return { purpose, state: 'current' };
    }

    return {
      purpose,
      state:
        purpose === 'activation' &&
        isRemovedInvitation(token.account, input.inspectedAt)
          ? 'removed'
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
      await revokeAuthenticationSessions(
        transaction,
        {
          accountId: input.accountId,
          id: { not: input.authenticationSessionId },
        },
        {
          revokedAt: input.changedAt,
          reason: AuthenticationSessionRevocationReason.PASSWORD_CHANGED,
        },
      );
      await cancelPendingEmailChange(
        transaction,
        input.accountId,
        input.changedAt,
      );
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

    return link.state === 'current' ? 'current' : 'expired';
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
      await revokeAuthenticationSessions(
        transaction,
        { accountId: token.accountId },
        {
          revokedAt: input.completedAt,
          reason: AuthenticationSessionRevocationReason.PASSWORD_RECOVERED,
        },
      );
      await cancelPendingEmailChange(
        transaction,
        token.accountId,
        input.completedAt,
      );
      const staffMember =
        token.account.staffMemberId === null
          ? null
          : await transaction.staffMember.findUnique({
              where: { id: token.account.staffMemberId },
              select: { role: true },
            });
      const sessionOpened =
        input.sessionEligibility === 'any' ||
        opensAdminWebSessions(staffMember?.role);

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
