import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { BookingAccessDeniedError } from './create-booking';

type BookingForReschedule = {
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

type SessionForReschedule = {
  id: string;
  branchId: string;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  state: 'scheduled' | 'cancelled';
};

type RescheduleBookingDependencies = {
  principal: AuthenticatedPrincipal;
  loadBooking(bookingId: string): Promise<BookingForReschedule | null>;
  loadSession(sessionId: string): Promise<SessionForReschedule | null>;
  countLiveBookings(sessionId: string): Promise<number>;
  hasOverlappingBooking(input: {
    clientId: string;
    startsAt: Date;
    endsAt: Date;
  }): Promise<boolean>;
  reschedule(input: {
    bookingId: string;
    targetSessionId: string;
    clientId: string;
    subscriptionId: string;
    rescheduledByAccountId: string;
  }): Promise<{ id: string }>;
  now(): Date;
};

const cancellationWindowMilliseconds = 2.5 * 60 * 60 * 1_000;

const boliviaDate = (instant: Date): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/La_Paz',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);

const assertAccess = (
  booking: BookingForReschedule,
  target: SessionForReschedule,
  principal: AuthenticatedPrincipal,
): void => {
  if (principal.identity.kind === 'client') {
    if (principal.identity.clientId === booking.clientId) return;
    throw new BookingAccessDeniedError();
  }

  if (
    principal.identity.role === 'assistant' &&
    principal.identity.branchIds.includes(booking.session.branchId) &&
    principal.identity.branchIds.includes(target.branchId)
  ) {
    return;
  }

  throw new BookingAccessDeniedError();
};

export const rescheduleBooking = async (
  command: { bookingId: string; targetSessionId: string },
  dependencies: RescheduleBookingDependencies,
): Promise<{ id: string }> => {
  const booking = await dependencies.loadBooking(command.bookingId);

  if (
    booking === null ||
    booking.state !== 'booked' ||
    booking.session.state !== 'scheduled' ||
    booking.session.startsAt <= dependencies.now()
  ) {
    throw new BookingAccessDeniedError();
  }

  const target = await dependencies.loadSession(command.targetSessionId);

  if (target === null || target.state !== 'scheduled') {
    throw new BookingAccessDeniedError();
  }

  assertAccess(booking, target, dependencies.principal);

  const now = dependencies.now();
  const sourceOffset = booking.session.startsAt.getTime() - now.getTime();
  if (sourceOffset <= 0 || sourceOffset > cancellationWindowMilliseconds) {
    throw new Error('Booking is outside the Cancellation Window');
  }

  if (
    target.id === booking.session.id ||
    target.startsAt <= now ||
    boliviaDate(target.startsAt) !== boliviaDate(booking.session.startsAt)
  ) {
    throw new Error('Target Session is not eligible for Reschedule');
  }

  if ((await dependencies.countLiveBookings(target.id)) >= target.capacity) {
    throw new Error('Session is full');
  }

  if (
    await dependencies.hasOverlappingBooking({
      clientId: booking.clientId,
      startsAt: target.startsAt,
      endsAt: target.endsAt,
    })
  ) {
    throw new Error('Client already has an overlapping Booking');
  }

  return dependencies.reschedule({
    bookingId: booking.id,
    targetSessionId: target.id,
    clientId: booking.clientId,
    subscriptionId: booking.subscriptionId,
    rescheduledByAccountId: dependencies.principal.accountId,
  });
};
