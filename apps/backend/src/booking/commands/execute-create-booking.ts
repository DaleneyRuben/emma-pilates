import type { Prisma } from '../../generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { decideGuestPassBooking } from '../payments/guest-pass';
import { createBooking } from './create-booking';
import {
  findApprovedFreeze,
  findCoveringSubscription,
  findNotYetStartedSubscription,
} from './eligible-subscription';
import { fundBooking } from './weekly-cap-funding';
import { readWeeklyCapPosition } from './weekly-cap-count';
import { loadSession } from './waitlist-promotion';

export function executeCreate(
  transaction: Prisma.TransactionClient,
  command: { sessionId: string; clientId?: string },
  principal: AuthenticatedPrincipal,
  now: () => Date,
): Promise<{ id: string }> {
  return createBooking(command, {
    principal,
    loadSession: (sessionId) => loadSession(transaction, sessionId),
    countLiveBookings: (sessionId) =>
      transaction.booking.count({
        where: { sessionId, state: 'BOOKED' },
      }),
    findEligibleSubscription: ({ clientId, onDate }) =>
      findSubscriptionForBooking(transaction, {
        clientId,
        onDate,
        needsAllowance: true,
      }),
    findApprovedFreeze: ({ clientId, onDate }) =>
      findApprovedFreeze(transaction, { clientId, onDate }),
    findNotYetStartedSubscription: ({ clientId, onDate }) =>
      findNotYetStartedSubscription(transaction, { clientId, onDate }),
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
    create: async (input) => {
      const pass = await transaction.guestPass.findFirst({
        where: {
          friendClientId: input.clientId,
          bookingId: null,
          deletedAt: null,
        },
        select: { id: true, courtesySubscriptionId: true },
      });
      const session = await transaction.session.findUniqueOrThrow({
        where: { id: input.sessionId },
        select: { startsAt: true, capacity: true },
      });
      if (
        pass !== null &&
        pass.courtesySubscriptionId === input.subscriptionId
      ) {
        const taken = await transaction.booking.count({
          where: { sessionId: input.sessionId, state: 'BOOKED' },
        });
        const decision = decideGuestPassBooking({
          placesLeft: session.capacity - taken,
          guestPassesAlreadyUsed: 0,
        });
        if (decision !== null) throw new Error(decision.code);
      }

      const booking = await fundBooking(transaction, {
        subscriptionId: input.subscriptionId,
        clientId: input.clientId,
        authorAccountId: input.createdByAccountId,
        startsAt: session.startsAt,
        now: now(),
        createBooking: () =>
          transaction.booking.create({ data: input, select: { id: true } }),
      });
      if (booking === null) {
        const spent = await transaction.guestPass.findFirst({
          where: {
            friendClientId: input.clientId,
            bookingId: { not: null },
            deletedAt: null,
          },
          select: { id: true },
        });
        throw new Error(
          spent === null
            ? 'No eligible Subscription'
            : 'guest_pass_already_used',
        );
      }
      if (pass !== null) {
        await transaction.guestPass.update({
          where: { id: pass.id },
          data: { bookingId: booking.id },
        });
      }
      return booking;
    },
    now,
  });
}

async function findSubscriptionForBooking(
  transaction: Prisma.TransactionClient,
  input: { clientId: string; onDate: Date; needsAllowance: boolean },
) {
  const subscription = await findCoveringSubscription(transaction, input);
  if (subscription === null) return null;
  return {
    id: subscription.id,
    ...(await readWeeklyCapPosition(transaction, {
      subscriptionId: subscription.id,
      startsAt: input.onDate,
    })),
  };
}
