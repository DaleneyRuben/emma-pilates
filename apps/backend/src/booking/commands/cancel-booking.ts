import { actsForClientsAt } from '../staff-access';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { BookingAccessDeniedError } from './create-booking';

type BookingForCancellation = {
  id: string;
  clientId: string;
  subscriptionId: string;
  state: 'booked' | 'cancelled' | 'rescheduled';
  session: {
    id: string;
    branchId: string;
    startsAt: Date;
    state: 'scheduled' | 'cancelled';
  };
};

type CancelBookingDependencies = {
  principal: AuthenticatedPrincipal;
  loadBooking(bookingId: string): Promise<BookingForCancellation | null>;
  cancel(input: {
    bookingId: string;
    clientId: string;
    subscriptionId: string;
    cancelledByAccountId: string;
  }): Promise<void>;
  now(): Date;
};

const cancellationWindowMilliseconds = 2.5 * 60 * 60 * 1_000;

const assertAccess = (
  booking: BookingForCancellation,
  principal: AuthenticatedPrincipal,
): void => {
  if (principal.identity.kind === 'client') {
    if (principal.identity.clientId === booking.clientId) return;
    throw new BookingAccessDeniedError();
  }

  if (actsForClientsAt(principal, booking.session.branchId)) return;

  throw new BookingAccessDeniedError();
};

export const cancelBooking = async (
  command: { bookingId: string },
  dependencies: CancelBookingDependencies,
): Promise<void> => {
  const booking = await dependencies.loadBooking(command.bookingId);

  if (
    booking === null ||
    booking.state !== 'booked' ||
    booking.session.state !== 'scheduled'
  ) {
    throw new BookingAccessDeniedError();
  }

  assertAccess(booking, dependencies.principal);

  if (
    booking.session.startsAt.getTime() - dependencies.now().getTime() <=
    cancellationWindowMilliseconds
  ) {
    throw new Error('Booking is inside the Cancellation Window');
  }

  await dependencies.cancel({
    bookingId: booking.id,
    clientId: booking.clientId,
    subscriptionId: booking.subscriptionId,
    cancelledByAccountId: dependencies.principal.accountId,
  });
};
