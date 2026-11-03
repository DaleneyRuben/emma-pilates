import { BookingAccessDeniedError } from './create-booking';
import { recordAttendance } from './record-attendance';

const trainer = {
  accountId: 'trainer-account-id',
  authenticationSessionId: 'authentication-session-id',
  identity: {
    kind: 'staff' as const,
    staffMemberId: 'trainer-id',
    role: 'trainer' as const,
    branchIds: ['branch-id'],
  },
};

// A 10:00–10:50 Session.
const dependencies = (now: string) => ({
  principal: trainer,
  loadSession: jest.fn().mockResolvedValue({
    id: 'session-id',
    branchId: 'branch-id',
    trainerStaffMemberId: 'trainer-id',
    startsAt: new Date('2026-09-10T10:00:00Z'),
    endsAt: new Date('2026-09-10T10:50:00Z'),
    state: 'scheduled',
  }),
  loadBookedIds: jest.fn().mockResolvedValue(['booking-id']),
  save: jest.fn().mockResolvedValue(undefined),
  now: () => new Date(now),
});

const record = (deps: ReturnType<typeof dependencies>) =>
  recordAttendance(
    {
      sessionId: 'session-id',
      outcomes: [{ bookingId: 'booking-id', outcome: 'attended' }],
    },
    deps,
  );

describe('recordAttendance', () => {
  it('records a complete roster for the assigned Trainer after the Session ends', async () => {
    const deps = dependencies('2026-09-10T12:00:00Z');

    await expect(record(deps)).resolves.toBeUndefined();

    expect(deps.save).toHaveBeenCalledWith({
      sessionId: 'session-id',
      branchId: 'branch-id',
      outcomes: [{ bookingId: 'booking-id', outcome: 'attended' }],
      recordedByAccountId: 'trainer-account-id',
    });
  });

  // Owner, 2026-11-03: the Trainer marks attendance once the class starts,
  // during it, and after it; there is no closing time.
  it.each(['2026-09-10T10:00:00Z', '2026-09-10T10:20:00Z'])(
    'records attendance once the Session has started (%s)',
    async (now) => {
      const deps = dependencies(now);

      await expect(record(deps)).resolves.toBeUndefined();
      expect(deps.save).toHaveBeenCalled();
    },
  );

  it('refuses attendance before the Session starts', async () => {
    const deps = dependencies('2026-09-10T09:59:00Z');

    await expect(record(deps)).rejects.toBeInstanceOf(
      BookingAccessDeniedError,
    );
    expect(deps.save).not.toHaveBeenCalled();
  });
});
