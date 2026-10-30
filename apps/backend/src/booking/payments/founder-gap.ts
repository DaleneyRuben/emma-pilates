import type { Prisma } from '../../generated/prisma/client';
import {
  AuditActorKind,
  AuditOutcome,
  FounderMembershipStatus,
  PaymentMethod,
} from '../../generated/prisma/client';
import {
  recordNotification as defaultNotificationRecorder,
  type NotificationRecorder,
} from '../../notifications/prisma-notification-store';
import { decideFounderGap, type FounderRules } from './founder-membership';
import { priceFounderSale } from './prisma-founder-membership';

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

// A future start that opens more than the allowed gap loses the membership.
// Pricing asks first, so an abandoned transfer pays list without losing the
// place. The loss is written when the sale is confirmed. Voided and courtesy
// Subscriptions are not a real end.
export const founderGapWouldLose = async (
  transaction: Transaction,
  input: { clientId: string; nextStart: Date; today: Date },
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
  return decision.lose;
};

// A gapped transfer pays list and leaves the membership untouched. The loss
// is written later, when that sale is confirmed.
export const priceTransferForGap = async (
  transaction: Transaction,
  input: {
    clientId: string;
    nextStart: Date;
    today: Date;
    classAllowance: number;
    priceCentavos: number;
    now: Date;
    hidden: boolean;
  },
) =>
  priceFounderSale(transaction, {
    clientId: input.clientId,
    skipClaim: await founderGapWouldLose(transaction, input),
    classAllowance: input.classAllowance,
    priceCentavos: input.priceCentavos,
    creditAppliedCentavos: 0,
    now: input.now,
    courtesy: false,
    hidden: input.hidden,
    activate: false,
  });

export const loseFounderForGap = async (
  transaction: Transaction,
  input: {
    clientId: string;
    nextStart: Date;
    today: Date;
    now: Date;
    recordNotification?: NotificationRecorder;
  },
): Promise<boolean> => {
  const recordNotification =
    input.recordNotification ?? defaultNotificationRecorder;
  if (!(await founderGapWouldLose(transaction, input))) return false;
  const held = await transaction.founderMembership.findFirstOrThrow({
    where: {
      clientId: input.clientId,
      deletedAt: null,
      status: FounderMembershipStatus.ACTIVE,
    },
    select: { id: true },
  });
  await transaction.founderMembership.update({
    where: { id: held.id },
    data: {
      status: FounderMembershipStatus.LOST,
      reason: 'gap',
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
      metadata: { reason: 'gap' },
    },
  });
  const account = await transaction.account.findFirst({
    where: { clientId: input.clientId, deletedAt: null },
    select: { id: true },
  });
  const rules = await readRules(transaction);
  if (account !== null) {
    await recordNotification(transaction, {
      accountId: account.id,
      category: 'reminder',
      type: 'founder_membership_lost',
      businessEventKey: `founder-membership-lost:${held.id}`,
      title: 'Membresía fundadora',
      message: `Pasaron más de ${rules.founderGapDays} días sin plan, así que tu membresía fundadora se perdió.`,
      destination: { type: 'subscription', id: null },
      occurredAt: input.now,
    });
  }
  return true;
};
