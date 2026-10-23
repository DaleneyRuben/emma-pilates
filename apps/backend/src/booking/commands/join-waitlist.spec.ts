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
          hasActiveEntry: jest.fn().mockResolvedValue(false),
          create,
          cancellationWindowMinutes: () => Promise.resolve(150),
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

  it('refuses the Waitlist at the weekly cap unless an extra class is left', async () => {
    const create = jest.fn();
    const dependencies = {
      principal: {
        accountId: 'account-id',
        authenticationSessionId: 'authentication-session-id',
        identity: { kind: 'client' as const, clientId: 'client-id' },
      },
      loadSession: jest.fn().mockResolvedValue({
        id: 'session-id',
        branchId: 'branch-id',
        startsAt: new Date('2026-09-10T16:00:00Z'),
        capacity: 1,
        state: 'scheduled' as const,
      }),
      countLiveBookings: jest.fn().mockResolvedValue(1),
      hasLiveBooking: jest.fn().mockResolvedValue(false),
      hasActiveEntry: jest.fn().mockResolvedValue(false),
      create,
      cancellationWindowMinutes: () => Promise.resolve(150),
      now: () => new Date('2026-09-10T12:00:00Z'),
    };

    await expect(
      joinWaitlist(
        { sessionId: 'session-id' },
        {
          ...dependencies,
          findEligibleSubscription: jest.fn().mockResolvedValue({
            id: 'subscription-id',
            weeklyClassCap: 3,
            baseFundedBookingsThisWeek: 3,
            extraClasses: 0,
          }),
        },
      ),
    ).rejects.toThrow('Weekly cap reached');
    expect(create).not.toHaveBeenCalled();

    await expect(
      joinWaitlist(
        { sessionId: 'session-id' },
        {
          ...dependencies,
          findEligibleSubscription: jest.fn().mockResolvedValue({
            id: 'subscription-id',
            weeklyClassCap: 3,
            baseFundedBookingsThisWeek: 3,
            extraClasses: 1,
          }),
        },
      ),
    ).resolves.toEqual({ id: 'waitlist-entry-id' });
  });

  it('rejects a Client who is already waiting for the Session', async () => {
    const create = jest.fn();

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
          hasActiveEntry: jest.fn().mockResolvedValue(true),
          create,
          cancellationWindowMinutes: () => Promise.resolve(150),
          now: () => new Date('2026-09-10T12:00:00Z'),
        },
      ),
    ).rejects.toThrow('Client already has an active Waitlist Entry');

    expect(create).not.toHaveBeenCalled();
  });
});
