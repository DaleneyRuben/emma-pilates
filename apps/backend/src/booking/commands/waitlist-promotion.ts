import type { Prisma } from '../../generated/prisma/client';
import { WaitlistClosureReason } from '../../generated/prisma/client';
import type { NotificationRecorder } from '../../notifications/prisma-notification-store';
import { promoteWaitlist } from './promote-waitlist';
import { findCoveringSubscription } from './eligible-subscription';
import { fundBooking } from './weekly-cap-funding';
import { readWeeklyCapPosition } from './weekly-cap-count';
import { readCancellationWindowMinutes } from '../studio-settings/prisma-studio-settings';

export type WaitlistPromotionDependencies = {
  now: () => Date;
  recordNotification: NotificationRecorder;
};

export const loadSession = async (
  transaction: Prisma.TransactionClient,
  sessionId: string,
) => {
  const session = await transaction.session.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      branchId: true,
      startsAt: true,
      endsAt: true,
      capacity: true,
      state: true,
    },
  });

  return session === null
    ? null
    : {
        ...session,
        state: session.state.toLowerCase() as 'scheduled' | 'cancelled',
      };
};

// Promotes the oldest eligible Waitlist entries into a Session's free seats,
// inside the caller's Serializable transaction.
export const promoteWaitlistInTransaction = (
  transaction: Prisma.TransactionClient,
  sessionId: string,
  { now, recordNotification }: WaitlistPromotionDependencies,
): Promise<{ entryId: string; bookingId: string }[]> => {
  return promoteWaitlist(
    { sessionId },
    {
      loadSession: (id) => loadSession(transaction, id),
      countLiveBookings: (id) =>
        transaction.booking.count({
          where: { sessionId: id, state: 'BOOKED' },
        }),
      loadActiveEntries: (id) =>
        transaction.waitlistEntry.findMany({
          where: { sessionId: id, closedAt: null },
          select: {
            id: true,
            clientId: true,
            joinedByAccountId: true,
          },
          orderBy: [{ joinedAt: 'asc' }, { id: 'asc' }],
        }),
      findEligibleSubscription: async ({ clientId, onDate }) => {
        const subscription = await findCoveringSubscription(transaction, {
          clientId,
          onDate,
          needsAllowance: true,
        });
        if (subscription === null) return null;
        return {
          id: subscription.id,
          ...(await readWeeklyCapPosition(transaction, {
            subscriptionId: subscription.id,
            startsAt: onDate,
          })),
        };
      },
      hasOverlappingBooking: ({ clientId, startsAt, endsAt }) =>
        transaction.booking
          .findFirst({
            where: {
              clientId,
              state: 'BOOKED',
              session: {
                startsAt: { lt: endsAt },
                endsAt: { gt: startsAt },
              },
            },
            select: { id: true },
          })
          .then((booking) => booking !== null),
      createBooking: async (input) => {
        const session = await transaction.session.findUniqueOrThrow({
          where: { id: input.sessionId },
          select: { startsAt: true },
        });
        const booking = await fundBooking(transaction, {
          subscriptionId: input.subscriptionId,
          clientId: input.clientId,
          authorAccountId: input.createdByAccountId,
          startsAt: session.startsAt,
          now: now(),
          createBooking: () =>
            transaction.booking.create({ data: input, select: { id: true } }),
        });
        if (booking === null) throw new Error('No eligible Subscription');
        return booking;
      },
      closeAsPromoted: async ({ entryId, bookingId }) => {
        const closedAt = new Date();
        await transaction.waitlistEntry.update({
          where: { id: entryId },
          data: {
            closedAt,
            closureReason: WaitlistClosureReason.PROMOTED,
            promotedBookingId: bookingId,
          },
        });
        const promoted = await transaction.booking.findUniqueOrThrow({
          where: { id: bookingId },
          select: {
            client: { select: { account: { select: { id: true } } } },
            session: { select: { classType: { select: { name: true } } } },
          },
        });
        if (promoted.client.account !== null) {
          await recordNotification(transaction, {
            accountId: promoted.client.account.id,
            category: 'booking_schedule',
            type: 'waitlist_promoted',
            businessEventKey: `waitlist-promoted:${entryId}`,
            title: 'Cupo liberado',
            message: `¡Tienes un cupo! Te promovimos de la lista de espera para tu clase de ${promoted.session.classType.name}.`,
            destination: { type: 'booking', id: bookingId },
            occurredAt: closedAt,
          });
        }
      },
      cancellationWindowMinutes: () =>
        readCancellationWindowMinutes(transaction),
      now,
    },
  );
};
