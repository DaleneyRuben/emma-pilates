import { createHash } from 'node:crypto';
import type { Prisma } from '../../generated/prisma/client';
import {
  BookingCancellationCause,
  BookingState,
  AttendanceOutcome,
  PrismaClient,
  WaitlistClosureReason,
} from '../../generated/prisma/client';
import {
  recordNotification as defaultNotificationRecorder,
  type NotificationRecorder,
} from '../../notifications/prisma-notification-store';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { boliviaDate } from '../bolivia-time';
import { createBooking } from './create-booking';
import { cancelBooking } from './cancel-booking';
import { joinWaitlist } from './join-waitlist';
import { leaveWaitlist } from './leave-waitlist';
import { promoteWaitlist } from './promote-waitlist';
import { rescheduleBooking } from './reschedule-booking';
import { recordAttendance } from './record-attendance';
import { retrySerializable } from './retry-serializable';

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
          await transaction.idempotencyRecord.create({
            data: {
              accountId: principal.accountId,
              command: 'create_booking',
              idempotencyKey,
              requestHash,
              responseStatus: 201,
              responseBody: created,
              expiresAt: new Date(this.now().getTime() + 24 * 60 * 60 * 1_000),
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
    return promoteWaitlist(
      { sessionId },
      {
        loadSession: (id) => this.loadSession(transaction, id),
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
        createBooking: async (input) => {
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
            await this.recordNotification(transaction, {
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
        now: this.now,
      },
    );
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
