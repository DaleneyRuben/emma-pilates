import type { PgBoss } from 'pg-boss';
import { recordClientAcquisition } from '../../booking/acquisition/record-client-acquisition';
import { toPrismaBytes } from '../../database/prisma-bytes';
import {
  AuditActorKind,
  AuditOutcome,
  AuthenticationTokenPurpose,
  StaffRole,
} from '../../generated/prisma/enums';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import { PrismaClientRegistrationTransaction } from '../registration/prisma-client-registration-unit-of-work';
import { removePendingAccount } from '../registration/remove-pending-account';
import type {
  ClientInvitationRecord,
  ClientInvitationTransaction,
  ClientInvitationUnitOfWork,
  ExistingAccount,
  InvitationAudit,
} from './client-invitations';

type UnitOfWorkDependencies = {
  prisma: PrismaClient;
  boss: Pick<PgBoss, 'send'>;
  digestEmail(email: string): Uint8Array;
  now?: () => Date;
};

export class PrismaClientInvitationUnitOfWork implements ClientInvitationUnitOfWork {
  constructor(private readonly dependencies: UnitOfWorkDependencies) {}

  execute<Result>(
    work: (transaction: ClientInvitationTransaction) => Promise<Result>,
  ): Promise<Result> {
    return this.dependencies.prisma.$transaction((transaction) =>
      work(
        createInvitationTransaction(
          transaction,
          new PrismaClientRegistrationTransaction(
            transaction,
            this.dependencies.boss,
            (email) => this.dependencies.digestEmail(email),
            this.dependencies.now ?? (() => new Date()),
          ),
        ),
      ),
    );
  }
}

const staffRoles: Record<InvitationAudit['actorRole'], StaffRole> = {
  assistant: StaffRole.ASSISTANT,
  administrator: StaffRole.ADMINISTRATOR,
};

// The registration transaction already owns the recipient throttle, the
// link rotation, and the queued email; invitations add the Client-facing
// lookups, the Account edits, and the audit trail.
const createInvitationTransaction = (
  transaction: Prisma.TransactionClient,
  registration: PrismaClientRegistrationTransaction,
): ClientInvitationTransaction => ({
  findAccountByEmail: async (email): Promise<ExistingAccount | null> => {
    const [existing, account] = await Promise.all([
      registration.findAccountByEmail(email),
      transaction.account.findFirst({
        where: { email, deletedAt: null },
        select: { clientId: true },
      }),
    ]);
    return existing === null
      ? null
      : { ...existing, clientId: account?.clientId ?? null };
  },
  findInvitation: async (clientId): Promise<ClientInvitationRecord | null> => {
    const client = await transaction.client.findFirst({
      where: { id: clientId, deletedAt: null },
      select: {
        id: true,
        name: true,
        phone: true,
        account: {
          select: {
            id: true,
            email: true,
            emailVerifiedAt: true,
            activatedAt: true,
            pendingExpiresAt: true,
            authenticationTokens: {
              where: {
                purpose: AuthenticationTokenPurpose.ACTIVATION,
                usedAt: null,
                invalidatedAt: null,
              },
              orderBy: { expiresAt: 'desc' },
              take: 1,
              select: { expiresAt: true },
            },
            // Only a self-registration holds a continuation token, the
            // rule registration's findAccountByEmail applies too.
            _count: {
              select: {
                authenticationTokens: {
                  where: {
                    purpose:
                      AuthenticationTokenPurpose.REGISTRATION_CONTINUATION,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: { subscriptions: true, payments: true, bookings: true },
        },
      },
    });
    const account = client?.account ?? null;

    if (
      client === null ||
      account === null ||
      account.emailVerifiedAt !== null ||
      account.activatedAt !== null ||
      account.pendingExpiresAt === null
    ) {
      return null;
    }

    return {
      accountId: account.id,
      clientId: client.id,
      name: client.name,
      email: account.email,
      phone: client.phone,
      pendingExpiresAt: account.pendingExpiresAt,
      activationExpiresAt: account.authenticationTokens[0]?.expiresAt ?? null,
      hasActivity:
        client._count.subscriptions +
          client._count.payments +
          client._count.bookings >
        0,
      pendingFlow:
        account._count.authenticationTokens > 0
          ? 'self_registration'
          : 'staff_invitation',
    };
  },
  authenticationEmailWaitSeconds: (input) =>
    registration.authenticationEmailWaitSeconds(input),
  recordIssuedAuthenticationEmail: (input) =>
    registration.recordIssuedAuthenticationEmail(input),
  createInvitation: async (invitation) => {
    await transaction.client.create({
      data: {
        id: invitation.clientId,
        name: invitation.name,
        phone: invitation.phone,
        referralCode: invitation.referralCode,
        account: {
          create: {
            id: invitation.accountId,
            email: invitation.email,
            pendingExpiresAt: invitation.pendingExpiresAt,
            authenticationTokens: {
              create: {
                id: invitation.activationToken.id,
                purpose: AuthenticationTokenPurpose.ACTIVATION,
                tokenDigest: toPrismaBytes(invitation.activationToken.digest),
                expiresAt: invitation.activationToken.expiresAt,
              },
            },
          },
        },
      },
    });
    // BKM-011: no Referral here; the Guest Pass flow (BKM-014) adds its own.
    await recordClientAcquisition(transaction, {
      clientId: invitation.clientId,
      declaredChannel: invitation.acquisitionChannel,
      referralCode: invitation.referredByCode,
    });
  },
  replaceStaffInvitationActivation: (input) =>
    registration.replaceStaffInvitationActivation(input),
  replaceSelfRegistrationVerification: (input) =>
    registration.replaceSelfRegistrationVerification(input),
  changeInvitationEmail: async (input) => {
    await transaction.account.update({
      where: { id: input.accountId },
      data: { email: input.email },
    });
  },
  removeInvitation: (input) =>
    removePendingAccount(transaction, { ...input, staffMemberId: null }),
  scheduleAuthenticationEmail: (job) =>
    registration.scheduleAuthenticationEmail(job),
  recordAudit: async (audit) => {
    await transaction.auditRecord.create({
      data: {
        actionCode: audit.actionCode,
        outcome: AuditOutcome.SUCCEEDED,
        actorKind: AuditActorKind.ACCOUNT,
        actorAccountId: audit.actorAccountId,
        actorRole: staffRoles[audit.actorRole],
        impersonationId: audit.impersonationId,
        targetType: 'account',
        targetId: audit.targetAccountId,
        correlationId: audit.correlationId,
        metadata: audit.metadata ?? undefined,
        occurredAt: audit.occurredAt,
      },
    });
  },
});
