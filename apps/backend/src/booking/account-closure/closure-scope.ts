import type { Prisma } from '../../generated/prisma/client';
import {
  BookingState,
  EvaluationState,
  PaymentState,
  SessionState,
} from '../../generated/prisma/client';

// What Account closure acts on (BE-007 G3–G4), shared by the closure
// transaction and AW22's preview so the two always count the same rows.
export const closureScope = {
  futureBookings: (clientId: string, now: Date) =>
    ({
      clientId,
      state: BookingState.BOOKED,
      session: { state: SessionState.SCHEDULED, startsAt: { gt: now } },
    }) satisfies Prisma.BookingWhereInput,
  activeWaitlistEntries: (clientId: string) =>
    ({ clientId, closedAt: null }) satisfies Prisma.WaitlistEntryWhereInput,
  upcomingEvaluations: (clientId: string, now: Date) =>
    ({
      clientId,
      state: EvaluationState.BOOKED,
      slot: { startsAt: { gt: now } },
    }) satisfies Prisma.EvaluationWhereInput,
  pendingPayments: (clientId: string) =>
    ({
      clientId,
      state: PaymentState.PENDING,
    }) satisfies Prisma.PaymentWhereInput,
};
