import { promoteWaitlist } from './promote-waitlist';

describe('promoteWaitlist', () => {
  it('promotes the first eligible Waitlist Entry into a Booking', async () => {
    const createBooking = jest.fn().mockResolvedValue({ id: 'booking-id' });
    const closeAsPromoted = jest.fn().mockResolvedValue(undefined);

    await expect(
      promoteWaitlist(
        { sessionId: 'session-id' },
        {
          loadSession: jest.fn().mockResolvedValue({
            id: 'session-id',
            startsAt: new Date('2026-09-10T16:00:00Z'),
            endsAt: new Date('2026-09-10T17:00:00Z'),
            capacity: 1,
            state: 'scheduled',
          }),
          countLiveBookings: jest.fn().mockResolvedValue(0),
          loadActiveEntries: jest.fn().mockResolvedValue([
            {
              id: 'entry-id',
              clientId: 'client-id',
              joinedByAccountId: 'account-id',
            },
          ]),
          findEligibleSubscription: jest.fn().mockResolvedValue({
            id: 'subscription-id',
          }),
          hasOverlappingBooking: jest.fn().mockResolvedValue(false),
          createBooking,
          closeAsPromoted,
          cancellationWindowMinutes: () => Promise.resolve(150),
          now: () => new Date('2026-09-10T12:00:00Z'),
        },
      ),
    ).resolves.toEqual([{ entryId: 'entry-id', bookingId: 'booking-id' }]);

    expect(createBooking).toHaveBeenCalledWith({
      sessionId: 'session-id',
      clientId: 'client-id',
      subscriptionId: 'subscription-id',
      createdByAccountId: 'account-id',
    });
    expect(closeAsPromoted).toHaveBeenCalledWith({
      entryId: 'entry-id',
      bookingId: 'booking-id',
    });
  });

  it('skips a Client who reached the weekly cap and keeps her queued', async () => {
    const createBooking = jest.fn().mockResolvedValue({ id: 'booking-id' });
    const closeAsPromoted = jest.fn().mockResolvedValue(undefined);
    const findEligibleSubscription = jest
      .fn()
      .mockResolvedValueOnce({
        id: 'capped-subscription',
        weeklyClassCap: 3,
        baseFundedBookingsThisWeek: 3,
        extraClasses: 0,
      })
      .mockResolvedValueOnce({
        id: 'next-subscription',
        weeklyClassCap: 3,
        baseFundedBookingsThisWeek: 1,
        extraClasses: 0,
      });

    await expect(
      promoteWaitlist(
        { sessionId: 'session-id' },
        {
          loadSession: jest.fn().mockResolvedValue({
            id: 'session-id',
            startsAt: new Date('2026-09-10T16:00:00Z'),
            endsAt: new Date('2026-09-10T17:00:00Z'),
            capacity: 1,
            state: 'scheduled',
          }),
          countLiveBookings: jest.fn().mockResolvedValue(0),
          loadActiveEntries: jest.fn().mockResolvedValue([
            {
              id: 'capped-entry',
              clientId: 'capped-client',
              joinedByAccountId: 'capped-account',
            },
            {
              id: 'next-entry',
              clientId: 'next-client',
              joinedByAccountId: 'next-account',
            },
          ]),
          findEligibleSubscription,
          hasOverlappingBooking: jest.fn().mockResolvedValue(false),
          createBooking,
          closeAsPromoted,
          cancellationWindowMinutes: () => Promise.resolve(150),
          now: () => new Date('2026-09-10T12:00:00Z'),
        },
      ),
    ).resolves.toEqual([{ entryId: 'next-entry', bookingId: 'booking-id' }]);

    expect(createBooking).toHaveBeenCalledTimes(1);
    expect(createBooking).toHaveBeenCalledWith({
      sessionId: 'session-id',
      clientId: 'next-client',
      subscriptionId: 'next-subscription',
      createdByAccountId: 'next-account',
    });
    expect(closeAsPromoted).not.toHaveBeenCalledWith(
      expect.objectContaining({ entryId: 'capped-entry' }),
    );
  });

  it('skips a Client whose Session falls inside an approved Freeze', async () => {
    const createBooking = jest.fn().mockResolvedValue({ id: 'booking-id' });
    const findApprovedFreeze = jest.fn().mockResolvedValue({
      endsOn: new Date('2026-11-10T00:00:00.000Z'),
    });

    await expect(
      promoteWaitlist(
        { sessionId: 'session-id' },
        {
          loadSession: jest.fn().mockResolvedValue({
            id: 'session-id',
            startsAt: new Date('2026-11-05T15:00:00.000Z'),
            endsAt: new Date('2026-11-05T16:00:00.000Z'),
            capacity: 1,
            state: 'scheduled',
          }),
          countLiveBookings: jest.fn().mockResolvedValue(0),
          loadActiveEntries: jest.fn().mockResolvedValue([
            {
              id: 'frozen-entry',
              clientId: 'frozen-client',
              joinedByAccountId: 'frozen-account',
            },
          ]),
          findEligibleSubscription: jest
            .fn()
            .mockResolvedValue({ id: 'subscription-id' }),
          findApprovedFreeze,
          hasOverlappingBooking: jest.fn().mockResolvedValue(false),
          createBooking,
          closeAsPromoted: jest.fn(),
          cancellationWindowMinutes: () => Promise.resolve(150),
          now: () => new Date('2026-11-01T12:00:00.000Z'),
        },
      ),
    ).resolves.toEqual([]);

    expect(findApprovedFreeze).toHaveBeenCalledWith({
      clientId: 'frozen-client',
      onDate: new Date('2026-11-05T15:00:00.000Z'),
    });
    expect(createBooking).not.toHaveBeenCalled();
  });

  // H13: a Client the eligibility check still names, but who cannot be
  // funded, must not throw. The next Client is promoted and the Session
  // stays usable for everyone else.
  it('skips a Client who cannot be funded and promotes the next one', async () => {
    const createBooking = jest
      .fn()
      .mockRejectedValueOnce(new Error('No eligible Subscription'))
      .mockResolvedValueOnce({ id: 'next-booking' });
    const closeAsPromoted = jest.fn().mockResolvedValue(undefined);

    await expect(
      promoteWaitlist(
        { sessionId: 'session-id' },
        {
          loadSession: jest.fn().mockResolvedValue({
            id: 'session-id',
            startsAt: new Date('2026-09-10T16:00:00Z'),
            endsAt: new Date('2026-09-10T17:00:00Z'),
            capacity: 1,
            state: 'scheduled',
          }),
          countLiveBookings: jest.fn().mockResolvedValue(0),
          loadActiveEntries: jest.fn().mockResolvedValue([
            {
              id: 'spent-entry',
              clientId: 'spent-client',
              joinedByAccountId: 'spent-account',
            },
            {
              id: 'next-entry',
              clientId: 'next-client',
              joinedByAccountId: 'next-account',
            },
          ]),
          findEligibleSubscription: jest
            .fn()
            .mockResolvedValue({ id: 'subscription-id' }),
          hasOverlappingBooking: jest.fn().mockResolvedValue(false),
          createBooking,
          closeAsPromoted,
          cancellationWindowMinutes: () => Promise.resolve(150),
          now: () => new Date('2026-09-10T12:00:00Z'),
        },
      ),
    ).resolves.toEqual([{ entryId: 'next-entry', bookingId: 'next-booking' }]);

    expect(closeAsPromoted).toHaveBeenCalledTimes(1);
    expect(closeAsPromoted).toHaveBeenCalledWith({
      entryId: 'next-entry',
      bookingId: 'next-booking',
    });
  });
});
