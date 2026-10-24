import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { cancelBooking } from './cancel-booking';
import { joinWaitlist } from './join-waitlist';
import { promoteWaitlist } from './promote-waitlist';
import { rescheduleBooking } from './reschedule-booking';

// BKM-004: the Cancellation Window is a Studio Setting. A Session starting in
// 3 hours is outside today's 2 h 30 window and inside a 4-hour one, so every
// rule that reads the window must flip when the setting does.
const now = new Date('2026-10-23T12:00:00Z');
const startsAt = new Date('2026-10-23T15:00:00Z');
const endsAt = new Date('2026-10-23T16:00:00Z');
const client: AuthenticatedPrincipal = {
  accountId: 'account',
  authenticationSessionId: 'session',
  identity: { kind: 'client', clientId: 'client' },
};
const session = {
  id: 'session',
  branchId: 'branch',
  startsAt,
  endsAt,
  capacity: 1,
  state: 'scheduled' as const,
};
const booking = {
  id: 'booking',
  clientId: 'client',
  subscriptionId: 'subscription',
  state: 'booked' as const,
  session,
};
const window = (minutes: number) => () => Promise.resolve(minutes);

const cancel = (minutes: number) =>
  cancelBooking(
    { bookingId: booking.id },
    {
      principal: client,
      loadBooking: () => Promise.resolve(booking),
      cancel: () => Promise.resolve(),
      cancellationWindowMinutes: window(minutes),
      now: () => now,
    },
  ).then(() => 'cancelled');

const join = (minutes: number) =>
  joinWaitlist(
    { sessionId: session.id },
    {
      principal: client,
      loadSession: () => Promise.resolve(session),
      countLiveBookings: () => Promise.resolve(1),
      findEligibleSubscription: () => Promise.resolve({ id: 'subscription' }),
      hasLiveBooking: () => Promise.resolve(false),
      hasActiveEntry: () => Promise.resolve(false),
      create: () => Promise.resolve({ id: 'entry' }),
      cancellationWindowMinutes: window(minutes),
      now: () => now,
    },
  ).then(() => 'joined');

const promote = (minutes: number) =>
  promoteWaitlist(
    { sessionId: session.id },
    {
      loadSession: () => Promise.resolve(session),
      countLiveBookings: () => Promise.resolve(0),
      loadActiveEntries: () =>
        Promise.resolve([
          { id: 'entry', clientId: 'client', joinedByAccountId: 'account' },
        ]),
      findEligibleSubscription: () => Promise.resolve({ id: 'subscription' }),
      hasOverlappingBooking: () => Promise.resolve(false),
      createBooking: () => Promise.resolve({ id: 'promoted' }),
      closeAsPromoted: () => Promise.resolve(),
      cancellationWindowMinutes: window(minutes),
      now: () => now,
    },
  ).then((promotions) => promotions.length);

const reschedule = (minutes: number) =>
  rescheduleBooking(
    { bookingId: booking.id, targetSessionId: 'target' },
    {
      principal: client,
      loadBooking: () => Promise.resolve(booking),
      loadSession: () =>
        Promise.resolve({
          ...session,
          id: 'target',
          startsAt: new Date('2026-10-23T18:00:00Z'),
          endsAt: new Date('2026-10-23T19:00:00Z'),
        }),
      countLiveBookings: () => Promise.resolve(0),
      hasOverlappingBooking: () => Promise.resolve(false),
      reschedule: () => Promise.resolve({ id: 'moved' }),
      cancellationWindowMinutes: window(minutes),
      now: () => now,
    },
  ).then(() => 'rescheduled');

const outcome = (work: Promise<unknown>) =>
  work.catch((error: Error) => `refused: ${error.message}`);

describe('the Cancellation Window from Studio Settings', () => {
  it('lets a Session 3 hours away be cancelled, waitlisted, and promoted under 2 h 30', async () => {
    await expect(cancel(150)).resolves.toBe('cancelled');
    await expect(join(150)).resolves.toBe('joined');
    await expect(promote(150)).resolves.toBe(1);
    await expect(outcome(reschedule(150))).resolves.toBe(
      'refused: Booking is outside the Cancellation Window',
    );
  });

  it('turns the same Session into a reschedule-only one under 4 hours', async () => {
    await expect(outcome(cancel(240))).resolves.toBe(
      'refused: Booking is inside the Cancellation Window',
    );
    await expect(outcome(join(240))).resolves.toBe(
      'refused: Booking access is denied',
    );
    await expect(promote(240)).resolves.toBe(0);
    await expect(reschedule(240)).resolves.toBe('rescheduled');
  });
});
