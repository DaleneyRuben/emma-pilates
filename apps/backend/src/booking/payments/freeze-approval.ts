import { randomUUID } from 'node:crypto';
import type { Prisma } from '../../generated/prisma/client';
import {
  AuditActorKind,
  AuditOutcome,
  BookingCancellationCause,
  BookingState,
  FreezeState,
  StaffRole,
  WaitlistClosureReason,
} from '../../generated/prisma/client';
import { boliviaDate } from '../../time/bolivia-time';
import { restoreBookedClass } from '../commands/restore-class';
import { decideFreezeRequest } from './freeze';
import { loadQueuedRenewalStart } from './freeze-window';
import { PaymentRuleError } from './payment-errors';

type Transaction = Prisma.TransactionClient;

const day = 24 * 60 * 60 * 1_000;

// A Session occupies the Bolivia civil date of its start. Comparing against
// UTC midnight would cancel the previous evening's class in La Paz.
const sessionInside = (startsOn: Date, endsOn: Date) => ({
  startsAt: {
    gte: new Date(boliviaDate(startsOn).getTime() - day),
    lt: new Date(endsOn.getTime() + 2 * day),
  },
});

const onFreezeDate = (
  startsAt: Date,
  startsOn: Date,
  endsOn: Date,
): boolean => {
  const civil = boliviaDate(startsAt).getTime();
  return civil >= startsOn.getTime() && civil <= endsOn.getTime();
};

export const cancelBookingsInsideFreeze = async (
  transaction: Transaction,
  input: {
    subscriptionId: string;
    clientId: string;
    startsOn: Date;
    endsOn: Date;
    decidedAt: Date;
    decidedByAccountId: string;
  },
): Promise<number> => {
  const bookings = await transaction.booking.findMany({
    where: {
      subscriptionId: input.subscriptionId,
      clientId: input.clientId,
      state: BookingState.BOOKED,
      session: sessionInside(input.startsOn, input.endsOn),
    },
    select: { id: true, session: { select: { startsAt: true } } },
  });
  const inside = bookings.filter(
    (booking) =>
      onFreezeDate(booking.session.startsAt, input.startsOn, input.endsOn) &&
      booking.session.startsAt.getTime() > input.decidedAt.getTime(),
  );
  if (inside.length === 0) return 0;
  const cancelled = await transaction.booking.updateMany({
    where: {
      id: { in: inside.map((booking) => booking.id) },
      state: BookingState.BOOKED,
    },
    data: {
      state: BookingState.CANCELLED,
      cancelledAt: input.decidedAt,
      cancelledByAccountId: input.decidedByAccountId,
      cancellationCause: BookingCancellationCause.CLIENT_REQUEST,
    },
  });
  for (const booking of inside) {
    await restoreBookedClass(transaction, {
      bookingId: booking.id,
      subscriptionId: input.subscriptionId,
      clientId: input.clientId,
      now: input.decidedAt,
    });
  }
  return cancelled.count;
};

// Closing is the same end state a cancelled Session uses. A Freeze is not a
// new waitlist reason, and a removed row would block nothing the queue needs.
export const closeWaitlistInsideFreeze = async (
  transaction: Transaction,
  input: {
    clientId: string;
    startsOn: Date;
    endsOn: Date;
    decidedAt: Date;
  },
): Promise<number> => {
  const entries = await transaction.waitlistEntry.findMany({
    where: {
      clientId: input.clientId,
      closedAt: null,
      session: sessionInside(input.startsOn, input.endsOn),
    },
    select: { id: true, session: { select: { startsAt: true } } },
  });
  const inside = entries.filter((entry) =>
    onFreezeDate(entry.session.startsAt, input.startsOn, input.endsOn),
  );
  if (inside.length === 0) return 0;
  const closed = await transaction.waitlistEntry.updateMany({
    where: { id: { in: inside.map((entry) => entry.id) }, closedAt: null },
    data: {
      closedAt: input.decidedAt,
      closureReason: WaitlistClosureReason.SESSION_CANCELLED,
    },
  });
  return closed.count;
};

const writeAudit = (
  transaction: Transaction,
  input: {
    actionCode: 'freeze.approved' | 'freeze.refused';
    freezeId: string;
    actorAccountId: string;
    occurredAt: Date;
    metadata: Prisma.InputJsonObject;
  },
) => {
  const id = randomUUID();
  return transaction.auditRecord
    .create({
      data: {
        id,
        actionCode: input.actionCode,
        outcome: AuditOutcome.SUCCEEDED,
        actorKind: AuditActorKind.ACCOUNT,
        actorAccountId: input.actorAccountId,
        actorRole: StaffRole.ADMINISTRATOR,
        targetType: 'freeze',
        targetId: input.freezeId,
        correlationId: input.freezeId,
        occurredAt: input.occurredAt,
        metadata: input.metadata,
      },
    })
    .then(() => id);
};

// The row moves from REQUESTED only here, and only when the count is one.
// A second approval finds nothing to update, so it cannot extend again.
export const approveFreeze = async (
  transaction: Transaction,
  input: {
    freezeId: string;
    decidedByAccountId: string;
    decidedAt: Date;
  },
): Promise<void> => {
  const row = await transaction.freeze.findUniqueOrThrow({
    where: { id: input.freezeId },
    select: {
      subscriptionId: true,
      clientId: true,
      startsOn: true,
      endsOn: true,
      subscription: {
        select: { startsOn: true, endsOn: true, durationDaysSnapshot: true },
      },
    },
  });
  const renewalStartsOn = await loadQueuedRenewalStart(transaction, {
    clientId: row.clientId,
    after: row.subscription.endsOn,
  });
  const decision = decideFreezeRequest({
    subscriptionId: row.subscriptionId,
    clientId: row.clientId,
    durationDays: row.subscription.durationDaysSnapshot,
    endsOn: row.subscription.endsOn,
    today: input.decidedAt,
    startsOn: row.startsOn,
    endsOnRequest: row.endsOn,
    existingRequest: null,
    subscriptionStartsOn: row.subscription.startsOn,
    renewalStartsOn,
  });
  if (!decision.allowed) {
    throw new PaymentRuleError(
      decision.code,
      'Este plan no se puede congelar.',
    );
  }
  const cancelledBookings = await cancelBookingsInsideFreeze(transaction, {
    subscriptionId: row.subscriptionId,
    clientId: row.clientId,
    startsOn: row.startsOn,
    endsOn: row.endsOn,
    decidedAt: input.decidedAt,
    decidedByAccountId: input.decidedByAccountId,
  });
  const closedWaitlistEntries = await closeWaitlistInsideFreeze(transaction, {
    clientId: row.clientId,
    startsOn: row.startsOn,
    endsOn: row.endsOn,
    decidedAt: input.decidedAt,
  });
  const auditRecordId = await writeAudit(transaction, {
    actionCode: 'freeze.approved',
    freezeId: input.freezeId,
    actorAccountId: input.decidedByAccountId,
    occurredAt: input.decidedAt,
    metadata: {
      subscriptionId: row.subscriptionId,
      frozenDays: decision.frozenDays,
      cancelledBookings,
      closedWaitlistEntries,
    },
  });
  const claimed = await transaction.freeze.updateMany({
    where: { id: input.freezeId, state: FreezeState.REQUESTED },
    data: {
      state: FreezeState.APPROVED,
      decidedByAccountId: input.decidedByAccountId,
      decidedAt: input.decidedAt,
      auditRecordId,
    },
  });
  if (claimed.count !== 1) {
    throw new PaymentRuleError(
      'freeze_already_decided',
      'Este congelamiento ya fue decidido.',
    );
  }
  const extended = await transaction.subscription.updateMany({
    where: { id: row.subscriptionId, endsOn: row.subscription.endsOn },
    data: { endsOn: decision.extendedEndsOn },
  });
  if (extended.count !== 1) {
    throw new PaymentRuleError(
      'freeze_already_decided',
      'Este congelamiento ya fue decidido.',
    );
  }
};

export const refuseFreeze = async (
  transaction: Transaction,
  input: {
    freezeId: string;
    decidedByAccountId: string;
    decidedAt: Date;
  },
): Promise<void> => {
  const row = await transaction.freeze.findUniqueOrThrow({
    where: { id: input.freezeId },
    select: { subscriptionId: true },
  });
  const auditRecordId = await writeAudit(transaction, {
    actionCode: 'freeze.refused',
    freezeId: input.freezeId,
    actorAccountId: input.decidedByAccountId,
    occurredAt: input.decidedAt,
    metadata: { subscriptionId: row.subscriptionId },
  });
  const claimed = await transaction.freeze.updateMany({
    where: { id: input.freezeId, state: FreezeState.REQUESTED },
    data: {
      state: FreezeState.REFUSED,
      decidedByAccountId: input.decidedByAccountId,
      decidedAt: input.decidedAt,
      auditRecordId,
    },
  });
  if (claimed.count !== 1) {
    throw new PaymentRuleError(
      'freeze_already_decided',
      'Este congelamiento ya fue decidido.',
    );
  }
};
