import { listClassHistory } from './class-history';

describe('listClassHistory', () => {
  it('returns attended Bookings only for the authenticated Client', async () => {
    const findAttendedBookings = jest
      .fn()
      .mockResolvedValue([
        { bookingId: 'booking-id', sessionId: 'session-id' },
      ]);

    await expect(
      listClassHistory(
        {
          accountId: 'account-id',
          authenticationSessionId: 'authentication-session-id',
          identity: { kind: 'client', clientId: 'client-id' },
        },
        { findAttendedBookings },
      ),
    ).resolves.toEqual([{ bookingId: 'booking-id', sessionId: 'session-id' }]);

    expect(findAttendedBookings).toHaveBeenCalledWith('client-id');
  });
});
