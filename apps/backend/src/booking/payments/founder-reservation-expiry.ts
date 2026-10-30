import type { PrismaClient } from '../../generated/prisma/client';
import {
  AuditActorKind,
  AuditOutcome,
  FounderMembershipStatus,
  PaymentState,
} from '../../generated/prisma/client';
import { lockFounderPlaces } from './prisma-founder-membership';

const unreviewedHoldMilliseconds = 3 * 24 * 60 * 60 * 1_000;

// FIX-013 (owner 2026-10-30): a transfer nobody reviews holds its founder
// place for 3 days, then the place is free for the next buyer. Nothing the
// Client or the desk sees changes: a later confirmation still honours the
// founder price it charged, over the 40-place cap if none is left.
export const releaseUnreviewedFounderReservations = async (
  prisma: PrismaClient,
  now: Date,
): Promise<number> => {
  const cutoff = new Date(now.getTime() - unreviewedHoldMilliseconds);
  const stale = await prisma.founderMembership.findMany({
    where: {
      status: FounderMembershipStatus.RESERVED,
      deletedAt: null,
      payment: {
        is: { state: PaymentState.PENDING, submittedAt: { lte: cutoff } },
      },
    },
    select: { id: true, clientId: true, number: true, paymentId: true },
  });
  let released = 0;
  for (const place of stale) {
    const freed = await prisma.$transaction(async (transaction) => {
      // The same lock a confirmation takes, so it never flips a freed place.
      await lockFounderPlaces(transaction);
      const changed = await transaction.founderMembership.updateMany({
        where: {
          id: place.id,
          status: FounderMembershipStatus.RESERVED,
          deletedAt: null,
        },
        data: { deletedAt: now },
      });
      if (changed.count === 0) return false;
      await transaction.auditRecord.create({
        data: {
          actionCode: 'founder_membership.released',
          outcome: AuditOutcome.SUCCEEDED,
          actorKind: AuditActorKind.SYSTEM,
          targetType: 'founder_membership',
          targetId: place.id,
          correlationId: place.paymentId ?? place.id,
          occurredAt: now,
          metadata: {
            clientId: place.clientId,
            number: place.number,
            reason: 'payment_unreviewed',
          },
        },
      });
      return true;
    });
    if (freed) released += 1;
  }
  return released;
};
