import { listClassHistory } from './class-history';

describe('listClassHistory', () => {
  it('returns attended Bookings with their Session facts only for the authenticated Client', async () => {
    const entry = {
      bookingId: 'booking-id',
      sessionId: 'session-id',
      classTypeName: 'Reformer Pilates',
      trainerName: 'Emma Vargas',
      branchName: 'Centro',
      startsAt: new Date('2026-08-20T11:00:00.000Z'),
      endsAt: new Date('2026-08-20T11:50:00.000Z'),
    };
    const findAttendedBookings = jest.fn().mockResolvedValue([entry]);

    await expect(
      listClassHistory(
        {
          accountId: 'account-id',
          authenticationSessionId: 'authentication-session-id',
          identity: { kind: 'client', clientId: 'client-id' },
        },
        { findAttendedBookings },
      ),
    ).resolves.toEqual([entry]);

    expect(findAttendedBookings).toHaveBeenCalledWith('client-id');
  });
});
