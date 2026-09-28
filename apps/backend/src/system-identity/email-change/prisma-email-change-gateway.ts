import { randomUUID } from 'node:crypto';
import type { PgBoss } from 'pg-boss';
import { toPrismaBytes } from '../../database/prisma-bytes';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import {
  AuditActorKind,
  AuditOutcome,
  AuthenticationTokenPurpose,
} from '../../generated/prisma/enums';
import { PrismaClientRegistrationTransaction } from '../registration/prisma-client-registration-unit-of-work';
import type { EmailChangeGateway } from './email-change';

type Transaction = Prisma.TransactionClient;

type Dependencies = {
  boss: Pick<PgBoss, 'send'>;
  digestEmail: (email: string) => Uint8Array;
};

// IDN-008 over the registration transaction's throttle and queue helpers: the
// pending change lives with its email_change token; the link goes to the new
// address and the notice to the current one only when the address is free
// and the recipient lane has room (proposal E7, E8).
export const createPrismaEmailChangeGateway = (
  prisma: PrismaClient,
  dependencies: Dependencies,
): EmailChangeGateway => {
  const registration = (transaction: Transaction, now: Date) =>
    new PrismaClientRegistrationTransaction(
      transaction,
      dependencies.boss,
      dependencies.digestEmail,
      () => now,
    );

  const recordAudit = (
    transaction: Transaction,
    input: {
      actionCode:
        | 'account.email_change_requested'
        | 'account.email_change_cancelled'
        | 'account.email_changed';
      accountId: string;
      metadata?: Prisma.InputJsonObject;
      now: Date;
    },
  ) =>
    transaction.auditRecord.create({
      data: {
        actionCode: input.actionCode,
        outcome: AuditOutcome.SUCCEEDED,
        actorKind: AuditActorKind.ACCOUNT,
        actorAccountId: input.accountId,
        targetType: 'account',
        targetId: input.accountId,
        correlationId: randomUUID(),
        metadata: input.metadata,
        occurredAt: input.now,
      },
    });

  // The pending change with its token, or null when the token is no longer
  // current (used, invalidated, expired) or nothing was requested.
  const livePending = async (
    transaction: Pick<PrismaClient, 'accountEmailChange'>,
    accountId: string,
    now: Date,
  ) => {
    const change = await transaction.accountEmailChange.findFirst({
      where: { accountId, deletedAt: null },
      include: { authenticationToken: true },
    });
    if (
      change === null ||
      change.authenticationToken.usedAt !== null ||
      change.authenticationToken.invalidatedAt !== null ||
      change.authenticationToken.expiresAt <= now
    ) {
      return null;
    }
    return change;
  };

  const invalidateCurrentLink = (
    transaction: Transaction,
    accountId: string,
    now: Date,
  ) =>
    transaction.authenticationToken.updateMany({
      where: {
        accountId,
        purpose: AuthenticationTokenPurpose.EMAIL_CHANGE,
        usedAt: null,
        invalidatedAt: null,
      },
      data: { invalidatedAt: now },
    });

  const createLink = (
    transaction: Transaction,
    accountId: string,
    token: { id: string; digest: Uint8Array; expiresAt: Date },
    now: Date,
  ) =>
    transaction.authenticationToken.create({
      data: {
        id: token.id,
        accountId,
        purpose: AuthenticationTokenPurpose.EMAIL_CHANGE,
        tokenDigest: toPrismaBytes(token.digest),
        issuedAt: now,
        expiresAt: token.expiresAt,
      },
    });

  // Queues the link (and the notice) only when the new address is free and
  // the recipient lane has room; the answer never says which (E7, E8).
  const sendIfAllowed = async (
    transaction: Transaction,
    input: {
      newEmail: string;
      now: Date;
      jobs: Parameters<
        PrismaClientRegistrationTransaction['scheduleAuthenticationEmail']
      >[0][];
    },
  ): Promise<boolean> => {
    const inUse = await transaction.account.findFirst({
      where: { email: input.newEmail, deletedAt: null },
      select: { id: true },
    });
    if (inUse !== null) return false;
    const helpers = registration(transaction, input.now);
    const allowed = await helpers.canIssueAuthenticationEmail({
      email: input.newEmail,
      purpose: 'verification',
      now: input.now,
    });
    if (!allowed) return false;
    await helpers.recordIssuedAuthenticationEmail({
      email: input.newEmail,
      purpose: 'verification',
      occurredAt: input.now,
    });
    for (const job of input.jobs) {
      await helpers.scheduleAuthenticationEmail(job);
    }
    return true;
  };

  return {
    request: (input) =>
      prisma.$transaction(async (transaction) => {
        const account = await transaction.account.findUnique({
          where: { id: input.accountId },
          select: {
            email: true,
            activatedAt: true,
            emailVerifiedAt: true,
            disabledAt: true,
          },
        });
        if (
          account === null ||
          account.activatedAt === null ||
          account.emailVerifiedAt === null ||
          account.disabledAt !== null
        ) {
          return 'not_active';
        }
        if (account.email === input.newEmail) return 'unchanged';

        await invalidateCurrentLink(transaction, input.accountId, input.now);
        await createLink(transaction, input.accountId, input.token, input.now);
        const replaced = await transaction.accountEmailChange.updateMany({
          where: { accountId: input.accountId, deletedAt: null },
          data: {
            newEmail: input.newEmail,
            authenticationTokenId: input.token.id,
            requestedAt: input.now,
            expiresAt: input.token.expiresAt,
          },
        });
        if (replaced.count === 0) {
          await transaction.accountEmailChange.create({
            data: {
              accountId: input.accountId,
              newEmail: input.newEmail,
              authenticationTokenId: input.token.id,
              requestedAt: input.now,
              expiresAt: input.token.expiresAt,
            },
          });
        }
        await sendIfAllowed(transaction, {
          newEmail: input.newEmail,
          now: input.now,
          jobs: [input.linkJob, input.noticeJob],
        });
        await recordAudit(transaction, {
          actionCode: 'account.email_change_requested',
          accountId: input.accountId,
          now: input.now,
        });
        return 'requested';
      }),

    resend: (input) =>
      prisma.$transaction(async (transaction) => {
        const pending = await livePending(
          transaction,
          input.accountId,
          input.now,
        );
        if (pending === null) return 'none';
        const inUse = await transaction.account.findFirst({
          where: { email: pending.newEmail, deletedAt: null },
          select: { id: true },
        });
        const allowed =
          inUse === null &&
          (await registration(
            transaction,
            input.now,
          ).canIssueAuthenticationEmail({
            email: pending.newEmail,
            purpose: 'verification',
            now: input.now,
          }));
        // A suppressed resend keeps the current link (ADR-0029).
        if (!allowed) return 'suppressed';
        await invalidateCurrentLink(transaction, input.accountId, input.now);
        await createLink(transaction, input.accountId, input.token, input.now);
        await transaction.accountEmailChange.updateMany({
          where: { accountId: input.accountId, deletedAt: null },
          data: {
            authenticationTokenId: input.token.id,
            expiresAt: input.token.expiresAt,
          },
        });
        await sendIfAllowed(transaction, {
          newEmail: pending.newEmail,
          now: input.now,
          jobs: [input.linkJob],
        });
        return 'sent';
      }),

    cancel: (input) =>
      prisma.$transaction(async (transaction) => {
        const pending = await livePending(
          transaction,
          input.accountId,
          input.now,
        );
        if (pending === null) return 'none';
        await invalidateCurrentLink(transaction, input.accountId, input.now);
        await transaction.accountEmailChange.updateMany({
          where: { accountId: input.accountId, deletedAt: null },
          data: { deletedAt: input.now },
        });
        await recordAudit(transaction, {
          actionCode: 'account.email_change_cancelled',
          accountId: input.accountId,
          now: input.now,
        });
        return 'cancelled';
      }),

    readPending: async (input) => {
      const pending = await livePending(prisma, input.accountId, input.now);
      return pending === null
        ? null
        : {
            email: pending.newEmail,
            requestedAt: pending.requestedAt,
            expiresAt: pending.expiresAt,
          };
    },

    complete: (input) =>
      prisma.$transaction(async (transaction) => {
        const token = await transaction.authenticationToken.findUnique({
          where: { tokenDigest: toPrismaBytes(input.tokenDigest) },
          include: { account: true, emailChange: true },
        });
        if (
          token === null ||
          token.purpose !== AuthenticationTokenPurpose.EMAIL_CHANGE
        ) {
          return 'invalid';
        }
        if (
          token.usedAt !== null ||
          token.invalidatedAt !== null ||
          token.expiresAt <= input.now ||
          token.emailChange === null ||
          token.account.disabledAt !== null ||
          token.account.activatedAt === null
        ) {
          return 'expired';
        }
        const taken = await transaction.account.findFirst({
          where: { email: token.emailChange.newEmail, deletedAt: null },
          select: { id: true },
        });
        if (taken !== null) return 'email_unavailable';

        const previousEmail = token.account.email;
        await transaction.authenticationToken.update({
          where: { id: token.id },
          data: { usedAt: input.now },
        });
        await transaction.accountEmailChange.updateMany({
          where: { accountId: token.accountId, deletedAt: null },
          data: { deletedAt: input.now },
        });
        await transaction.account.update({
          where: { id: token.accountId },
          data: {
            email: token.emailChange.newEmail,
            emailVerifiedAt: input.now,
          },
        });
        await recordAudit(transaction, {
          actionCode: 'account.email_changed',
          accountId: token.accountId,
          metadata: { previousEmail },
          now: input.now,
        });
        return 'changed';
      }),
  };
};
