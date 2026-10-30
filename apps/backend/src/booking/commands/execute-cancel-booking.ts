import type { Prisma } from '../../generated/prisma/client';
import {
  BookingCancellationCause,
  BookingState,
} from '../../generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { readCancellationWindowMinutes } from '../studio-settings/prisma-studio-settings';
import { cancelBooking } from './cancel-booking';
import { restoreBookedClass } from './restore-class';
import { promoteWaitlistInTransaction } from './waitlist-promotion';
import type { NotificationRecorder } from '../../notifications/prisma-notification-store';

export async function executeCancelBooking(
  transaction: Prisma.TransactionClient,
  command: { bookingId: string },
  principal: AuthenticatedPrincipal,
  dependencies: {
    now: () => Date;
    recordNotification: NotificationRecorder;
  },
): Promise<void> {
  await cancelBooking(command, {
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
    cancel: async (input) => {
      const cancelled = await transaction.booking.updateMany({
        where: { id: input.bookingId, state: BookingState.BOOKED },
        data: {
          state: BookingState.CANCELLED,
          cancelledAt: new Date(),
          cancelledByAccountId: input.cancelledByAccountId,
          cancellationCause: BookingCancellationCause.CLIENT_REQUEST,
        },
      });

      if (cancelled.count !== 1) {
        throw new Error('Booking is not cancellable');
      }

      await restoreBookedClass(transaction, {
        bookingId: input.bookingId,
        subscriptionId: input.subscriptionId,
        clientId: input.clientId,
        now: dependencies.now(),
      });

      const cancelledBooking = await transaction.booking.findUniqueOrThrow({
        where: { id: input.bookingId },
        select: { sessionId: true },
      });
      await promoteWaitlistInTransaction(
        transaction,
        cancelledBooking.sessionId,
        {
          now: dependencies.now,
          recordNotification: dependencies.recordNotification,
        },
      );
    },
    now: dependencies.now,
    cancellationWindowMinutes: () => readCancellationWindowMinutes(transaction),
  });
}
