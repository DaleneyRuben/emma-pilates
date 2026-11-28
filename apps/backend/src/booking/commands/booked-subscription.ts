import type { Prisma } from '../../generated/prisma/client';

/**
 * Adds the Subscription a new Booking consumed to its command's response. A
 * Plan bought over a Guest Pass starts after its class (FIX-019), so the app
 * cannot read it from the Subscription in force today. Read after the command
 * commits, so an idempotent replay names it too. The Booking is committed by
 * then, so a failed read leaves the id out rather than answering 500: the app
 * then words its toast from today's Subscription, as 1.3.0 did.
 */
export const withBookedSubscription =
  <Args extends unknown[]>(
    prisma: Prisma.TransactionClient,
    handler: (...args: Args) => Promise<{ id: string }>,
  ) =>
  async (...args: Args): Promise<{ id: string; subscriptionId?: string }> => {
    const created = await handler(...args);
    try {
      const { subscriptionId } = await prisma.booking.findUniqueOrThrow({
        where: { id: created.id },
        select: { subscriptionId: true },
      });
      return { ...created, subscriptionId };
    } catch {
      return created;
    }
  };
