import { createHash } from 'node:crypto';
import type { Prisma } from '../../generated/prisma/client';
import {
  BookingState,
  PrismaClient,
  WaitlistClosureReason,
} from '../../generated/prisma/client';
import {
  recordNotification as defaultNotificationRecorder,
  type NotificationRecorder,
} from '../../notifications/prisma-notification-store';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import {
  cancelSession,
  type SessionCancellationResult,
} from './cancel-session';
import { executeCancelBooking } from './execute-cancel-booking';
import { executeCreate as executeCreateBooking } from './execute-create-booking';
import { executeJoinWaitlist } from './execute-join-waitlist';
import { executeRecordAttendance } from './execute-record-attendance';
import { executeReschedule } from './execute-reschedule';
import { executeSessionCancellation } from './execute-session-cancellation';
import { leaveWaitlist } from './leave-waitlist';
import { promoteWaitlistInTransaction } from './waitlist-promotion';
import { retrySerializable } from '../../database/retry-serializable';

export class PrismaBookingCommands {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly now: () => Date,
    private readonly recordNotification: NotificationRecorder = defaultNotificationRecorder,
  ) {}

  async create(
    command: { sessionId: string; clientId?: string },
    principal: AuthenticatedPrincipal,
  ): Promise<{ id: string }> {
    const result = await retrySerializable(() =>
      this.prisma.$transaction(
        async (transaction) => {
          await this.executeWaitlistPromotion(transaction, command.sessionId);

          try {
            return await executeCreateBooking(
              transaction,
              command,
              principal,
              this.now,
            );
          } catch (error) {
            if (error instanceof Error && error.message === 'Session is full') {
              return null;
            }

            throw error;
          }
        },
        { isolationLevel: 'Serializable' },
      ),
    );

    if (result === null) {
      throw new Error('Session is full');
    }

    return result;
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

    const result = await retrySerializable(() =>
      this.prisma.$transaction(
        async (transaction) => {
          const existing = await transaction.idempotencyRecord.findFirst({
            where: {
              accountId: principal.accountId,
              command: 'create_booking',
              idempotencyKey,
              deletedAt: null,
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

          await this.executeWaitlistPromotion(transaction, command.sessionId);
          let created: { id: string };

          try {
            created = await executeCreateBooking(
              transaction,
              command,
              principal,
              this.now,
            );
          } catch (error) {
            if (error instanceof Error && error.message === 'Session is full') {
              return null;
            }

            throw error;
          }
          const createdAt = this.now();
          await transaction.idempotencyRecord.create({
            data: {
              accountId: principal.accountId,
              command: 'create_booking',
              idempotencyKey,
              requestHash,
              responseStatus: 201,
              responseBody: created,
              createdAt,
              expiresAt: new Date(createdAt.getTime() + 24 * 60 * 60 * 1_000),
            },
          });

          return created;
        },
        { isolationLevel: 'Serializable' },
      ),
    );

    if (result === null) {
      throw new Error('Session is full');
    }

    return result;
  }

  async joinWaitlist(
    command: { sessionId: string; clientId?: string },
    principal: AuthenticatedPrincipal,
  ): Promise<{ id: string }> {
    return retrySerializable(() =>
      this.prisma.$transaction(
        async (transaction) =>
          executeJoinWaitlist(transaction, command, principal, this.now),
        { isolationLevel: 'Serializable' },
      ),
    );
  }

  async cancelSession(
    command: { sessionId: string },
    principal: AuthenticatedPrincipal,
  ): Promise<SessionCancellationResult> {
    return retrySerializable(() =>
      this.prisma.$transaction(
        (transaction) =>
          cancelSession(command, {
            principal,
            loadSession: async (sessionId) => {
              const session = await transaction.session.findUnique({
                where: { id: sessionId },
                select: {
                  id: true,
                  branchId: true,
                  startsAt: true,
                  state: true,
                  _count: {
                    select: {
                      bookings: { where: { state: BookingState.BOOKED } },
                    },
                  },
                },
              });
              return session === null
                ? null
                : {
                    id: session.id,
                    branchId: session.branchId,
                    startsAt: session.startsAt,
                    state: session.state.toLowerCase() as
                      'scheduled' | 'cancelled',
                    liveBookingCount: session._count.bookings,
                  };
            },
            cancel: (input) =>
              executeSessionCancellation(transaction, input, {
                now: this.now,
                recordNotification: this.recordNotification,
              }),
            now: this.now,
          }),
        { isolationLevel: 'Serializable' },
      ),
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

    return retrySerializable(() =>
      this.prisma.$transaction(
        async (transaction) => {
          const existing = await transaction.idempotencyRecord.findFirst({
            where: {
              accountId: principal.accountId,
              command: 'join_waitlist',
              idempotencyKey,
              deletedAt: null,
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

          const result = await executeJoinWaitlist(
            transaction,
            command,
            principal,
            this.now,
          );
          const createdAt = this.now();
          await transaction.idempotencyRecord.create({
            data: {
              accountId: principal.accountId,
              command: 'join_waitlist',
              idempotencyKey,
              requestHash,
              responseStatus: 201,
              responseBody: result,
              createdAt,
              expiresAt: new Date(createdAt.getTime() + 24 * 60 * 60 * 1_000),
            },
          });

          return result;
        },
        { isolationLevel: 'Serializable' },
      ),
    );
  }

  async promoteWaitlist(
    sessionId: string,
  ): Promise<{ entryId: string; bookingId: string }[]> {
    return retrySerializable(() =>
      this.prisma.$transaction(
        async (transaction) =>
          this.executeWaitlistPromotion(transaction, sessionId),
        { isolationLevel: 'Serializable' },
      ),
    );
  }

  async cancel(
    command: { bookingId: string },
    principal: AuthenticatedPrincipal,
  ): Promise<void> {
    await retrySerializable(() =>
      this.prisma.$transaction(
        (transaction) =>
          executeCancelBooking(transaction, command, principal, {
            now: this.now,
            recordNotification: this.recordNotification,
          }),
        { isolationLevel: 'Serializable' },
      ),
    );
  }

  async reschedule(
    command: { bookingId: string; targetSessionId: string },
    principal: AuthenticatedPrincipal,
  ): Promise<{ id: string }> {
    return retrySerializable(() =>
      this.prisma.$transaction(
        async (transaction) => {
          await this.executeWaitlistPromotion(
            transaction,
            command.targetSessionId,
          );

          return executeReschedule(transaction, command, principal, this.now);
        },
        { isolationLevel: 'Serializable' },
      ),
    );
  }

  async recordAttendance(
    command: {
      sessionId: string;
      outcomes: { bookingId: string; outcome: 'attended' | 'no_show' }[];
    },
    principal: AuthenticatedPrincipal,
  ): Promise<void> {
    await this.prisma.$transaction((transaction) =>
      executeRecordAttendance(transaction, command, principal, this.now),
    );
  }

  private executeWaitlistPromotion(
    transaction: Prisma.TransactionClient,
    sessionId: string,
  ): Promise<{ entryId: string; bookingId: string }[]> {
    return promoteWaitlistInTransaction(transaction, sessionId, {
      now: this.now,
      recordNotification: this.recordNotification,
    });
  }

  async leaveWaitlist(
    command: { waitlistEntryId: string },
    principal: AuthenticatedPrincipal,
  ): Promise<void> {
    await leaveWaitlist(command, {
      principal,
      loadEntry: async (waitlistEntryId) => {
        const entry = await this.prisma.waitlistEntry.findUnique({
          where: { id: waitlistEntryId },
          select: {
            id: true,
            clientId: true,
            closedAt: true,
            session: {
              select: { id: true, branchId: true, startsAt: true, state: true },
            },
          },
        });

        return entry === null
          ? null
          : {
              ...entry,
              session: {
                ...entry.session,
                state: entry.session.state.toLowerCase() as
                  'scheduled' | 'cancelled',
              },
            };
      },
      close: async (input) => {
        const closed = await this.prisma.waitlistEntry.updateMany({
          where: { id: input.waitlistEntryId, closedAt: null },
          data: {
            closedAt: input.closedAt,
            closedByAccountId: input.closedByAccountId,
            closureReason: WaitlistClosureReason.LEFT,
          },
        });

        if (closed.count !== 1) {
          throw new Error('Waitlist Entry is not active');
        }
      },
      now: this.now,
    });
  }
}
