import type { Prisma } from '../../generated/prisma/client';

/**
 * Adds the Subscription a new Booking consumed to its command's response. A
 * Plan bought over a Guest Pass starts after its class (FIX-019), so the app
 * cannot read it from the Subscription in force today. Read after the command
 * commits, so an idempotent replay names it too.
 */
export const withBookedSubscription =
  <Args extends unknown[]>(
    prisma: Prisma.TransactionClient,
    handler: (...args: Args) => Promise<{ id: string }>,
  ) =>
  async (...args: Args): Promise<{ id: string; subscriptionId: string }> => {
    const created = await handler(...args);
    const { subscriptionId } = await prisma.booking.findUniqueOrThrow({
      where: { id: created.id },
      select: { subscriptionId: true },
    });
    return { ...created, subscriptionId };
  };
