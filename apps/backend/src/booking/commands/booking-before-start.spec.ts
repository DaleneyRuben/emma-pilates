import { createBooking } from './create-booking';
import { bookingBeforeStartMessage } from './booking-before-start';

describe('createBooking before the Start Date', () => {
  const session = {
    id: 'session-id',
    branchId: 'branch-id',
    startsAt: new Date('2026-10-23T16:00:00Z'),
    endsAt: new Date('2026-10-23T17:00:00Z'),
    capacity: 8,
    state: 'scheduled' as const,
  };
  const principal = {
    accountId: 'account-id',
    authenticationSessionId: 'authentication-session-id',
    identity: { kind: 'client' as const, clientId: 'client-id' },
  };

  it('refuses with its own message when the Subscription has not started', async () => {
    const create = jest.fn();

    await expect(
      createBooking(
        { sessionId: session.id },
        {
          principal,
          loadSession: jest.fn().mockResolvedValue(session),
          countLiveBookings: jest.fn().mockResolvedValue(0),
          findEligibleSubscription: jest.fn().mockResolvedValue(null),
          findNotYetStartedSubscription: jest
            .fn()
            .mockResolvedValue({ startsOn: new Date('2026-10-26T00:00:00Z') }),
          hasOverlappingBooking: jest.fn(),
          create,
          now: () => new Date('2026-10-23T12:00:00Z'),
        },
      ),
    ).rejects.toThrow(
      bookingBeforeStartMessage(new Date('2026-10-26T00:00:00Z')),
    );

    expect(create).not.toHaveBeenCalled();
  });
});
