import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { BookingAccessDeniedError } from './create-booking';

type BookingForCancellation = {
  id: string;
  clientId: string;
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

  if (
    principal.identity.role === 'assistant' &&
    principal.identity.branchIds.includes(booking.session.branchId)
  ) {
    return;
  }

  throw new BookingAccessDeniedError();
};

export const cancelBooking = async (
  command: { bookingId: string },
  dependencies: CancelBookingDependencies,
): Promise<void> => {
  const booking = await dependencies.loadBooking(command.bookingId);

  if (booking === null || booking.session.state !== 'scheduled') {
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
    cancelledByAccountId: dependencies.principal.accountId,
  });
};
