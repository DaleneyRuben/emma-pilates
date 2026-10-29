import type { Prisma } from '../../generated/prisma/client';
import {
  AuditActorKind,
  AuditOutcome,
  FounderMembershipStatus,
  PaymentMethod,
} from '../../generated/prisma/client';
import { decideFounderGap, type FounderRules } from './founder-membership';

type Transaction = Prisma.TransactionClient;

const civil = (date: Date): Date =>
  new Date(`${date.toISOString().slice(0, 10)}T00:00:00.000Z`);

const readRules = async (transaction: Transaction): Promise<FounderRules> => {
  const version = await transaction.studioSettingsVersion.findFirst({
    orderBy: { version: 'desc' },
    select: {
      founderPlaces: true,
      founderDiscountPercent: true,
      founderGapDays: true,
    },
  });
  if (version === null) throw new Error('Studio Settings have no version');
  return version;
};

// A future start that opens more than the allowed gap loses the membership
// before the sale is priced, so that sale is not a founder sale. Voided and
// courtesy Subscriptions are not a real end.
export const loseFounderForGap = async (
  transaction: Transaction,
  input: { clientId: string; nextStart: Date; today: Date; now: Date },
): Promise<boolean> => {
  const held = await transaction.founderMembership.findFirst({
    where: {
      clientId: input.clientId,
      deletedAt: null,
      status: FounderMembershipStatus.ACTIVE,
    },
    select: { id: true },
  });
  if (held === null) return false;
  const subscriptions = await transaction.subscription.findMany({
    where: {
      clientId: input.clientId,
      payment: {
        state: { not: 'VOIDED' },
        method: { not: PaymentMethod.COURTESY },
      },
    },
    select: { endsOn: true },
  });
  const latestRealEnd = subscriptions.reduce<Date | null>(
    (latest, subscription) =>
      latest === null || subscription.endsOn.getTime() > latest.getTime()
        ? subscription.endsOn
        : latest,
    null,
  );
  const rules = await readRules(transaction);
  const decision = decideFounderGap({
    today: civil(input.today),
    rules,
    membership: { status: 'active', lostAt: null },
    latestRealEnd: latestRealEnd === null ? null : civil(latestRealEnd),
    nextStart: civil(input.nextStart),
  });
  if (!decision.lose) return false;
  await transaction.founderMembership.update({
    where: { id: held.id },
    data: {
      status: FounderMembershipStatus.LOST,
      reason: decision.reason,
      lostAt: input.now,
    },
  });
  await transaction.auditRecord.create({
    data: {
      actionCode: 'founder_membership.lost',
      outcome: AuditOutcome.SUCCEEDED,
      actorKind: AuditActorKind.SYSTEM,
      targetType: 'founder_membership',
      targetId: held.id,
      correlationId: held.id,
      occurredAt: input.now,
      metadata: { reason: decision.reason },
    },
  });
  return true;
};
