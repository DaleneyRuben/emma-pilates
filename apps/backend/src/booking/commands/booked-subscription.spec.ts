import type { Prisma } from '../../generated/prisma/client';
import { withBookedSubscription } from './booked-subscription';

const prismaReading = (
  findUniqueOrThrow: () => Promise<{ subscriptionId: string }>,
) =>
  ({ booking: { findUniqueOrThrow } }) as unknown as Prisma.TransactionClient;

describe('withBookedSubscription', () => {
  it('adds the Subscription the Booking consumed', async () => {
    const create = withBookedSubscription(
      prismaReading(() => Promise.resolve({ subscriptionId: 'plan-1' })),
      () => Promise.resolve({ id: 'booking-1' }),
    );

    await expect(create()).resolves.toEqual({
      id: 'booking-1',
      subscriptionId: 'plan-1',
    });
  });

  // Review of the FIX-019 toasts: the Booking is already committed, so a
  // failed read must not answer 500 for a class she has booked. Without the
  // id the app words the toast from today's Subscription, as 1.3.0 did.
  it('still answers the committed Booking when the read fails', async () => {
    const create = withBookedSubscription(
      prismaReading(() => Promise.reject(new Error('connection lost'))),
      () => Promise.resolve({ id: 'booking-1' }),
    );

    await expect(create()).resolves.toEqual({ id: 'booking-1' });
  });

  it('lets the command’s own refusal through', async () => {
    const read = jest.fn();
    const create = withBookedSubscription(prismaReading(read), () =>
      Promise.reject(new Error('Session is full')),
    );

    await expect(create()).rejects.toThrow('Session is full');
    expect(read).not.toHaveBeenCalled();
  });
});
