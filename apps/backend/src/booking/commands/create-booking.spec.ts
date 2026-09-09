import { createBooking } from './create-booking';

describe('createBooking', () => {
  const session = {
    id: 'session-id',
    branchId: 'branch-id',
    startsAt: new Date('2026-09-10T16:00:00Z'),
    endsAt: new Date('2026-09-10T17:00:00Z'),
    capacity: 8,
    state: 'scheduled' as const,
  };

  it('creates a Booking for the authenticated Client', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'booking-id' });

    await expect(
      createBooking(
        { sessionId: session.id },
        {
          principal: {
            accountId: 'account-id',
            authenticationSessionId: 'authentication-session-id',
            identity: { kind: 'client', clientId: 'client-id' },
          },
          loadSession: jest.fn().mockResolvedValue(session),
          countLiveBookings: jest.fn().mockResolvedValue(0),
          findEligibleSubscription: jest.fn().mockResolvedValue({
            id: 'subscription-id',
          }),
          create,
          now: () => new Date('2026-09-10T12:00:00Z'),
        },
      ),
    ).resolves.toEqual({ id: 'booking-id' });

    expect(create).toHaveBeenCalledWith({
      sessionId: session.id,
      clientId: 'client-id',
      subscriptionId: 'subscription-id',
      createdByAccountId: 'account-id',
    });
  });

  it('allows an Assistant to act only at an assigned Branch', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'booking-id' });

    await createBooking(
      { sessionId: session.id, clientId: 'client-id' },
      {
        principal: {
          accountId: 'assistant-account-id',
          authenticationSessionId: 'authentication-session-id',
          identity: {
            kind: 'staff',
            staffMemberId: 'assistant-id',
            role: 'assistant',
            branchIds: [session.branchId],
          },
        },
        loadSession: jest.fn().mockResolvedValue(session),
        countLiveBookings: jest.fn().mockResolvedValue(0),
        findEligibleSubscription: jest.fn().mockResolvedValue({
          id: 'subscription-id',
        }),
        create,
        now: () => new Date('2026-09-10T12:00:00Z'),
      },
    );

    expect(create).toHaveBeenCalledWith({
      sessionId: session.id,
      clientId: 'client-id',
      subscriptionId: 'subscription-id',
      createdByAccountId: 'assistant-account-id',
    });
  });

  it('rejects a Client attempting to book for somebody else', async () => {
    const create = jest.fn();

    await expect(
      createBooking(
        { sessionId: session.id, clientId: 'another-client-id' },
        {
          principal: {
            accountId: 'account-id',
            authenticationSessionId: 'authentication-session-id',
            identity: { kind: 'client', clientId: 'client-id' },
          },
          loadSession: jest.fn().mockResolvedValue(session),
          countLiveBookings: jest.fn(),
          findEligibleSubscription: jest.fn(),
          create,
          now: () => new Date('2026-09-10T12:00:00Z'),
        },
      ),
    ).rejects.toThrow('Booking access is denied');

    expect(create).not.toHaveBeenCalled();
  });

  it('rejects an Assistant outside the Session Branch', async () => {
    const create = jest.fn();

    await expect(
      createBooking(
        { sessionId: session.id, clientId: 'client-id' },
        {
          principal: {
            accountId: 'assistant-account-id',
            authenticationSessionId: 'authentication-session-id',
            identity: {
              kind: 'staff',
              staffMemberId: 'assistant-id',
              role: 'assistant',
              branchIds: ['another-branch-id'],
            },
          },
          loadSession: jest.fn().mockResolvedValue(session),
          countLiveBookings: jest.fn(),
          findEligibleSubscription: jest.fn(),
          create,
          now: () => new Date('2026-09-10T12:00:00Z'),
        },
      ),
    ).rejects.toThrow('Booking access is denied');

    expect(create).not.toHaveBeenCalled();
  });

  it('rejects a Booking when the Session is at capacity', async () => {
    const create = jest.fn();

    await expect(
      createBooking(
        { sessionId: session.id },
        {
          principal: {
            accountId: 'account-id',
            authenticationSessionId: 'authentication-session-id',
            identity: { kind: 'client', clientId: 'client-id' },
          },
          loadSession: jest.fn().mockResolvedValue(session),
          countLiveBookings: jest.fn().mockResolvedValue(session.capacity),
          findEligibleSubscription: jest.fn(),
          create,
          now: () => new Date('2026-09-10T12:00:00Z'),
        },
      ),
    ).rejects.toThrow('Session is full');

    expect(create).not.toHaveBeenCalled();
  });

  it('requires an active Subscription with remaining allowance', async () => {
    const create = jest.fn();

    await expect(
      createBooking(
        { sessionId: session.id },
        {
          principal: {
            accountId: 'account-id',
            authenticationSessionId: 'authentication-session-id',
            identity: { kind: 'client', clientId: 'client-id' },
          },
          loadSession: jest.fn().mockResolvedValue(session),
          countLiveBookings: jest.fn().mockResolvedValue(0),
          findEligibleSubscription: jest.fn().mockResolvedValue(null),
          create,
          now: () => new Date('2026-09-10T12:00:00Z'),
        },
      ),
    ).rejects.toThrow('No eligible Subscription');

    expect(create).not.toHaveBeenCalled();
  });
});
