import type { Prisma } from '../../generated/prisma/client';
import {
  PaymentMethod,
  PaymentState,
  SubscriptionState,
} from '../../generated/prisma/client';
import {
  addCivilDays,
  boliviaDate,
  boliviaMonth,
} from '../../time/bolivia-time';
import { recordAllowanceAdjustment } from './allowance-adjustments';
import { decideInvitation } from './guest-pass';

type Transaction = Prisma.TransactionClient;

const details = {
  guest_pass_monthly_limit: 'A host invites one friend a month',
  guest_pass_already_used: 'A Guest Pass is once in a lifetime',
} as const;

export type GuestPassCode = keyof typeof details;

export class GuestPassError extends Error {
  readonly status = 409;

  constructor(readonly code: GuestPassCode) {
    super(details[code]);
    this.name = 'GuestPassError';
  }
}

export const guestPassProblem = (
  error: unknown,
): { code: GuestPassCode; detail: string; status: number } | null =>
  error instanceof GuestPassError
    ? { code: error.code, detail: error.message, status: error.status }
    : null;

const passPlan = {
  name: 'Pase de invitada',
  classAllowance: 1,
  durationDays: 30,
  priceCentavos: 0,
} as const;

// The hidden one-class Plan a Guest Pass spends. Like Courtesy Access it is
// created on first use, so it survives the production reset without a seed.
const findOrCreatePassPlan = async (transaction: Transaction, now: Date) => {
  const select = {
    id: true,
    name: true,
    durationDays: true,
    classAllowance: true,
  } as const;
  const existing = await transaction.plan.findFirst({
    where: { name: passPlan.name, priceCentavos: 0, hiddenAt: { not: null } },
    select,
  });
  if (existing !== null) return existing;
  return transaction.plan.create({
    data: { ...passPlan, displayOrder: 0, hiddenAt: now },
    select,
  });
};

// BKM-014: registering with a Client's code opens one Guest Pass. A second
// invitation by the same host in the same La Paz month is refused, and so is
// a second pass for the same friend. The class is a courtesy adjustment on a
// hidden Subscription, so it is never a first Plan.
export const openGuestPass = async (
  transaction: Transaction,
  input: {
    hostClientId: string;
    friendClientId: string;
    authorAccountId: string;
    now: Date;
  },
): Promise<{ id: string }> => {
  const earlier = await transaction.guestPass.findMany({
    where: { hostClientId: input.hostClientId, deletedAt: null },
    select: { createdAt: true },
  });
  const settings = await transaction.studioSettingsVersion.findFirstOrThrow({
    orderBy: { version: 'desc' },
    select: { invitesPerHostPerMonth: true },
  });
  const month = boliviaMonth(input.now);
  const decision = decideInvitation({
    now: input.now,
    earlierInvitations: earlier
      .map((pass) => pass.createdAt)
      .filter(
        (createdAt) =>
          boliviaMonth(createdAt).toISOString() === month.toISOString(),
      ),
    invitesPerMonth: settings.invitesPerHostPerMonth,
  });
  if (decision !== null) throw new GuestPassError(decision.code);

  const plan = await findOrCreatePassPlan(transaction, input.now);
  const today = boliviaDate(input.now);
  const payment = await transaction.payment.create({
    data: {
      clientId: input.friendClientId,
      planId: plan.id,
      planNameSnapshot: plan.name,
      durationDaysSnapshot: plan.durationDays,
      classAllowanceSnapshot: plan.classAllowance,
      planPriceCentavos: 0,
      creditAppliedCentavos: 0,
      amountDueCentavos: 0,
      method: PaymentMethod.COURTESY,
      state: PaymentState.CONFIRMED,
      submittedByAccountId: input.authorAccountId,
      submittedAt: input.now,
      decidedByAccountId: input.authorAccountId,
      decidedAt: input.now,
      createdAt: input.now,
    },
    select: { id: true },
  });
  const subscription = await transaction.subscription.create({
    data: {
      clientId: input.friendClientId,
      planId: plan.id,
      paymentId: payment.id,
      planNameSnapshot: plan.name,
      durationDaysSnapshot: plan.durationDays,
      originalClassAllowance: plan.classAllowance,
      remainingClassAllowance: 0,
      startsOn: today,
      endsOn: addCivilDays(today, plan.durationDays - 1),
      state: SubscriptionState.ACTIVE,
      activatedAt: input.now,
    },
    select: { id: true },
  });
  await recordAllowanceAdjustment(transaction, {
    subscriptionId: subscription.id,
    clientId: input.friendClientId,
    classes: 1,
    reason: 'courtesy',
    author: { accountId: input.authorAccountId, role: null },
    now: input.now,
    correlationId: payment.id,
  });
  return transaction.guestPass.create({
    data: {
      hostClientId: input.hostClientId,
      friendClientId: input.friendClientId,
      courtesySubscriptionId: subscription.id,
      createdAt: input.now,
    },
    select: { id: true },
  });
};
