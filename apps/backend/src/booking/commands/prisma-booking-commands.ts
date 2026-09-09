import type { Prisma } from '../../generated/prisma/client';
import { PrismaClient } from '../../generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { createBooking } from './create-booking';

const boliviaDate = (instant: Date): Date => {
  const fields = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/La_Paz',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .formatToParts(instant)
    .reduce<Record<string, string>>((result, part) => {
      result[part.type] = part.value;
      return result;
    }, {});

  return new Date(
    Date.UTC(Number(fields.year), Number(fields.month) - 1, Number(fields.day)),
  );
};

export class PrismaBookingCommands {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly now: () => Date,
  ) {}

  async create(
    command: { sessionId: string; clientId?: string },
    principal: AuthenticatedPrincipal,
  ): Promise<{ id: string }> {
    return this.prisma.$transaction(
      async (transaction) =>
        createBooking(command, {
          principal,
          loadSession: (sessionId) => this.loadSession(transaction, sessionId),
          countLiveBookings: (sessionId) =>
            transaction.booking.count({
              where: { sessionId, state: 'BOOKED' },
            }),
          findEligibleSubscription: ({ clientId, onDate }) =>
            transaction.subscription.findFirst({
              where: {
                clientId,
                state: 'ACTIVE',
                startsOn: { lte: boliviaDate(onDate) },
                endsOn: { gte: boliviaDate(onDate) },
                remainingClassAllowance: { gt: 0 },
              },
              select: { id: true },
            }),
          create: async (input) => {
            const consumed = await transaction.subscription.updateMany({
              where: {
                id: input.subscriptionId,
                clientId: input.clientId,
                remainingClassAllowance: { gt: 0 },
              },
              data: { remainingClassAllowance: { decrement: 1 } },
            });

            if (consumed.count !== 1) {
              throw new Error('No eligible Subscription');
            }

            return transaction.booking.create({
              data: input,
              select: { id: true },
            });
          },
          now: this.now,
        }),
      { isolationLevel: 'Serializable' },
    );
  }

  private async loadSession(
    transaction: Prisma.TransactionClient,
    sessionId: string,
  ) {
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
  }
}
