import { createHash } from 'node:crypto';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaClient } from '../../generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { createBooking } from './create-booking';
import { joinWaitlist } from './join-waitlist';

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
        this.executeCreate(transaction, command, principal),
      { isolationLevel: 'Serializable' },
    );
  }

  async createIdempotent(
    command: { sessionId: string; clientId?: string },
    principal: AuthenticatedPrincipal,
    idempotencyKey: string,
  ): Promise<{ id: string }> {
    const requestHash = createHash('sha256')
      .update(
        JSON.stringify({
          sessionId: command.sessionId,
          clientId: command.clientId ?? null,
        }),
      )
      .digest();

    return this.prisma.$transaction(
      async (transaction) => {
        const existing = await transaction.idempotencyRecord.findUnique({
          where: {
            accountId_command_idempotencyKey: {
              accountId: principal.accountId,
              command: 'create_booking',
              idempotencyKey,
            },
          },
          select: { requestHash: true, responseBody: true },
        });

        if (existing !== null) {
          if (!Buffer.from(existing.requestHash).equals(requestHash)) {
            throw new Error(
              'Idempotency Key was reused with a different request',
            );
          }

          if (
            typeof existing.responseBody === 'object' &&
            existing.responseBody !== null &&
            'id' in existing.responseBody &&
            typeof existing.responseBody.id === 'string'
          ) {
            return { id: existing.responseBody.id };
          }

          throw new Error('Stored idempotency response is invalid');
        }

        const result = await this.executeCreate(
          transaction,
          command,
          principal,
        );
        await transaction.idempotencyRecord.create({
          data: {
            accountId: principal.accountId,
            command: 'create_booking',
            idempotencyKey,
            requestHash,
            responseStatus: 201,
            responseBody: result,
            expiresAt: new Date(this.now().getTime() + 24 * 60 * 60 * 1_000),
          },
        });

        return result;
      },
      { isolationLevel: 'Serializable' },
    );
  }

  async joinWaitlist(
    command: { sessionId: string; clientId?: string },
    principal: AuthenticatedPrincipal,
  ): Promise<{ id: string }> {
    return this.prisma.$transaction(
      async (transaction) =>
        this.executeJoinWaitlist(transaction, command, principal),
      { isolationLevel: 'Serializable' },
    );
  }

  async joinWaitlistIdempotent(
    command: { sessionId: string; clientId?: string },
    principal: AuthenticatedPrincipal,
    idempotencyKey: string,
  ): Promise<{ id: string }> {
    const requestHash = createHash('sha256')
      .update(
        JSON.stringify({
          sessionId: command.sessionId,
          clientId: command.clientId ?? null,
        }),
      )
      .digest();

    return this.prisma.$transaction(
      async (transaction) => {
        const existing = await transaction.idempotencyRecord.findUnique({
          where: {
            accountId_command_idempotencyKey: {
              accountId: principal.accountId,
              command: 'join_waitlist',
              idempotencyKey,
            },
          },
          select: { requestHash: true, responseBody: true },
        });

        if (existing !== null) {
          if (!Buffer.from(existing.requestHash).equals(requestHash)) {
            throw new Error(
              'Idempotency Key was reused with a different request',
            );
          }

          if (
            typeof existing.responseBody === 'object' &&
            existing.responseBody !== null &&
            'id' in existing.responseBody &&
            typeof existing.responseBody.id === 'string'
          ) {
            return { id: existing.responseBody.id };
          }

          throw new Error('Stored idempotency response is invalid');
        }

        const result = await this.executeJoinWaitlist(
          transaction,
          command,
          principal,
        );
        await transaction.idempotencyRecord.create({
          data: {
            accountId: principal.accountId,
            command: 'join_waitlist',
            idempotencyKey,
            requestHash,
            responseStatus: 201,
            responseBody: result,
            expiresAt: new Date(this.now().getTime() + 24 * 60 * 60 * 1_000),
          },
        });

        return result;
      },
      { isolationLevel: 'Serializable' },
    );
  }

  private executeJoinWaitlist(
    transaction: Prisma.TransactionClient,
    command: { sessionId: string; clientId?: string },
    principal: AuthenticatedPrincipal,
  ): Promise<{ id: string }> {
    return joinWaitlist(command, {
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
          },
          select: { id: true },
        }),
      hasLiveBooking: ({ sessionId, clientId }) =>
        transaction.booking
          .findFirst({
            where: { sessionId, clientId, state: 'BOOKED' },
            select: { id: true },
          })
          .then((booking) => booking !== null),
      create: (input) =>
        transaction.waitlistEntry.create({
          data: input,
          select: { id: true },
        }),
      now: this.now,
    });
  }

  private executeCreate(
    transaction: Prisma.TransactionClient,
    command: { sessionId: string; clientId?: string },
    principal: AuthenticatedPrincipal,
  ): Promise<{ id: string }> {
    return createBooking(command, {
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
    });
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
