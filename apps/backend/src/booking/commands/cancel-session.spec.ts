import { BookingAccessDeniedError } from './create-booking';
import { cancelSession, type SessionForCancellation } from './cancel-session';

const now = new Date('2026-09-21T15:00:00.000Z');
const administrator = {
  accountId: 'admin-account',
  authenticationSessionId: 'session',
  identity: {
    kind: 'staff' as const,
    staffMemberId: 'admin',
    role: 'administrator' as const,
    branchIds: [],
  },
};
const trainer = {
  ...administrator,
  identity: { ...administrator.identity, role: 'trainer' as const },
};
const session: SessionForCancellation = {
  id: 'session-1',
  branchId: 'branch-1',
  startsAt: new Date('2026-09-22T11:00:00.000Z'),
  state: 'scheduled',
  liveBookingCount: 2,
};

const dependencies = (overrides: Partial<typeof session> | null = {}) => ({
  principal: administrator,
  loadSession: jest
    .fn()
    .mockResolvedValue(
      overrides === null ? null : { ...session, ...overrides },
    ),
  cancel: jest.fn().mockResolvedValue({ affectedBookings: 2 }),
  now: () => now,
});

describe('cancelSession', () => {
  it('lets an Administrator cancel a future scheduled Session with live Bookings', async () => {
    const deps = dependencies();

    await expect(
      cancelSession({ sessionId: 'session-1' }, deps),
    ).resolves.toEqual({
      affectedBookings: 2,
    });
    expect(deps.cancel).toHaveBeenCalledWith({
      sessionId: 'session-1',
      cancelledByAccountId: 'admin-account',
    });
  });

  it('names the Administrator when she cancels while seeing the app as the Coordinator', async () => {
    const deps = {
      ...dependencies(),
      principal: {
        ...administrator,
        accountId: 'coordinator-account',
        identity: {
          ...administrator.identity,
          role: 'coordinator' as const,
          staffMemberId: 'coordinator-staff',
        },
        impersonation: {
          id: 'impersonation-id',
          administratorAccountId: 'admin-account',
          staffMemberName: 'Carolina Rivas',
          expiresAt: new Date('2026-09-21T15:30:00.000Z'),
        },
      },
    };

    await cancelSession({ sessionId: 'session-1' }, deps);

    expect(deps.cancel).toHaveBeenCalledWith({
      sessionId: 'session-1',
      cancelledByAccountId: 'admin-account',
      impersonationId: 'impersonation-id',
    });
  });

  it('denies every other role', async () => {
    const deps = { ...dependencies(), principal: trainer };

    await expect(
      cancelSession({ sessionId: 'session-1' }, deps),
    ).rejects.toBeInstanceOf(BookingAccessDeniedError);
    expect(deps.cancel).not.toHaveBeenCalled();
  });

  it('refuses missing, cancelled, or started Sessions', async () => {
    await expect(
      cancelSession({ sessionId: 'session-1' }, dependencies(null)),
    ).rejects.toThrow('Session is not cancellable');
    await expect(
      cancelSession(
        { sessionId: 'session-1' },
        dependencies({ state: 'cancelled' }),
      ),
    ).rejects.toThrow('Session is not cancellable');
    await expect(
      cancelSession(
        { sessionId: 'session-1' },
        dependencies({ startsAt: new Date('2026-09-21T14:00:00.000Z') }),
      ),
    ).rejects.toThrow('Session is not cancellable');
  });

  it('is a last resort for Sessions that still have Bookings', async () => {
    await expect(
      cancelSession(
        { sessionId: 'session-1' },
        dependencies({ liveBookingCount: 0 }),
      ),
    ).rejects.toThrow('Session has no Bookings');
  });
});
