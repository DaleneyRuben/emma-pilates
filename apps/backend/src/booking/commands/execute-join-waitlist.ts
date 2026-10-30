import type { Prisma } from '../../generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { readCancellationWindowMinutes } from '../studio-settings/prisma-studio-settings';
import {
  findApprovedFreeze,
  findNotYetStartedSubscription,
} from './eligible-subscription';
import { joinWaitlist } from './join-waitlist';
import { findSubscriptionForBooking } from './subscription-for-booking';
import { loadSession } from './waitlist-promotion';

export function executeJoinWaitlist(
  transaction: Prisma.TransactionClient,
  command: { sessionId: string; clientId?: string },
  principal: AuthenticatedPrincipal,
  now: () => Date,
): Promise<{ id: string }> {
  return joinWaitlist(command, {
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
        needsAllowance: false,
      }),
    findApprovedFreeze: ({ clientId, onDate }) =>
      findApprovedFreeze(transaction, { clientId, onDate }),
    findNotYetStartedSubscription: ({ clientId, onDate }) =>
      findNotYetStartedSubscription(transaction, { clientId, onDate }),
    hasLiveBooking: ({ sessionId, clientId }) =>
      transaction.booking
        .findFirst({
          where: { sessionId, clientId, state: 'BOOKED' },
          select: { id: true },
        })
        .then((booking) => booking !== null),
    hasActiveEntry: ({ sessionId, clientId }) =>
      transaction.waitlistEntry
        .findFirst({
          where: { sessionId, clientId, closedAt: null },
          select: { id: true },
        })
        .then((entry) => entry !== null),
    create: (input) =>
      transaction.waitlistEntry.create({
        data: input,
        select: { id: true },
      }),
    now,
    cancellationWindowMinutes: () => readCancellationWindowMinutes(transaction),
  });
}
