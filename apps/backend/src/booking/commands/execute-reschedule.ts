import type { Prisma } from '../../generated/prisma/client';
import { BookingState } from '../../generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { readCancellationWindowMinutes } from '../studio-settings/prisma-studio-settings';
import {
  findApprovedFreeze,
  findNotYetStartedSubscription,
} from './eligible-subscription';
import { refuseGuestPassLastPlace } from './guest-pass-reschedule';
import { rescheduleBooking } from './reschedule-booking';
import { weeklyCapBlocksReschedule } from './reschedule-cap';
import { moveConsumptionToBooking } from './restore-class';
import { loadSession } from './waitlist-promotion';

export function executeReschedule(
  transaction: Prisma.TransactionClient,
  command: { bookingId: string; targetSessionId: string },
  principal: AuthenticatedPrincipal,
  now: () => Date,
): Promise<{ id: string }> {
  return rescheduleBooking(command, {
    principal,
    loadBooking: async (bookingId) => {
      const booking = await transaction.booking.findUnique({
        where: { id: bookingId },
        select: {
          id: true,
          clientId: true,
          subscriptionId: true,
          state: true,
          session: {
            select: {
              id: true,
              branchId: true,
              startsAt: true,
              state: true,
            },
          },
        },
      });

      return booking === null
        ? null
        : {
            ...booking,
            state: booking.state.toLowerCase() as
              'booked' | 'cancelled' | 'rescheduled',
            session: {
              ...booking.session,
              state: booking.session.state.toLowerCase() as
                'scheduled' | 'cancelled',
            },
          };
    },
    loadSession: (sessionId) => loadSession(transaction, sessionId),
    countLiveBookings: (sessionId) =>
      transaction.booking.count({
        where: { sessionId, state: BookingState.BOOKED },
      }),
    findApprovedFreeze: ({ clientId, onDate }) =>
      findApprovedFreeze(transaction, { clientId, onDate }),
    findNotYetStartedSubscription: ({ clientId, onDate }) =>
      findNotYetStartedSubscription(transaction, { clientId, onDate }),
    weeklyCapBlocksDestination: (input) =>
      weeklyCapBlocksReschedule(transaction, input),
    hasOverlappingBooking: ({ clientId, startsAt, endsAt }) =>
      transaction.booking
        .findFirst({
          where: {
            clientId,
            state: BookingState.BOOKED,
            session: {
              startsAt: { lt: endsAt },
              endsAt: { gt: startsAt },
            },
          },
          select: { id: true },
        })
        .then((booking) => booking !== null),
    reschedule: async (input) => {
      await refuseGuestPassLastPlace(transaction, input);
      const replacement = await transaction.booking.create({
        data: {
          sessionId: input.targetSessionId,
          clientId: input.clientId,
          subscriptionId: input.subscriptionId,
          createdByAccountId: input.rescheduledByAccountId,
        },
        select: { id: true },
      });

      const updated = await transaction.booking.updateMany({
        where: { id: input.bookingId, state: BookingState.BOOKED },
        data: {
          state: BookingState.RESCHEDULED,
          rescheduledAt: new Date(),
          rescheduledByAccountId: input.rescheduledByAccountId,
          rescheduledToBookingId: replacement.id,
        },
      });

      if (updated.count !== 1) {
        throw new Error('Booking is not reschedulable');
      }

      await moveConsumptionToBooking(transaction, {
        fromBookingId: input.bookingId,
        toBookingId: replacement.id,
      });

      return replacement;
    },
    now,
    cancellationWindowMinutes: () => readCancellationWindowMinutes(transaction),
  });
}
