import type { Prisma } from '../../generated/prisma/client';
import {
  BookingCancellationCause,
  BookingState,
  EvaluationCancellationCause,
  EvaluationState,
  WaitlistClosureReason,
} from '../../generated/prisma/client';
import { promoteWaitlistInTransaction } from '../commands/waitlist-promotion';
import { releaseSlot } from '../evaluations/evaluation-slot-release';
import type { NotificationRecorder } from '../../notifications/prisma-notification-store';
import type { ClosureTransaction } from './close-client-account';
import { closureScope } from './closure-scope';

type Steps = Pick<
  ClosureTransaction,
  | 'closeWaitlistEntries'
  | 'cancelFutureBookings'
  | 'cancelFutureEvaluations'
  | 'promoteWaitlists'
>;

// The Waitlist, Booking, and Evaluation steps of Account closure (G4): what
// is still ahead is cancelled with `account_closed`, returns no class, and
// never counts as a late cancellation.
export const createScheduleSteps = (
  transaction: Prisma.TransactionClient,
  recordNotification: NotificationRecorder,
): Steps => ({
  closeWaitlistEntries: async ({ clientId, accountId, occurredAt }) => {
    const closed = await transaction.waitlistEntry.updateMany({
      where: closureScope.activeWaitlistEntries(clientId),
      data: {
        closedAt: occurredAt,
        closureReason: WaitlistClosureReason.LEFT,
        closedByAccountId: accountId,
      },
    });
    return closed.count;
  },

  cancelFutureBookings: async ({ clientId, accountId, occurredAt }) => {
    const future = await transaction.booking.findMany({
      where: closureScope.futureBookings(clientId, occurredAt),
      select: { id: true, sessionId: true },
    });
    await transaction.booking.updateMany({
      where: { id: { in: future.map(({ id }) => id) } },
      data: {
        state: BookingState.CANCELLED,
        cancelledAt: occurredAt,
        cancelledByAccountId: accountId,
        cancellationCause: BookingCancellationCause.ACCOUNT_CLOSED,
      },
    });
    return {
      count: future.length,
      sessionIds: [...new Set(future.map(({ sessionId }) => sessionId))],
    };
  },

  cancelFutureEvaluations: async ({ clientId, accountId, occurredAt }) => {
    const future = await transaction.evaluation.findMany({
      where: closureScope.upcomingEvaluations(clientId, occurredAt),
      select: { id: true, evaluationSlotId: true },
    });
    for (const evaluation of future) {
      await transaction.evaluation.update({
        where: { id: evaluation.id },
        data: {
          state: EvaluationState.CANCELLED,
          cancelledAt: occurredAt,
          cancelledByAccountId: accountId,
          cancellationCause: EvaluationCancellationCause.ACCOUNT_CLOSED,
        },
      });
      await releaseSlot(transaction, evaluation.evaluationSlotId, occurredAt);
    }
    return future.length;
  },

  // The Client's own Bookings are already cancelled, so freed seats reach
  // the next eligible Waitlist entry of other Clients.
  promoteWaitlists: async (sessionIds, now) => {
    for (const sessionId of sessionIds) {
      await promoteWaitlistInTransaction(transaction, sessionId, {
        now: () => now,
        recordNotification,
      });
    }
  },
});
