import { BookingAccessDeniedError } from '../commands/create-booking';
import { listClientBookings } from './client-bookings';

const principal = {
  accountId: 'account-id',
  authenticationSessionId: 'authentication-session-id',
  identity: { kind: 'client' as const, clientId: 'client-id' },
};
const now = new Date('2026-09-21T12:00:00.000Z');

describe('listClientBookings', () => {
  it('returns the Client’s upcoming Bookings and active Waitlist Entries', async () => {
    const upcoming = [
      {
        kind: 'booking' as const,
        bookingId: 'booking-1',
        sessionId: 'session-1',
        classTypeName: 'Reformer Pilates',
        trainerName: 'Emma Vargas',
        branchName: 'Centro',
        startsAt: new Date('2026-09-21T15:00:00.000Z'),
        endsAt: new Date('2026-09-21T15:50:00.000Z'),
      },
      {
        kind: 'waitlist' as const,
        waitlistEntryId: 'entry-1',
        sessionId: 'session-2',
        classTypeName: 'Mat Pilates',
        trainerName: 'Daniela Ortiz',
        branchName: 'Urubó',
        startsAt: new Date('2026-09-22T13:00:00.000Z'),
        endsAt: new Date('2026-09-22T13:50:00.000Z'),
      },
    ];
    const findUpcoming = jest.fn().mockResolvedValue(upcoming);

    await expect(
      listClientBookings({ principal, findUpcoming, now: () => now }),
    ).resolves.toEqual(upcoming);
    expect(findUpcoming).toHaveBeenCalledWith({
      clientId: 'client-id',
      from: now,
    });
  });

  it('denies Staff principals', async () => {
    await expect(
      listClientBookings({
        principal: {
          ...principal,
          identity: {
            kind: 'staff',
            staffMemberId: 'staff-id',
            role: 'trainer',
            branchIds: [],
          },
        },
        findUpcoming: jest.fn(),
        now: () => now,
      }),
    ).rejects.toBeInstanceOf(BookingAccessDeniedError);
  });
});
