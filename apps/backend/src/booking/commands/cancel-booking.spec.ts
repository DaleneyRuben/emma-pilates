import { cancelBooking } from './cancel-booking';

describe('cancelBooking', () => {
  const now = new Date('2026-09-10T12:00:00Z');
  const booking = {
    id: 'booking-id',
    clientId: 'client-id',
    subscriptionId: 'subscription-id',
    state: 'booked' as const,
    session: {
      id: 'session-id',
      branchId: 'branch-id',
      startsAt: new Date('2026-09-10T16:00:01Z'),
      state: 'scheduled' as const,
    },
  };

  it('cancels an owned Booking strictly before the Cancellation Window', async () => {
    const cancel = jest.fn().mockResolvedValue(undefined);

    await expect(
      cancelBooking(
        { bookingId: booking.id },
        {
          principal: {
            accountId: 'account-id',
            authenticationSessionId: 'authentication-session-id',
            identity: { kind: 'client', clientId: booking.clientId },
          },
          loadBooking: jest.fn().mockResolvedValue(booking),
          cancel,
          cancellationWindowMinutes: () => Promise.resolve(150),
          now: () => now,
        },
      ),
    ).resolves.toBeUndefined();

    expect(cancel).toHaveBeenCalledWith({
      bookingId: booking.id,
      clientId: booking.clientId,
      subscriptionId: booking.subscriptionId,
      cancelledByAccountId: 'account-id',
    });
  });

  it('rejects a Booking at the Cancellation Window boundary', async () => {
    const cancel = jest.fn();

    await expect(
      cancelBooking(
        { bookingId: booking.id },
        {
          principal: {
            accountId: 'account-id',
            authenticationSessionId: 'authentication-session-id',
            identity: { kind: 'client', clientId: booking.clientId },
          },
          loadBooking: jest.fn().mockResolvedValue({
            ...booking,
            session: {
              ...booking.session,
              startsAt: new Date('2026-09-10T14:30:00Z'),
            },
          }),
          cancel,
          cancellationWindowMinutes: () => Promise.resolve(150),
          now: () => now,
        },
      ),
    ).rejects.toThrow('Booking is inside the Cancellation Window');

    expect(cancel).not.toHaveBeenCalled();
  });
});
