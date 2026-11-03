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
      audit: {
        accountId: 'admin-account',
        role: 'ADMINISTRATOR',
        impersonationId: null,
      },
    });
  });

  it('names the Administrator in the audit, and keeps the Coordinator’s Account on the Session, while she sees the app as the Coordinator', async () => {
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
      cancelledByAccountId: 'coordinator-account',
      audit: {
        accountId: 'admin-account',
        role: 'ADMINISTRATOR',
        impersonationId: 'impersonation-id',
      },
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

  // FIX-027: the owner cancels an empty class too (a holiday, a sick Trainer).
  it('cancels a future Session that has no Bookings', async () => {
    const deps = dependencies();
    deps.cancel.mockResolvedValue({ affectedBookings: 0 });

    await expect(
      cancelSession({ sessionId: 'session-1' }, deps),
    ).resolves.toEqual({ affectedBookings: 0 });
    expect(deps.cancel).toHaveBeenCalled();
  });
});
