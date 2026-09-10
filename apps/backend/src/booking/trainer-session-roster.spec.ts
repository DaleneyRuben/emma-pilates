import { loadTrainerSessionRoster } from './trainer-session-roster';

describe('loadTrainerSessionRoster', () => {
  const roster = {
    sessionId: 'session-id',
    trainerStaffMemberId: 'trainer-id',
    classTypeName: 'Reformer Pilates',
    branchName: 'Sucursal Centro',
    startsAt: new Date('2026-09-10T13:00:00.000Z'),
    endsAt: new Date('2026-09-10T14:00:00.000Z'),
    bookings: [
      {
        bookingId: 'booking-id',
        clientName: 'Ana Pérez',
        attendanceOutcome: 'attended' as const,
      },
    ],
  };

  it('returns booked Clients and recorded Attendance for the assigned Trainer', async () => {
    const findRoster = jest.fn().mockResolvedValue(roster);

    await expect(
      loadTrainerSessionRoster(
        { sessionId: 'session-id' },
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
          findRoster,
        },
      ),
    ).resolves.toEqual({
      sessionId: 'session-id',
      classTypeName: 'Reformer Pilates',
      branchName: 'Sucursal Centro',
      startsAt: new Date('2026-09-10T13:00:00.000Z'),
      endsAt: new Date('2026-09-10T14:00:00.000Z'),
      bookings: [
        {
          bookingId: 'booking-id',
          clientName: 'Ana Pérez',
          attendanceOutcome: 'attended',
        },
      ],
    });

    expect(findRoster).toHaveBeenCalledWith('session-id');
  });

  it('denies a Trainer access to another Trainer’s Session', async () => {
    await expect(
      loadTrainerSessionRoster(
        { sessionId: 'session-id' },
        {
          principal: {
            accountId: 'trainer-account-id',
            authenticationSessionId: 'authentication-session-id',
            identity: {
              kind: 'staff',
              staffMemberId: 'other-trainer-id',
              role: 'trainer',
              branchIds: ['branch-id'],
            },
          },
          findRoster: jest.fn().mockResolvedValue(roster),
        },
      ),
    ).rejects.toThrow('Booking access is denied');
  });
});
