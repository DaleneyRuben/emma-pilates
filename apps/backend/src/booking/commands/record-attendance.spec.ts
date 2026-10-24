import { recordAttendance } from './record-attendance';

describe('recordAttendance', () => {
  it('records a complete roster for the assigned Trainer after the Session ends', async () => {
    const save = jest.fn().mockResolvedValue(undefined);

    await expect(
      recordAttendance(
        {
          sessionId: 'session-id',
          outcomes: [{ bookingId: 'booking-id', outcome: 'attended' }],
        },
        {
          principal: {
            accountId: 'trainer-account-id',
            authenticationSessionId: 'authentication-session-id',
            identity: {
              kind: 'staff',
              staffMemberId: 'trainer-id',
              role: 'trainer',
              branchIds: ['branch-id'],
            },
          },
          loadSession: jest.fn().mockResolvedValue({
            id: 'session-id',
            branchId: 'branch-id',
            trainerStaffMemberId: 'trainer-id',
            endsAt: new Date('2026-09-10T11:00:00Z'),
            state: 'scheduled',
          }),
          loadBookedIds: jest.fn().mockResolvedValue(['booking-id']),
          save,
          now: () => new Date('2026-09-10T12:00:00Z'),
        },
      ),
    ).resolves.toBeUndefined();

    expect(save).toHaveBeenCalledWith({
      sessionId: 'session-id',
      branchId: 'branch-id',
      outcomes: [{ bookingId: 'booking-id', outcome: 'attended' }],
      recordedByAccountId: 'trainer-account-id',
    });
  });
});
