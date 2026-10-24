import { createBooking } from './create-booking';
import { bookingDuringFreezeMessage } from '../payments/freeze';

const session = {
  id: 'session-id',
  branchId: 'branch-id',
  startsAt: new Date('2026-11-05T15:00:00.000Z'),
  endsAt: new Date('2026-11-05T16:00:00.000Z'),
  capacity: 8,
  state: 'scheduled' as const,
};

describe('createBooking during a Freeze', () => {
  it('refuses a Session that falls inside an approved Freeze', async () => {
    const create = jest.fn();

    await expect(
      createBooking(
        { sessionId: session.id },
        {
          principal: {
            accountId: 'account-id',
            authenticationSessionId: 'authentication-session-id',
            identity: { kind: 'client', clientId: 'client-id' },
          },
          loadSession: jest.fn().mockResolvedValue(session),
          countLiveBookings: jest.fn().mockResolvedValue(0),
          findEligibleSubscription: jest.fn().mockResolvedValue({
            id: 'subscription-id',
          }),
          findApprovedFreeze: jest.fn().mockResolvedValue({
            endsOn: new Date('2026-11-10T00:00:00.000Z'),
          }),
          hasOverlappingBooking: jest.fn().mockResolvedValue(false),
          create,
          now: () => new Date('2026-10-23T15:00:00.000Z'),
        },
      ),
    ).rejects.toThrow(
      bookingDuringFreezeMessage(new Date('2026-11-10T00:00:00.000Z')),
    );
    expect(create).not.toHaveBeenCalled();
  });
});
