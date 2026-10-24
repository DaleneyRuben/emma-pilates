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
});
