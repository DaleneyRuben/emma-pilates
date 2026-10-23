import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { listAdministratorSessions } from '../sessions/administrator-sessions';
import { cancelBooking } from './cancel-booking';
import { cancelSession } from './cancel-session';
import { createBooking } from './create-booking';
import { joinWaitlist } from './join-waitlist';
import { leaveWaitlist } from './leave-waitlist';
import { rescheduleBooking } from './reschedule-booking';

// IDN-009 / ADR-0102: the Coordinator books, waitlists, cancels, and
// reschedules for a Client like the Assistant, at every Branch (she holds them
// all implicitly), and cancels a Session with Bookings like the Administrator.
const coordinator: AuthenticatedPrincipal = {
  accountId: 'coordinator-account-id',
  authenticationSessionId: 'authentication-session-id',
  identity: {
    kind: 'staff',
    staffMemberId: 'coordinator-id',
    role: 'coordinator',
    branchIds: [],
  },
};
const now = () => new Date('2026-09-10T12:00:00Z');
const session = {
  id: 'session-id',
  branchId: 'any-branch-id',
  startsAt: new Date('2026-09-11T16:00:00Z'),
  endsAt: new Date('2026-09-11T17:00:00Z'),
  capacity: 8,
  state: 'scheduled' as const,
};
const booking = {
  id: 'booking-id',
  clientId: 'client-id',
  subscriptionId: 'subscription-id',
  state: 'booked' as const,
  session,
};

describe('the Coordinator acting for a Client (ADR-0102)', () => {
  it('books a Client into a Session at any Branch', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'booking-id' });

    await createBooking(
      { sessionId: session.id, clientId: 'client-id' },
      {
        principal: coordinator,
        loadSession: jest.fn().mockResolvedValue(session),
        countLiveBookings: jest.fn().mockResolvedValue(0),
        findEligibleSubscription: jest
          .fn()
          .mockResolvedValue({ id: 'subscription-id' }),
        hasOverlappingBooking: jest.fn().mockResolvedValue(false),
        create,
        now,
      },
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'client-id',
        createdByAccountId: 'coordinator-account-id',
      }),
    );
  });

  it('puts a Client on the Waitlist of a full Session', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'entry-id' });

    await joinWaitlist(
      { sessionId: session.id, clientId: 'client-id' },
      {
        principal: coordinator,
        loadSession: jest.fn().mockResolvedValue(session),
        countLiveBookings: jest.fn().mockResolvedValue(session.capacity),
        findEligibleSubscription: jest
          .fn()
          .mockResolvedValue({ id: 'subscription-id' }),
        hasLiveBooking: jest.fn().mockResolvedValue(false),
        hasActiveEntry: jest.fn().mockResolvedValue(false),
        create,
        now,
      },
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ joinedByAccountId: 'coordinator-account-id' }),
    );
  });

  it('cancels and reschedules a Client’s Booking and takes her off a Waitlist', async () => {
    const cancel = jest.fn().mockResolvedValue(undefined);
    await cancelBooking(
      { bookingId: booking.id },
      {
        principal: coordinator,
        loadBooking: jest.fn().mockResolvedValue(booking),
        cancel,
        now,
      },
    );
    expect(cancel).toHaveBeenCalledWith(
      expect.objectContaining({
        cancelledByAccountId: 'coordinator-account-id',
      }),
    );

    const reschedule = jest.fn().mockResolvedValue({ id: 'new-booking-id' });
    await rescheduleBooking(
      { bookingId: booking.id, targetSessionId: 'target-session-id' },
      {
        principal: coordinator,
        loadBooking: jest.fn().mockResolvedValue(booking),
        loadSession: jest.fn().mockResolvedValue({
          ...session,
          id: 'target-session-id',
          branchId: 'another-branch-id',
          startsAt: new Date('2026-09-11T18:00:00Z'),
          endsAt: new Date('2026-09-11T19:00:00Z'),
        }),
        countLiveBookings: jest.fn().mockResolvedValue(0),
        hasOverlappingBooking: jest.fn().mockResolvedValue(false),
        reschedule,
        // Rescheduling happens inside the Cancellation Window, on the same day.
        now: () => new Date('2026-09-11T14:30:00Z'),
      },
    );
    expect(reschedule).toHaveBeenCalledWith(
      expect.objectContaining({
        rescheduledByAccountId: 'coordinator-account-id',
      }),
    );

    const close = jest.fn().mockResolvedValue(undefined);
    await leaveWaitlist(
      { waitlistEntryId: 'entry-id' },
      {
        principal: coordinator,
        loadEntry: jest.fn().mockResolvedValue({
          id: 'entry-id',
          clientId: 'client-id',
          closedAt: null,
          session,
        }),
        close,
        now,
      },
    );
    expect(close).toHaveBeenCalledWith(
      expect.objectContaining({ closedByAccountId: 'coordinator-account-id' }),
    );
  });
});

describe('the Coordinator on the schedule (ADR-0102)', () => {
  it('lists every Branch’s Sessions and cancels one that has Bookings', async () => {
    const read = jest.fn().mockResolvedValue([]);
    await expect(
      listAdministratorSessions(
        { from: now(), to: now() } as never,
        coordinator,
        read,
      ),
    ).resolves.toEqual([]);

    const cancel = jest.fn().mockResolvedValue({ affectedBookings: 3 });
    await expect(
      cancelSession(
        { sessionId: session.id },
        {
          principal: coordinator,
          loadSession: jest
            .fn()
            .mockResolvedValue({ ...session, liveBookingCount: 3 }),
          cancel,
          now,
        },
      ),
    ).resolves.toEqual({ affectedBookings: 3 });
    expect(cancel).toHaveBeenCalledWith({
      sessionId: session.id,
      cancelledByAccountId: 'coordinator-account-id',
    });
  });
});
