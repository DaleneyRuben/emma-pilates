import { AuditActorKind, AuditOutcome } from '../../generated/prisma/enums';
import type { PrismaClient } from '../../generated/prisma/client';
import type { ExpiredPendingAccountCleanup } from './cleanup-expired-pending-accounts';
import { removePendingAccount } from './remove-pending-account';

// The cleanup sweep behind PrismaClientRegistrationUnitOfWork.cleanup.
export const cleanupExpiredPendingAccounts = (
  prisma: PrismaClient,
  request: ExpiredPendingAccountCleanup,
): Promise<number> =>
  prisma.$transaction(async (transaction) => {
    // An invited Client who already holds a Subscription, Payment, or
    // Booking stays pending until activated; only untouched Accounts expire.
    const expiredAccounts = await transaction.account.findMany({
      where: {
        pendingExpiresAt: { lte: request.now },
        deletedAt: null,
        emailVerifiedAt: null,
        activatedAt: null,
        OR: [
          { clientId: null },
          {
            client: {
              subscriptions: { none: {} },
              payments: { none: {} },
              bookings: { none: {} },
            },
          },
        ],
      },
      select: { id: true, clientId: true, staffMemberId: true },
    });

    await Promise.all(
      expiredAccounts.map(async (account) => {
        const domainIdentity = account.clientId === null ? 'staff' : 'client';

        await removePendingAccount(transaction, {
          accountId: account.id,
          clientId: account.clientId,
          staffMemberId: account.staffMemberId,
          now: request.now,
        });

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
