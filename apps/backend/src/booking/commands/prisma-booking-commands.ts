import { createHash } from 'node:crypto';
import type { Prisma } from '../../generated/prisma/client';
import {
  AuditActorKind,
  AuditOutcome,
  BookingCancellationCause,
  BookingState,
  AttendanceOutcome,
  PrismaClient,
  SessionCancellationCause,
  SessionState,
  StaffRole,
  WaitlistClosureReason,
} from '../../generated/prisma/client';
import {
  recordNotification as defaultNotificationRecorder,
  type NotificationRecorder,
} from '../../notifications/prisma-notification-store';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { boliviaDate } from '../../time/bolivia-time';
import { createBooking } from './create-booking';
import { cancelBooking } from './cancel-booking';
import {
  cancelSession,
  type SessionCancellationResult,
} from './cancel-session';
import { joinWaitlist } from './join-waitlist';
import { leaveWaitlist } from './leave-waitlist';
import {
  loadSession,
  promoteWaitlistInTransaction,
} from './waitlist-promotion';
import { rescheduleBooking } from './reschedule-booking';
import { recordAttendance } from './record-attendance';
import { readCancellationWindowMinutes } from '../studio-settings/prisma-studio-settings';
import { consumeOneClass } from './consume-allowance';
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
            return await this.executeCreate(transaction, command, principal);
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
            created = await this.executeCreate(transaction, command, principal);
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
          this.executeJoinWaitlist(transaction, command, principal),
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
              this.executeSessionCancellation(transaction, input, principal),
            now: this.now,
          }),
        { isolationLevel: 'Serializable' },
      ),
    );
  }

  // Cancels every live Booking as session_cancelled, refunds one unit to each
  // Subscription, closes the active waitlist, audits, and notifies the booked
  // and queued Clients plus the assigned Trainer.
  private async executeSessionCancellation(
    transaction: Prisma.TransactionClient,
    input: { sessionId: string; cancelledByAccountId: string },
    principal: AuthenticatedPrincipal,
  ): Promise<SessionCancellationResult> {
    const now = this.now();
    const session = await transaction.session.findUniqueOrThrow({
      where: { id: input.sessionId },
      select: {
        id: true,
        branchId: true,
        classType: { select: { name: true } },
        trainer: { select: { account: { select: { id: true } } } },
        bookings: {
          where: { state: BookingState.BOOKED },
          select: {
            id: true,
            subscriptionId: true,
            client: { select: { account: { select: { id: true } } } },
          },
        },
        waitlistEntries: {
          where: { closedAt: null },
          select: {
            id: true,
            client: { select: { account: { select: { id: true } } } },
          },
        },
      },
    });

    const cancelled = await transaction.session.updateMany({
      where: { id: session.id, state: SessionState.SCHEDULED },
      data: {
        state: SessionState.CANCELLED,
        cancellationCause: SessionCancellationCause.NO_SUBSTITUTE_TRAINER,
        cancelledAt: now,
        cancelledByAccountId: input.cancelledByAccountId,
      },
    });
    if (cancelled.count !== 1) {
      throw new Error('Session is not cancellable');
    }

    const notify = (accountId: string, message: string) =>
      this.recordNotification(transaction, {
        accountId,
        category: 'booking_schedule',
        type: 'session_cancelled',
        businessEventKey: `session-cancelled:${session.id}`,
        title: 'Clase cancelada',
        message,
        destination: { type: 'session', id: session.id },
        occurredAt: now,
      });

    for (const booking of session.bookings) {
      await transaction.booking.update({
        where: { id: booking.id },
        data: {
          state: BookingState.CANCELLED,
          cancelledAt: now,
          cancelledByAccountId: input.cancelledByAccountId,
          cancellationCause: BookingCancellationCause.SESSION_CANCELLED,
        },
      });
      await transaction.subscription.update({
        where: { id: booking.subscriptionId },
        data: { remainingClassAllowance: { increment: 1 } },
      });
      if (booking.client.account !== null) {
        await notify(
          booking.client.account.id,
          `Tu clase de ${session.classType.name} fue cancelada. Tu clase fue reembolsada a tu plan.`,
        );
      }
    }

    await transaction.waitlistEntry.updateMany({
      where: { sessionId: session.id, closedAt: null },
      data: {
        closedAt: now,
        closureReason: WaitlistClosureReason.SESSION_CANCELLED,
      },
    });
    for (const entry of session.waitlistEntries) {
      if (entry.client.account !== null) {
        await notify(
          entry.client.account.id,
          `La clase de ${session.classType.name} a la que estabas en lista de espera fue cancelada.`,
        );
      }
    }
    if (session.trainer.account !== null) {
      await notify(
        session.trainer.account.id,
        `Tu clase de ${session.classType.name} fue cancelada por administración.`,
      );
    }

    await transaction.auditRecord.create({
      data: {
        actionCode: 'session.cancelled',
        outcome: AuditOutcome.SUCCEEDED,
        actorKind: AuditActorKind.ACCOUNT,
        actorAccountId: input.cancelledByAccountId,
        actorRole:
          principal.identity.kind === 'staff'
            ? (principal.identity.role.toUpperCase() as StaffRole)
            : null,
        targetType: 'session',
        targetId: session.id,
        branchId: session.branchId,
        correlationId: session.id,
        occurredAt: now,
        metadata: {
          cause: 'no_substitute_trainer',
          cancelledBookings: session.bookings.length,
          closedWaitlistEntries: session.waitlistEntries.length,
        },
      },
    });

    return { affectedBookings: session.bookings.length };
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

          const result = await this.executeJoinWaitlist(
            transaction,
            command,
            principal,
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
        async (transaction) => {
          await cancelBooking(command, {
            principal,
            loadBooking: async (bookingId) => {
              const booking = await transaction.booking.findUnique({
                where: { id: bookingId },
                select: {
                  id: true,
                  clientId: true,
                  subscriptionId: true,
                  state: true,
                  session: {
                    select: {
                      id: true,
                      branchId: true,
                      startsAt: true,
                      state: true,
                    },
                  },
                },
              });

              return booking === null
                ? null
                : {
                    ...booking,
                    state: booking.state.toLowerCase() as
                      'booked' | 'cancelled' | 'rescheduled',
                    session: {
                      ...booking.session,
                      state: booking.session.state.toLowerCase() as
                        'scheduled' | 'cancelled',
                    },
                  };
            },
            cancel: async (input) => {
              const cancelled = await transaction.booking.updateMany({
                where: { id: input.bookingId, state: BookingState.BOOKED },
                data: {
                  state: BookingState.CANCELLED,
                  cancelledAt: new Date(),
                  cancelledByAccountId: input.cancelledByAccountId,
                  cancellationCause: BookingCancellationCause.CLIENT_REQUEST,
                },
              });

              if (cancelled.count !== 1) {
                throw new Error('Booking is not cancellable');
              }

              const restored = await transaction.subscription.updateMany({
                where: {
                  id: input.subscriptionId,
                  clientId: input.clientId,
                },
                data: { remainingClassAllowance: { increment: 1 } },
              });

              if (restored.count !== 1) {
                throw new Error('Booking Subscription is unavailable');
              }

              const cancelledBooking =
                await transaction.booking.findUniqueOrThrow({
                  where: { id: input.bookingId },
                  select: { sessionId: true },
                });
              await this.executeWaitlistPromotion(
                transaction,
                cancelledBooking.sessionId,
              );
            },
            now: this.now,
            cancellationWindowMinutes: () =>
              readCancellationWindowMinutes(transaction),
          });
        },
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

          return rescheduleBooking(command, {
            principal,
            loadBooking: async (bookingId) => {
              const booking = await transaction.booking.findUnique({
                where: { id: bookingId },
                select: {
                  id: true,
                  clientId: true,
                  subscriptionId: true,
                  state: true,
                  session: {
                    select: {
                      id: true,
                      branchId: true,
                      startsAt: true,
                      state: true,
                    },
                  },
                },
              });

              return booking === null
                ? null
                : {
                    ...booking,
                    state: booking.state.toLowerCase() as
                      'booked' | 'cancelled' | 'rescheduled',
                    session: {
                      ...booking.session,
                      state: booking.session.state.toLowerCase() as
                        'scheduled' | 'cancelled',
                    },
                  };
            },
            loadSession: (sessionId) =>
              this.loadSession(transaction, sessionId),
            countLiveBookings: (sessionId) =>
              transaction.booking.count({
                where: { sessionId, state: BookingState.BOOKED },
              }),
            hasOverlappingBooking: ({ clientId, startsAt, endsAt }) =>
              transaction.booking
                .findFirst({
                  where: {
                    clientId,
                    state: BookingState.BOOKED,
                    session: {
                      startsAt: { lt: endsAt },
                      endsAt: { gt: startsAt },
                    },
                  },
                  select: { id: true },
                })
                .then((booking) => booking !== null),
            reschedule: async (input) => {
              const replacement = await transaction.booking.create({
                data: {
                  sessionId: input.targetSessionId,
                  clientId: input.clientId,
                  subscriptionId: input.subscriptionId,
                  createdByAccountId: input.rescheduledByAccountId,
                },
                select: { id: true },
              });

              const updated = await transaction.booking.updateMany({
                where: { id: input.bookingId, state: BookingState.BOOKED },
                data: {
                  state: BookingState.RESCHEDULED,
                  rescheduledAt: new Date(),
                  rescheduledByAccountId: input.rescheduledByAccountId,
                  rescheduledToBookingId: replacement.id,
                },
              });

              if (updated.count !== 1) {
                throw new Error('Booking is not reschedulable');
              }

              return replacement;
            },
            now: this.now,
            cancellationWindowMinutes: () =>
              readCancellationWindowMinutes(transaction),
          });
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
    await this.prisma.$transaction(async (transaction) =>
      recordAttendance(command, {
        principal,
        loadSession: async (sessionId) => {
          const session = await transaction.session.findUnique({
            where: { id: sessionId },
            select: {
              id: true,
              trainerStaffMemberId: true,
              endsAt: true,
              state: true,
            },
          });
          return session === null
            ? null
            : {
                ...session,
                state: session.state.toLowerCase() as 'scheduled' | 'cancelled',
              };
        },
        loadBookedIds: async (sessionId) =>
          (
            await transaction.booking.findMany({
              where: { sessionId, state: BookingState.BOOKED },
              select: { id: true },
            })
          ).map(({ id }) => id),
        save: async ({ outcomes, recordedByAccountId }) => {
          await Promise.all(
            outcomes.map(({ bookingId, outcome }) =>
              transaction.attendanceRecord.upsert({
                where: { bookingId },
                create: {
                  bookingId,
                  outcome:
                    outcome === 'attended'
                      ? AttendanceOutcome.ATTENDED
                      : AttendanceOutcome.NO_SHOW,
                  recordedByAccountId,
                  recordedAt: new Date(),
                },
                update: {
                  outcome:
                    outcome === 'attended'
                      ? AttendanceOutcome.ATTENDED
                      : AttendanceOutcome.NO_SHOW,
                  recordedByAccountId,
                },
              }),
            ),
          );
        },
        now: this.now,
      }),
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
      now: this.now,
      cancellationWindowMinutes: () =>
        readCancellationWindowMinutes(transaction),
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
            OR: [
              { remainingClassAllowance: { gt: 0 } },
              {
                allowanceAdjustments: {
                  some: { deletedAt: null, classes: { gt: 0 } },
                },
              },
            ],
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
        const consumed = await consumeOneClass(transaction, {
          subscriptionId: input.subscriptionId,
          clientId: input.clientId,
          authorAccountId: input.createdByAccountId,
          now: this.now(),
        });

        if (!consumed) {
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

  private loadSession(
    transaction: Prisma.TransactionClient,
    sessionId: string,
  ) {
    return loadSession(transaction, sessionId);
  }
}
