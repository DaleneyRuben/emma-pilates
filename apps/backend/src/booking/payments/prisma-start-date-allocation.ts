import type { Prisma } from '../../generated/prisma/client';
import { SubscriptionState } from '../../generated/prisma/client';
import { AuditActorKind, AuditOutcome } from '../../generated/prisma/client';
import { auditActorOf } from '../../system-identity/authentication/audit-actor';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { boliviaDate } from '../../time/bolivia-time';
import { decideRenewal } from './early-renewal';
import { PaymentRuleError } from './payment-errors';
import type { ActiveSubscriptionFacts } from './purchase-eligibility';
import { resolveStartDate } from './start-date';
import { loadActiveSubscription } from './subscription-allocation';
import { computeSubscriptionTerm } from './subscription-term';

type Transaction = Prisma.TransactionClient;

const civil = (date: Date): string => date.toISOString().slice(0, 10);

export type StartDateRules = {
  startDateLimitDays: number;
  openingDate: Date | null;
};

export const readStartDateRules = async (
  transaction: Transaction,
): Promise<StartDateRules> => {
  const version = await transaction.studioSettingsVersion.findFirst({
    orderBy: { version: 'desc' },
    select: { startDateLimitDays: true, openingDate: true },
  });
  if (version === null) throw new Error('Studio Settings have no version');
  return version;
};

export const loadFutureSubscriptionId = async (
  transaction: Transaction,
  clientId: string,
  today: Date,
): Promise<string | null> => {
  const future = await transaction.subscription.findFirst({
    where: {
      clientId,
      state: SubscriptionState.ACTIVE,
      startsOn: { gt: today },
    },
    select: { id: true },
  });
  return future?.id ?? null;
};

// The Start Date the sale commits to. A renewal that still holds classes
// ignores the requested date; every other sale must sit inside the window.
export const allocateStartDate = (input: {
  today: Date;
  requested: Date | null;
  rules: StartDateRules;
  active: ActiveSubscriptionFacts | null;
  futureSubscriptionId: string | null;
}): {
  startsOn: Date;
  subscriptionIdToEndEarly: string | null;
  endsOn?: Date;
} => {
  if (input.active === null) {
    return {
      startsOn: resolveStartDate({
        today: input.today,
        requested: input.requested,
        ...input.rules,
      }).startsOn,
      subscriptionIdToEndEarly: null,
    };
  }

  const renewal = decideRenewal({
    today: input.today,
    current: input.active,
    futureSubscriptionId: input.futureSubscriptionId,
    requested: input.requested,
  });
  // A Guest Pass or Courtesy Access ends the day before the paid Plan, so a
  // class it still holds must fall before that start (FIX-019, owner
  // 2026-10-30): the class keeps its pass instead of hanging on an ended one.
  const lastBookedOn = input.active.lastBookedOn ?? null;
  if (
    input.active.courtesy &&
    lastBookedOn !== null &&
    renewal.startsOn.getTime() <= lastBookedOn.getTime()
  ) {
    throw rule(
      'start_date_before_booked_class',
      'The Plan must start after the class the current pass holds',
    );
  }
  if (renewal.chosen) {
    resolveStartDate({
      today: input.today,
      requested: renewal.startsOn,
      ...input.rules,
    });
  }
  return renewal;
};

const rule = (code: PaymentRuleError['code'], message: string) =>
  new PaymentRuleError(code, message);

// Ends the current Subscription the day before the renewal's Start Date, in
// the same transaction, and audits who shortened it and why. A renewal that
// starts the day the current one started leaves no day to keep: it expires
// instead, since an end before the start is only a void's (ADR-0012).
export const endSubscriptionEarly = async (
  transaction: Transaction,
  input: {
    subscriptionId: string;
    endsOn: Date;
    startsOn: Date;
    principal: AuthenticatedPrincipal;
    now: Date;
    paymentId: string;
  },
): Promise<void> => {
  const current = await transaction.subscription.findUniqueOrThrow({
    where: { id: input.subscriptionId },
    select: { startsOn: true, endsOn: true, clientId: true },
  });
  const expired = input.endsOn.getTime() < current.startsOn.getTime();
  // A Plan that already ended before the renewal's eve keeps its end.
  if (!expired && input.endsOn.getTime() >= current.endsOn.getTime()) return;
  if (expired) {
    await transaction.subscription.update({
      where: { id: input.subscriptionId },
      data: { state: SubscriptionState.EXPIRED, expiredAt: input.now },
    });
  } else {
    await transaction.subscription.update({
      where: { id: input.subscriptionId },
      data: { endsOn: input.endsOn },
    });
  }
  const actor = auditActorOf(input.principal);
  await transaction.auditRecord.create({
    data: {
      actionCode: 'subscription.ended_early',
      outcome: AuditOutcome.SUCCEEDED,
      actorKind: AuditActorKind.ACCOUNT,
      actorAccountId: actor.accountId,
      actorRole: actor.role,
      impersonationId: actor.impersonationId,
      targetType: 'subscription',
      targetId: input.subscriptionId,
      correlationId: input.paymentId,
      occurredAt: input.now,
      metadata: {
        clientId: current.clientId,
        previousEndsOn: civil(current.endsOn),
        endsOn: civil(expired ? current.endsOn : input.endsOn),
        expired,
        renewalStartsOn: civil(input.startsOn),
        paymentId: input.paymentId,
      },
    },
  });
};

// H6: a transfer reviewed after its Start Date has passed starts the day it
// is confirmed. The Payment keeps the date it was sold with (its commercial
// fields are immutable); the Subscription and this audit record carry the
// move.
export const startsOnAtConfirmation = (
  soldStartsOn: Date,
  today: Date,
): Date => (soldStartsOn.getTime() < today.getTime() ? today : soldStartsOn);

export const recordStartDateMoved = (
  transaction: Transaction,
  input: {
    paymentId: string;
    clientId: string;
    soldStartsOn: Date;
    startsOn: Date;
    principal: AuthenticatedPrincipal;
    now: Date;
  },
) => {
  const actor = auditActorOf(input.principal);
  return transaction.auditRecord.create({
    data: {
      actionCode: 'payment.start_date_moved',
      outcome: AuditOutcome.SUCCEEDED,
      actorKind: AuditActorKind.ACCOUNT,
      actorAccountId: actor.accountId,
      actorRole: actor.role,
      impersonationId: actor.impersonationId,
      targetType: 'payment',
      targetId: input.paymentId,
      correlationId: input.paymentId,
      occurredAt: input.now,
      metadata: {
        clientId: input.clientId,
        soldStartsOn: civil(input.soldStartsOn),
        startsOn: civil(input.startsOn),
      },
    },
  });
};

export const subscriptionTermFor = (
  startsOn: Date,
  durationDays: number,
): { startsOn: Date; endsOn: Date } =>
  computeSubscriptionTerm(startsOn, durationDays);

export const parseRequestedStartDate = (
  value: string | undefined,
): Date | null => {
  if (value === undefined) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || civil(parsed) !== value) {
    throw rule('start_date_out_of_window', 'Start Date is not a civil date');
  }
  return parsed;
};

export const todayOf = (now: Date): Date => boliviaDate(now);

// What the Client app shows instead of the Start Date chips: a Plan bought now
// starts the day after the current one ends while it still holds classes
// (booking ADR-0005). Null when she would choose the date, or cannot renew.
export const readRenewalStartsOn = async (
  transaction: Transaction,
  clientId: string,
  now: Date,
): Promise<string | null> => {
  const today = todayOf(now);
  const active = await loadActiveSubscription(transaction, clientId, now);
  if (active === null) return null;
  if ((await loadFutureSubscriptionId(transaction, clientId, today)) !== null) {
    return null;
  }
  const renewal = decideRenewal({
    today,
    current: active,
    futureSubscriptionId: null,
    requested: null,
  });
  return renewal.chosen ? null : civil(renewal.startsOn);
};
