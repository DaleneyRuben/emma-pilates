import { joinWaitlist } from './join-waitlist';

describe('joinWaitlist', () => {
  it('adds the authenticated Client to a full Session without consuming allowance', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'waitlist-entry-id' });

    await expect(
      joinWaitlist(
        { sessionId: 'session-id' },
        {
          principal: {
            accountId: 'account-id',
            authenticationSessionId: 'authentication-session-id',
            identity: { kind: 'client', clientId: 'client-id' },
          },
          loadSession: jest.fn().mockResolvedValue({
            id: 'session-id',
            branchId: 'branch-id',
            startsAt: new Date('2026-09-10T16:00:00Z'),
            capacity: 1,
            state: 'scheduled',
          }),
          countLiveBookings: jest.fn().mockResolvedValue(1),
          findEligibleSubscription: jest.fn().mockResolvedValue({
            id: 'subscription-id',
          }),
          hasLiveBooking: jest.fn().mockResolvedValue(false),
          create,
          now: () => new Date('2026-09-10T12:00:00Z'),
        },
      ),
    ).resolves.toEqual({ id: 'waitlist-entry-id' });

    expect(create).toHaveBeenCalledWith({
      sessionId: 'session-id',
      clientId: 'client-id',
      joinedByAccountId: 'account-id',
    });
  });
});
