import { rescheduleBooking } from './reschedule-booking';

describe('rescheduleBooking', () => {
  it('moves an owned Booking to a different same-day Session inside the Cancellation Window', async () => {
    const reschedule = jest.fn().mockResolvedValue({ id: 'replacement-id' });
    const now = new Date('2026-09-10T12:00:00Z');

    await expect(
      rescheduleBooking(
        { bookingId: 'booking-id', targetSessionId: 'target-session-id' },
        {
          principal: {
            accountId: 'account-id',
            authenticationSessionId: 'authentication-session-id',
            identity: { kind: 'client', clientId: 'client-id' },
          },
          loadBooking: jest.fn().mockResolvedValue({
            id: 'booking-id',
            clientId: 'client-id',
            subscriptionId: 'subscription-id',
            session: {
              id: 'source-session-id',
              branchId: 'branch-id',
              startsAt: new Date('2026-09-10T13:30:00Z'),
              state: 'scheduled',
            },
          }),
          loadSession: jest.fn().mockResolvedValue({
            id: 'target-session-id',
            branchId: 'branch-id',
            startsAt: new Date('2026-09-10T15:00:00Z'),
            endsAt: new Date('2026-09-10T16:00:00Z'),
            capacity: 8,
            state: 'scheduled',
          }),
          countLiveBookings: jest.fn().mockResolvedValue(0),
          hasOverlappingBooking: jest.fn().mockResolvedValue(false),
          reschedule,
          now: () => now,
        },
      ),
    ).resolves.toEqual({ id: 'replacement-id' });

    expect(reschedule).toHaveBeenCalledWith({
      bookingId: 'booking-id',
      targetSessionId: 'target-session-id',
      clientId: 'client-id',
      subscriptionId: 'subscription-id',
      rescheduledByAccountId: 'account-id',
    });
  });

  it('rejects a Booking that is no longer live', async () => {
    await expect(
      rescheduleBooking(
        { bookingId: 'booking-id', targetSessionId: 'target-session-id' },
        {
          principal: {
            accountId: 'account-id',
            authenticationSessionId: 'authentication-session-id',
            identity: { kind: 'client', clientId: 'client-id' },
          },
          loadBooking: jest.fn().mockResolvedValue({
            id: 'booking-id',
            clientId: 'client-id',
            subscriptionId: 'subscription-id',
            state: 'rescheduled',
            session: {
              id: 'source-session-id',
              branchId: 'branch-id',
              startsAt: new Date('2026-09-10T13:30:00Z'),
              state: 'scheduled',
            },
          }),
          loadSession: jest.fn(),
          countLiveBookings: jest.fn(),
          hasOverlappingBooking: jest.fn(),
          reschedule: jest.fn(),
          now: () => new Date('2026-09-10T12:00:00Z'),
        },
      ),
    ).rejects.toThrow('Booking access is denied');
  });
});
