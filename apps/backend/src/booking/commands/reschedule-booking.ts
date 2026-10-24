import { actsForClientsAt } from '../staff-access';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { isInsideCancellationWindow } from '../studio-settings/studio-settings';
import { BookingAccessDeniedError } from './create-booking';
import { boliviaWeek } from './weekly-cap';

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
  weeklyCapBlocksDestination?(input: {
    subscriptionId: string;
    startsAt: Date;
    excludeBookingId: string;
  }): Promise<boolean>;
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
  cancellationWindowMinutes(): Promise<number>;
  now(): Date;
};

const sameBoliviaWeek = (left: Date, right: Date): boolean =>
  boliviaWeek(left).startsOn.getTime() ===
  boliviaWeek(right).startsOn.getTime();

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
    actsForClientsAt(principal, booking.session.branchId) &&
    actsForClientsAt(principal, target.branchId)
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
  if (
    booking.session.startsAt <= now ||
    !isInsideCancellationWindow(
      booking.session.startsAt,
      now,
      await dependencies.cancellationWindowMinutes(),
    )
  ) {
    throw new Error('Booking is outside the Cancellation Window');
  }

  if (
    target.id === booking.session.id ||
    target.startsAt <= now ||
    !sameBoliviaWeek(target.startsAt, booking.session.startsAt)
  ) {
    throw new Error('Target Session is not eligible for Reschedule');
  }

  // A same-week move frees the source Booking and takes one place in the
  // same week, so the cap does not change. A move into another week counts
  // there; the current Reschedule rule stays inside one week, so that check
  // runs once a later item allows a cross-week target.
  const blocks =
    dependencies.weeklyCapBlocksDestination?.bind(dependencies) ??
    (() => Promise.resolve(false));
  if (
    await blocks({
      subscriptionId: booking.subscriptionId,
      startsAt: target.startsAt,
      excludeBookingId: booking.id,
    })
  ) {
    throw new Error('Weekly cap reached');
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
