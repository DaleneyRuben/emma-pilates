import type { PgBoss } from 'pg-boss';
import { toPrismaBytes } from '../../database/prisma-bytes';
import {
  AuditActorKind,
  AuditOutcome,
  AuthenticationTokenPurpose,
} from '../../generated/prisma/enums';
import type { PrismaClient } from '../../generated/prisma/client';
import type {
  ClientRegistrationTransaction,
  ClientRegistrationUnitOfWork,
} from './register-client';
import type {
  PendingClientRegistrationCancellation,
  PendingClientRegistrationCancellationStatus,
} from './cancel-pending-client-registration';
import type { ExpiredPendingAccountCleanup } from './cleanup-expired-pending-accounts';
import type {
  PendingEmailCorrection,
  PendingEmailCorrectionStatus,
} from './correct-pending-client-email';
import type {
  PendingVerificationResend,
  PendingVerificationResendStatus,
} from './resend-pending-client-verification';
import type {
  ClientEmailVerification,
  ClientEmailVerificationStatus,
} from './verify-client-email';
import { cleanupExpiredPendingAccounts } from './prisma-expired-pending-account-cleanup';
import { removePendingAccount } from './remove-pending-account';

import { openGuestPassForVerifiedClient } from '../../booking/payments/open-verified-guest-pass';
import { PrismaClientRegistrationTransaction } from './prisma-client-registration-transaction';

export { PrismaClientRegistrationTransaction } from './prisma-client-registration-transaction';

type UnitOfWorkDependencies = {
  prisma: PrismaClient;
  boss: Pick<PgBoss, 'send'>;
  digestEmail(email: string): Uint8Array;
  now?: () => Date;
};

export class PrismaClientRegistrationUnitOfWork implements ClientRegistrationUnitOfWork {
  constructor(private readonly dependencies: UnitOfWorkDependencies) {}

  execute(
    work: (transaction: ClientRegistrationTransaction) => Promise<boolean>,
  ): Promise<boolean> {
    return this.dependencies.prisma.$transaction(async (transaction) =>
      work(
        new PrismaClientRegistrationTransaction(
          transaction,
          this.dependencies.boss,
          (email) => this.dependencies.digestEmail(email),
          this.dependencies.now ?? (() => new Date()),
        ),
      ),
    );
  }

  correctEmail(
    correction: PendingEmailCorrection,
  ): Promise<PendingEmailCorrectionStatus> {
    return this.dependencies.prisma.$transaction(async (transaction) => {
      const continuation = await transaction.authenticationToken.findUnique({
        where: {
          tokenDigest: toPrismaBytes(correction.continuationDigest),
        },
        include: {
          account: {
            select: {
              id: true,
              email: true,
              clientId: true,
              staffMemberId: true,
              emailVerifiedAt: true,
              activatedAt: true,
              pendingExpiresAt: true,
            },
          },
        },
      });

      if (
        continuation === null ||
        continuation.purpose !==
          AuthenticationTokenPurpose.REGISTRATION_CONTINUATION ||
        continuation.usedAt !== null ||
        continuation.invalidatedAt !== null ||
        continuation.expiresAt <= correction.now ||
        continuation.account.clientId === null ||
        continuation.account.staffMemberId !== null ||
        continuation.account.emailVerifiedAt !== null ||
        continuation.account.activatedAt !== null ||
        continuation.account.pendingExpiresAt === null ||
        continuation.account.pendingExpiresAt <= correction.now
      ) {
        return 'expired';
      }

      const conflictingAccount = await transaction.account.findFirst({
        where: { email: correction.email, deletedAt: null },
        select: { id: true },
      });

      if (
        conflictingAccount !== null &&
        conflictingAccount.id !== continuation.account.id
      ) {
        return 'email_unavailable';
      }

      const activeTransaction = new PrismaClientRegistrationTransaction(
        transaction,
        this.dependencies.boss,
        (email) => this.dependencies.digestEmail(email),
        this.dependencies.now ?? (() => new Date()),
      );
      const canIssueEmail = await activeTransaction.canIssueAuthenticationEmail(
        {
          email: correction.email,
          purpose: 'verification',
          now: correction.now,
        },
      );

      if (!canIssueEmail) {
        return 'suppressed';
      }

      await transaction.account.update({
        where: { id: continuation.account.id },
        data: { email: correction.email },
      });
      await activeTransaction.replaceSelfRegistrationVerification({
        accountId: continuation.account.id,
        pendingExpiresAt: correction.pendingExpiresAt,
        verificationToken: correction.verificationToken,
      });
      await activeTransaction.recordIssuedAuthenticationEmail({
        email: correction.email,
        purpose: 'verification',
        occurredAt: correction.now,
      });
      await activeTransaction.scheduleAuthenticationEmail({
        ...correction.emailJob,
        accountId: continuation.account.id,
      });

      return 'corrected';
    });
  }

  resend(
    request: PendingVerificationResend,
  ): Promise<PendingVerificationResendStatus> {
    return this.dependencies.prisma.$transaction(async (transaction) => {
      const continuation = await transaction.authenticationToken.findUnique({
        where: { tokenDigest: toPrismaBytes(request.continuationDigest) },
        include: {
          account: {
            select: {
              id: true,
              email: true,
              clientId: true,
              staffMemberId: true,
              emailVerifiedAt: true,
              activatedAt: true,
              pendingExpiresAt: true,
            },
          },
        },
      });

      if (
        continuation === null ||
        continuation.purpose !==
          AuthenticationTokenPurpose.REGISTRATION_CONTINUATION ||
        continuation.usedAt !== null ||
        continuation.invalidatedAt !== null ||
        continuation.expiresAt <= request.now ||
        continuation.account.clientId === null ||
        continuation.account.staffMemberId !== null ||
        continuation.account.emailVerifiedAt !== null ||
        continuation.account.activatedAt !== null ||
        continuation.account.pendingExpiresAt === null ||
        continuation.account.pendingExpiresAt <= request.now
      ) {
        return 'expired';
      }

      const activeTransaction = new PrismaClientRegistrationTransaction(
        transaction,
        this.dependencies.boss,
        (email) => this.dependencies.digestEmail(email),
        this.dependencies.now ?? (() => new Date()),
      );
      const canIssueEmail = await activeTransaction.canIssueAuthenticationEmail(
        {
          email: continuation.account.email,
          purpose: 'verification',
          now: request.now,
        },
      );

      if (!canIssueEmail) {
        return 'suppressed';
      }

      await activeTransaction.replaceSelfRegistrationVerification({
        accountId: continuation.account.id,
        pendingExpiresAt: request.pendingExpiresAt,
        verificationToken: request.verificationToken,
      });
      await activeTransaction.recordIssuedAuthenticationEmail({
        email: continuation.account.email,
        purpose: 'verification',
        occurredAt: request.now,
      });
      await activeTransaction.scheduleAuthenticationEmail({
        ...request.emailJob,
        accountId: continuation.account.id,
      });

      return 'sent';
    });
  }

  cancel(
    cancellation: PendingClientRegistrationCancellation,
  ): Promise<PendingClientRegistrationCancellationStatus> {
    return this.dependencies.prisma.$transaction(async (transaction) => {
      const continuation = await transaction.authenticationToken.findUnique({
        where: {
          tokenDigest: toPrismaBytes(cancellation.continuationDigest),
        },
        include: {
          account: {
            select: {
              id: true,
              clientId: true,
              staffMemberId: true,
              emailVerifiedAt: true,
              activatedAt: true,
              pendingExpiresAt: true,
            },
          },
        },
      });

      if (
        continuation === null ||
        continuation.purpose !==
          AuthenticationTokenPurpose.REGISTRATION_CONTINUATION ||
        continuation.usedAt !== null ||
        continuation.invalidatedAt !== null ||
        continuation.expiresAt <= cancellation.now ||
        continuation.account.clientId === null ||
        continuation.account.staffMemberId !== null ||
        continuation.account.emailVerifiedAt !== null ||
        continuation.account.activatedAt !== null ||
        continuation.account.pendingExpiresAt === null ||
        continuation.account.pendingExpiresAt <= cancellation.now
      ) {
        return 'expired';
      }

      const { id: accountId, clientId } = continuation.account;

      await removePendingAccount(transaction, {
        accountId,
        clientId,
        staffMemberId: null,
        now: cancellation.now,
      });
      await transaction.auditRecord.create({
        data: {
          actionCode: 'pending_client_registration.cancelled',
          outcome: AuditOutcome.SUCCEEDED,
          actorKind: AuditActorKind.SYSTEM,
          targetType: 'account',
          targetId: accountId,
          correlationId: cancellation.correlationId,
          metadata: { initiatedBy: 'registration_continuation' },
          occurredAt: cancellation.now,
        },
      });

      return 'cancelled';
    });
  }

  verify(
    verification: ClientEmailVerification,
  ): Promise<ClientEmailVerificationStatus> {
    return this.dependencies.prisma.$transaction(async (transaction) => {
      const token = await transaction.authenticationToken.findUnique({
        where: {
          tokenDigest: toPrismaBytes(verification.verificationDigest),
        },
        include: {
          account: {
            select: {
              id: true,
              clientId: true,
              staffMemberId: true,
              emailVerifiedAt: true,
              activatedAt: true,
              pendingExpiresAt: true,
            },
          },
        },
      });

      if (
        token === null ||
        token.purpose !== AuthenticationTokenPurpose.VERIFICATION
      ) {
        return 'invalid';
      }

      if (
        token.usedAt !== null ||
        token.invalidatedAt !== null ||
        token.expiresAt <= verification.now ||
        token.account.clientId === null ||
        token.account.staffMemberId !== null ||
        token.account.emailVerifiedAt !== null ||
        token.account.activatedAt !== null ||
        token.account.pendingExpiresAt === null ||
        token.account.pendingExpiresAt <= verification.now
      ) {
        return 'expired';
      }

      await transaction.authenticationToken.update({
        where: { id: token.id },
        data: { usedAt: verification.now },
      });
      await transaction.authenticationToken.updateMany({
        where: {
          accountId: token.account.id,
          id: { not: token.id },
          usedAt: null,
          invalidatedAt: null,
        },
        data: { invalidatedAt: verification.now },
      });
      await transaction.account.update({
        where: { id: token.account.id },
        data: {
          emailVerifiedAt: verification.now,
          activatedAt: verification.now,
          pendingExpiresAt: null,
        },
      });
      await openGuestPassForVerifiedClient(transaction, {
        friendClientId: token.account.clientId,
        authorAccountId: token.account.id,
        now: verification.now,
      });

      return 'verified';
    });
  }

  cleanup(request: ExpiredPendingAccountCleanup): Promise<number> {
    return cleanupExpiredPendingAccounts(this.dependencies.prisma, request);
  }
}
