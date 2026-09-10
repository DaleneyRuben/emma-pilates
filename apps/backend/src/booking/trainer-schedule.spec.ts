import { listTrainerSchedule } from './trainer-schedule';

describe('listTrainerSchedule', () => {
  const on = new Date('2026-09-10T00:00:00.000Z');

  it('returns only the authenticated Trainer’s Sessions for the selected day', async () => {
    const findSessions = jest.fn().mockResolvedValue([
      {
        sessionId: 'session-id',
        classTypeName: 'Reformer Pilates',
        branchName: 'Sucursal Centro',
        startsAt: new Date('2026-09-10T13:00:00.000Z'),
        endsAt: new Date('2026-09-10T14:00:00.000Z'),
        capacity: 8,
        bookedCount: 6,
      },
    ]);

    await expect(
      listTrainerSchedule(
        { on },
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
          findSessions,
        },
      ),
    ).resolves.toEqual([
      {
        sessionId: 'session-id',
        classTypeName: 'Reformer Pilates',
        branchName: 'Sucursal Centro',
        startsAt: new Date('2026-09-10T13:00:00.000Z'),
        endsAt: new Date('2026-09-10T14:00:00.000Z'),
        capacity: 8,
        bookedCount: 6,
      },
    ]);

    expect(findSessions).toHaveBeenCalledWith({
      trainerStaffMemberId: 'trainer-id',
      on,
    });
  });

  it('denies a Client access to a Trainer schedule', async () => {
    await expect(
      listTrainerSchedule(
        { on },
        {
          principal: {
            accountId: 'client-account-id',
            authenticationSessionId: 'authentication-session-id',
            identity: { kind: 'client', clientId: 'client-id' },
          },
          findSessions: jest.fn(),
        },
      ),
    ).rejects.toThrow('Booking access is denied');
  });
});
