import { BookingAccessDeniedError } from './create-booking';
import { leaveWaitlist } from './leave-waitlist';

const now = new Date('2026-09-21T12:00:00.000Z');
const principal = {
  accountId: 'account-id',
  authenticationSessionId: 'authentication-session-id',
  identity: { kind: 'client' as const, clientId: 'client-id' },
};
const entry = {
  id: 'entry-id',
  clientId: 'client-id',
  closedAt: null,
  session: {
    id: 'session-id',
    branchId: 'branch-id',
    startsAt: new Date('2026-09-21T15:00:00.000Z'),
    state: 'scheduled' as const,
  },
};

describe('leaveWaitlist', () => {
  it('closes the Client’s own active Waitlist Entry as left', async () => {
    const close = jest.fn().mockResolvedValue(undefined);

    await leaveWaitlist(
      { waitlistEntryId: 'entry-id' },
      {
        principal,
        loadEntry: jest.fn().mockResolvedValue(entry),
        close,
        now: () => now,
      },
    );

    expect(close).toHaveBeenCalledWith({
      waitlistEntryId: 'entry-id',
      closedByAccountId: 'account-id',
      closedAt: now,
    });
  });

  it('denies another Client’s entry and unknown or closed entries', async () => {
    const close = jest.fn();

    await expect(
      leaveWaitlist(
        { waitlistEntryId: 'entry-id' },
        {
          principal,
          loadEntry: jest
            .fn()
            .mockResolvedValue({ ...entry, clientId: 'someone-else' }),
          close,
          now: () => now,
        },
      ),
    ).rejects.toBeInstanceOf(BookingAccessDeniedError);
    await expect(
      leaveWaitlist(
        { waitlistEntryId: 'entry-id' },
        {
          principal,
          loadEntry: jest.fn().mockResolvedValue(null),
          close,
          now: () => now,
        },
      ),
    ).rejects.toBeInstanceOf(BookingAccessDeniedError);
    await expect(
      leaveWaitlist(
        { waitlistEntryId: 'entry-id' },
        {
          principal,
          loadEntry: jest.fn().mockResolvedValue({ ...entry, closedAt: now }),
          close,
          now: () => now,
        },
      ),
    ).rejects.toThrow('Waitlist Entry is not active');
    expect(close).not.toHaveBeenCalled();
  });

  it('lets an Assistant assigned to the Session’s Branch leave it for the Client', async () => {
    const close = jest.fn().mockResolvedValue(undefined);
    const assistant = {
      ...principal,
      accountId: 'assistant-account',
      identity: {
        kind: 'staff' as const,
        staffMemberId: 'staff-id',
        role: 'assistant' as const,
        branchIds: [entry.session.branchId],
      },
    };

    await leaveWaitlist(
      { waitlistEntryId: 'entry-id' },
      {
        principal: assistant,
        loadEntry: jest.fn().mockResolvedValue(entry),
        close,
        now: () => now,
      },
    );

    expect(close).toHaveBeenCalledWith({
      waitlistEntryId: entry.id,
      closedByAccountId: 'assistant-account',
      closedAt: now,
    });
  });

  it('denies Staff outside the Session’s Branch and every other Role', async () => {
    const deny = (
      identity: Parameters<typeof leaveWaitlist>[1]['principal']['identity'],
    ) =>
      expect(
        leaveWaitlist(
          { waitlistEntryId: 'entry-id' },
          {
            principal: { ...principal, identity },
            loadEntry: jest.fn().mockResolvedValue(entry),
            close: jest.fn(),
            now: () => now,
          },
        ),
      ).rejects.toBeInstanceOf(BookingAccessDeniedError);

    await deny({
      kind: 'staff',
      staffMemberId: 'staff-id',
      role: 'assistant',
      branchIds: ['another-branch'],
    });
    await deny({
      kind: 'staff',
      staffMemberId: 'staff-id',
      role: 'trainer',
      branchIds: [entry.session.branchId],
    });
  });
});
