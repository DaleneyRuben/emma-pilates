import type { PgBoss } from 'pg-boss';
import { toPrismaBytes } from '../../database/prisma-bytes';
import {
  AuditActorKind,
  AuditOutcome,
  AuthenticationThrottleEventKind,
  AuthenticationThrottlePurpose,
  AuthenticationTokenPurpose,
} from '../../generated/prisma/enums';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import { scheduleAuthenticationEmail } from '../../jobs/authentication-email/schedule-authentication-email';
import type { AuthenticationEmailJob } from '../../jobs/authentication-email/authentication-email-job';
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

const hourMilliseconds = 60 * 60 * 1_000;
const dayMilliseconds = 24 * hourMilliseconds;

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

      const conflictingAccount = await transaction.account.findUnique({
        where: { email: correction.email },
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

      await transaction.account.delete({ where: { id: accountId } });
      await transaction.client.delete({ where: { id: clientId } });
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

      return 'verified';
    });
  }

  cleanup(request: ExpiredPendingAccountCleanup): Promise<number> {
    return this.dependencies.prisma.$transaction(async (transaction) => {
      const expiredAccounts = await transaction.account.findMany({
        where: {
          pendingExpiresAt: { lte: request.now },
          emailVerifiedAt: null,
          activatedAt: null,
        },
        select: { id: true, clientId: true, staffMemberId: true },
      });

      await Promise.all(
        expiredAccounts.map(async (account) => {
          const domainIdentity = account.clientId === null ? 'staff' : 'client';

          await transaction.account.delete({ where: { id: account.id } });

          if (account.clientId !== null) {
            await transaction.client.delete({
              where: { id: account.clientId },
            });
          } else if (account.staffMemberId !== null) {
            await transaction.staffMember.delete({
              where: { id: account.staffMemberId },
            });
          }

          await transaction.auditRecord.create({
            data: {
              actionCode: 'pending_account.expired',
              outcome: AuditOutcome.SUCCEEDED,
              actorKind: AuditActorKind.SYSTEM,
              targetType: 'account',
              targetId: account.id,
              correlationId: request.correlationId,
              metadata: { domainIdentity },
              occurredAt: request.now,
            },
          });
        }),
      );

      return expiredAccounts.length;
    });
  }
}

class PrismaClientRegistrationTransaction implements ClientRegistrationTransaction {
  constructor(
    private readonly transaction: Prisma.TransactionClient,
    private readonly boss: Pick<PgBoss, 'send'>,
    private readonly digestEmail: (email: string) => Uint8Array,
    private readonly now: () => Date,
  ) {}

  async findAccountByEmail(email: string): Promise<{
    id: string;
    domainIdentity: 'client' | 'staff';
    pendingFlow: 'self_registration' | 'staff_invitation' | 'none';
  } | null> {
    const account = await this.transaction.account.findUnique({
      where: { email },
      select: {
        id: true,
        clientId: true,
        staffMemberId: true,
        emailVerifiedAt: true,
        activatedAt: true,
      },
    });

    if (account === null) {
      return null;
    }

    const domainIdentity = account.clientId === null ? 'staff' : 'client';

    if (
      domainIdentity === 'staff' ||
      account.emailVerifiedAt !== null ||
      account.activatedAt !== null
    ) {
      return { id: account.id, domainIdentity, pendingFlow: 'none' };
    }

    const continuation = await this.transaction.authenticationToken.findFirst({
      where: {
        accountId: account.id,
        purpose: AuthenticationTokenPurpose.REGISTRATION_CONTINUATION,
      },
      select: { id: true },
    });

    return {
      id: account.id,
      domainIdentity,
      pendingFlow:
        continuation === null ? 'staff_invitation' : 'self_registration',
    };
  }

  async canIssueAuthenticationEmail(input: {
    email: string;
    purpose: 'verification' | 'activation';
    now: Date;
  }): Promise<boolean> {
    const events = await this.transaction.authenticationThrottleEvent.findMany({
      where: {
        purpose: mapThrottlePurpose(input.purpose),
        eventKind: AuthenticationThrottleEventKind.MESSAGE_ISSUED,
        recipientDigest: toPrismaBytes(this.digestEmail(input.email)),
        occurredAt: { gte: new Date(input.now.getTime() - dayMilliseconds) },
      },
      select: { occurredAt: true },
    });
    const inLastMinute = events.some(
      ({ occurredAt }) =>
        occurredAt >= new Date(input.now.getTime() - 60 * 1_000),
    );
    const inLastHour = events.filter(
      ({ occurredAt }) =>
        occurredAt >= new Date(input.now.getTime() - hourMilliseconds),
    ).length;

    return !inLastMinute && inLastHour < 5 && events.length < 10;
  }

  async recordIssuedAuthenticationEmail(input: {
    email: string;
    purpose: 'verification' | 'activation';
    occurredAt: Date;
  }): Promise<void> {
    await this.transaction.authenticationThrottleEvent.create({
      data: {
        purpose: mapThrottlePurpose(input.purpose),
        eventKind: AuthenticationThrottleEventKind.MESSAGE_ISSUED,
        recipientDigest: toPrismaBytes(this.digestEmail(input.email)),
        occurredAt: input.occurredAt,
        expiresAt: new Date(input.occurredAt.getTime() + dayMilliseconds),
      },
    });
  }

  async createSelfRegistration(
    registration: Parameters<
      ClientRegistrationTransaction['createSelfRegistration']
    >[0],
  ): Promise<void> {
    await this.transaction.client.create({
      data: {
        id: registration.clientId,
        name: registration.name,
        referralCode: registration.referralCode,
        account: {
          create: {
            id: registration.accountId,
            email: registration.email,
            passwordHash: registration.passwordHash,
            pendingExpiresAt: registration.pendingExpiresAt,
            authenticationTokens: {
              create: [
                {
                  id: registration.verificationToken.id,
                  purpose: AuthenticationTokenPurpose.VERIFICATION,
                  tokenDigest: toPrismaBytes(
                    registration.verificationToken.digest,
                  ),
                  expiresAt: registration.verificationToken.expiresAt,
                },
                {
                  id: registration.continuationToken.id,
                  purpose: AuthenticationTokenPurpose.REGISTRATION_CONTINUATION,
                  tokenDigest: toPrismaBytes(
                    registration.continuationToken.digest,
                  ),
                  expiresAt: registration.continuationToken.expiresAt,
                },
              ],
            },
          },
        },
      },
    });
  }

  async replaceSelfRegistrationVerification(
    input: Parameters<
      ClientRegistrationTransaction['replaceSelfRegistrationVerification']
    >[0],
  ): Promise<void> {
    const replacedAt = this.now();

    await this.invalidateCurrentToken(
      input.accountId,
      AuthenticationTokenPurpose.VERIFICATION,
      replacedAt,
    );
    await this.transaction.account.update({
      where: { id: input.accountId },
      data: { pendingExpiresAt: input.pendingExpiresAt },
    });
    await this.transaction.authenticationToken.updateMany({
      where: {
        accountId: input.accountId,
        purpose: AuthenticationTokenPurpose.REGISTRATION_CONTINUATION,
        usedAt: null,
        invalidatedAt: null,
      },
      data: { expiresAt: input.pendingExpiresAt },
    });
    await this.createToken(
      input.accountId,
      AuthenticationTokenPurpose.VERIFICATION,
      input.verificationToken,
    );
  }

  async replaceStaffInvitationActivation(
    input: Parameters<
      ClientRegistrationTransaction['replaceStaffInvitationActivation']
    >[0],
  ): Promise<void> {
    await this.invalidateCurrentToken(
      input.accountId,
      AuthenticationTokenPurpose.ACTIVATION,
      this.now(),
    );
    await this.transaction.account.update({
      where: { id: input.accountId },
      data: { pendingExpiresAt: input.pendingExpiresAt },
    });
    await this.createToken(
      input.accountId,
      AuthenticationTokenPurpose.ACTIVATION,
      input.activationToken,
    );
  }

  async scheduleAuthenticationEmail(
    job: AuthenticationEmailJob,
  ): Promise<void> {
    await scheduleAuthenticationEmail(this.boss, this.transaction, job);
  }

  private async invalidateCurrentToken(
    accountId: string,
    purpose: AuthenticationTokenPurpose,
    invalidatedAt: Date,
  ): Promise<void> {
    await this.transaction.authenticationToken.updateMany({
      where: { accountId, purpose, usedAt: null, invalidatedAt: null },
      data: { invalidatedAt },
    });
  }

  private async createToken(
    accountId: string,
    purpose: AuthenticationTokenPurpose,
    token: { id: string; digest: Uint8Array; expiresAt: Date },
  ): Promise<void> {
    await this.transaction.authenticationToken.create({
      data: {
        id: token.id,
        accountId,
        purpose,
        tokenDigest: toPrismaBytes(token.digest),
        expiresAt: token.expiresAt,
      },
    });
  }
}

const mapThrottlePurpose = (
  purpose: 'verification' | 'activation',
): AuthenticationThrottlePurpose =>
  purpose === 'verification'
    ? AuthenticationThrottlePurpose.VERIFICATION
    : AuthenticationThrottlePurpose.ACTIVATION;
