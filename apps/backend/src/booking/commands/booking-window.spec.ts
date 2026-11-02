import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { isBeyondBookingWindow } from '../studio-settings/studio-settings';
import { createBooking } from './create-booking';
import { joinWaitlist } from './join-waitlist';
import { rescheduleBooking } from './reschedule-booking';

// FIX-026 (owner 2026-11-02): «días para reservar por adelantado» is a Studio
// Setting. With 7, a Client books from today through the sixth day after it,
// the seven days the apps' strip shows, counted in La Paz civil dates.
const now = new Date('2026-11-02T14:00:00Z'); // Monday 10:00 in La Paz
const client: AuthenticatedPrincipal = {
  accountId: 'client-account',
  authenticationSessionId: 'session',
  identity: { kind: 'client', clientId: 'client' },
};
const assistant: AuthenticatedPrincipal = {
  accountId: 'assistant-account',
  authenticationSessionId: 'session',
  identity: {
    kind: 'staff',
    staffMemberId: 'assistant',
    role: 'assistant',
    branchIds: ['branch'],
  },
};
// Sunday 8 November at 21:00 in La Paz is already Monday 9 in UTC.
const sixthDay = new Date('2026-11-09T01:00:00Z');
const seventhDay = new Date('2026-11-09T14:00:00Z');
const sessionAt = (startsAt: Date) => ({
  id: 'session',
  branchId: 'branch',
  startsAt,
  endsAt: new Date(startsAt.getTime() + 60 * 60 * 1_000),
  capacity: 1,
  state: 'scheduled' as const,
});
const sevenDays = () => Promise.resolve(7);

const outcome = (work: Promise<unknown>) =>
  work.then(
    () => 'done',
    (error: Error) => `refused: ${error.message}`,
  );

const book = (startsAt: Date, principal: AuthenticatedPrincipal = client) =>
  createBooking(
    {
      sessionId: 'session',
      clientId: principal === client ? undefined : 'client',
    },
    {
      principal,
      loadSession: () => Promise.resolve(sessionAt(startsAt)),
      countLiveBookings: () => Promise.resolve(0),
      findEligibleSubscription: () => Promise.resolve({ id: 'subscription' }),
      hasOverlappingBooking: () => Promise.resolve(false),
      create: () => Promise.resolve({ id: 'booking' }),
      bookingWindowDays: sevenDays,
      now: () => now,
    },
  );

const join = (startsAt: Date, principal: AuthenticatedPrincipal = client) =>
  joinWaitlist(
    {
      sessionId: 'session',
      clientId: principal === client ? undefined : 'client',
    },
    {
      principal,
      loadSession: () => Promise.resolve(sessionAt(startsAt)),
      countLiveBookings: () => Promise.resolve(1),
      findEligibleSubscription: () => Promise.resolve({ id: 'subscription' }),
      hasLiveBooking: () => Promise.resolve(false),
      hasActiveEntry: () => Promise.resolve(false),
      create: () => Promise.resolve({ id: 'entry' }),
      cancellationWindowMinutes: () => Promise.resolve(150),
      bookingWindowDays: sevenDays,
      now: () => now,
    },
  );

// Tuesday 3 November: her 11:00 class is inside the Cancellation Window, and
// she moves it to Wednesday, the second day of a one-day or two-day window.
const rescheduleNow = new Date('2026-11-03T14:00:00Z');
const reschedule = (days: number, principal: AuthenticatedPrincipal) =>
  rescheduleBooking(
    { bookingId: 'booking', targetSessionId: 'target' },
    {
      principal,
      loadBooking: () =>
        Promise.resolve({
          id: 'booking',
          clientId: 'client',
          subscriptionId: 'subscription',
          state: 'booked' as const,
          session: {
            id: 'source',
            branchId: 'branch',
            startsAt: new Date('2026-11-03T15:00:00Z'),
            state: 'scheduled' as const,
          },
        }),
      loadSession: () =>
        Promise.resolve({
          ...sessionAt(new Date('2026-11-04T14:00:00Z')),
          id: 'target',
        }),
      countLiveBookings: () => Promise.resolve(0),
      hasOverlappingBooking: () => Promise.resolve(false),
      reschedule: () => Promise.resolve({ id: 'moved' }),
      cancellationWindowMinutes: () => Promise.resolve(150),
      bookingWindowDays: () => Promise.resolve(days),
      now: () => rescheduleNow,
    },
  );

const refusal = 'refused: Session is beyond the Booking Window';

describe('isBeyondBookingWindow', () => {
  it('counts La Paz civil dates from today', () => {
    expect(isBeyondBookingWindow(now, now, 7)).toBe(false);
    expect(isBeyondBookingWindow(sixthDay, now, 7)).toBe(false);
    expect(isBeyondBookingWindow(seventhDay, now, 7)).toBe(true);
    expect(isBeyondBookingWindow(sixthDay, now, 6)).toBe(true);
  });
});

describe('the Booking Window from Studio Settings', () => {
  it.each([
    ['the Client', client],
    ['the Assistant', assistant],
  ])(
    'lets %s book and join a Waitlist through the sixth day',
    async (_, who) => {
      await expect(outcome(book(sixthDay, who))).resolves.toBe('done');
      await expect(outcome(join(sixthDay, who))).resolves.toBe('done');
    },
  );

  it.each([
    ['the Client', client],
    ['the Assistant', assistant],
  ])('refuses %s a Session on the seventh day', async (_, who) => {
    await expect(outcome(book(seventhDay, who))).resolves.toBe(refusal);
    await expect(outcome(join(seventhDay, who))).resolves.toBe(refusal);
  });

  it.each([
    ['the Client', client],
    ['the Assistant', assistant],
  ])('refuses %s a Reschedule beyond the window', async (_, who) => {
    await expect(outcome(reschedule(1, who))).resolves.toBe(refusal);
    await expect(outcome(reschedule(2, who))).resolves.toBe('done');
  });
});
