import type { Prisma } from '../../generated/prisma/client';
import {
  AuditActorKind,
  AuditOutcome,
  FounderMembershipStatus,
} from '../../generated/prisma/client';

type Transaction = Prisma.TransactionClient;

// A cash sale activates the place before the Payment exists, so the grant
// audit is written here, once the Payment has an id.
export const auditCashFounderGrant = async (
  transaction: Transaction,
  input: { clientId: string; paymentId: string; now: Date },
): Promise<void> => {
  const held = await transaction.founderMembership.findFirst({
    where: {
      clientId: input.clientId,
      status: FounderMembershipStatus.ACTIVE,
      paymentId: null,
      deletedAt: null,
    },
    select: { id: true, number: true },
  });
  if (held === null) return;
  await transaction.founderMembership.update({
    where: { id: held.id },
    data: { paymentId: input.paymentId },
  });
  await transaction.auditRecord.create({
    data: {
      actionCode: 'founder_membership.granted',
      outcome: AuditOutcome.SUCCEEDED,
      actorKind: AuditActorKind.SYSTEM,
      targetType: 'founder_membership',
      targetId: held.id,
      correlationId: input.paymentId,
      occurredAt: input.now,
      metadata: {
        clientId: input.clientId,
        number: held.number,
        paymentId: input.paymentId,
      },
    },
  });
};
