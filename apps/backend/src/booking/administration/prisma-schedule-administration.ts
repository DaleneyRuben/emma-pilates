import { randomUUID } from 'node:crypto';
import { retrySerializable } from '../../database/retry-serializable';
import {
  AuditActorKind,
  AuditOutcome,
  BookingState,
  SessionCancellationCause,
  SessionState,
  StaffRole,
} from '../../generated/prisma/enums';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import {
  recordNotification as defaultNotificationRecorder,
  type NotificationRecorder,
} from '../../notifications/prisma-notification-store';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { boliviaDate, boliviaInstant } from '../../time/bolivia-time';
import { formatEvaluationMoment } from '../evaluations/evaluation-notifications';
import { materializeSchedule } from '../sessions/prisma-session-materializer';
import {
  AdministrationError,
  databaseCause,
  requireAdministrator,
  type AdministratorActor,
} from './administration-errors';

type Transaction = Prisma.TransactionClient;

export type ScheduleInput = {
  branchId: string;
  classTypeId: string;
  trainerStaffMemberId: string;
  weekday: number;
  startsAtLocal: string;
  capacity: number;
};

const serializable = { isolationLevel: 'Serializable' } as const;
const minuteMs = 60 * 1_000;

const scheduleSelect = {
  id: true,
  branchId: true,
  classTypeId: true,
  trainerStaffMemberId: true,
  weekday: true,
  startsAtLocal: true,
  capacity: true,
  effectiveFrom: true,
  effectiveUntil: true,
  classType: { select: { durationMinutes: true, name: true } },
} satisfies Prisma.SessionScheduleSelect;

const sessionSelect = {
  id: true,
  sessionScheduleId: true,
  branchId: true,
  classTypeId: true,
  trainerStaffMemberId: true,
  startsAt: true,
  endsAt: true,
  capacity: true,
  state: true,
  isException: true,
} satisfies Prisma.SessionSelect;

const wallClock = (localTime: string): Date => {
  const match = /^(\d{2}):(\d{2})$/.exec(localTime);
  const hours = Number(match?.[1]);
  const minutes = Number(match?.[2]);
  if (match === null || hours > 23 || minutes > 59) {
    throw new AdministrationError('invalid_schedule');
  }
  return new Date(Date.UTC(1970, 0, 1, hours, minutes));
};

// Overlaps with another scheduled Session surface as exclusion violations.
const translate = (error: unknown): never => {
  const cause = databaseCause(error);
  if (
    cause.includes('sessions_branch_no_overlap') ||
    cause.includes('sessions_trainer_no_overlap')
  ) {
    throw new AdministrationError('session_overlap');
  }
  if (cause.includes('violates check constraint')) {
    throw new AdministrationError('invalid_schedule');
  }
  throw error;
};

// ADM-001 slices B and C: weekly Session Schedules with effective dates and
// single-Session exceptions for the admin web (ADR-0059, follow-up 39 §1).
export const createPrismaScheduleAdministration = (
  prisma: PrismaClient,
  dependencies: { now: () => Date; recordNotification?: NotificationRecorder },
) => {
  const record = dependencies.recordNotification ?? defaultNotificationRecorder;

  const transact = <Result>(
    work: (transaction: Transaction) => Promise<Result>,
  ): Promise<Result> =>
    retrySerializable(() => prisma.$transaction(work, serializable)).catch(
      translate,
    );

  // BKM-001: an active Branch and Class Type, and a Trainer assigned there.
  const requireAssignable = async (
    transaction: Transaction,
    input: {
      branchId: string;
      classTypeId: string;
      trainerStaffMemberId: string;
    },
  ) => {
    const [branch, classType, trainer] = await Promise.all([
      transaction.branch.findUnique({
        where: { id: input.branchId },
        select: { archivedAt: true },
      }),
      transaction.classType.findUnique({
        where: { id: input.classTypeId },
        select: { archivedAt: true, durationMinutes: true, name: true },
      }),
      transaction.staffMember.findUnique({
        where: { id: input.trainerStaffMemberId },
        select: {
          role: true,
          account: { select: { disabledAt: true } },
          branchAssignments: {
            where: { branchId: input.branchId },
            select: { branchId: true },
          },
        },
      }),
    ]);
    if (branch === null || branch.archivedAt !== null) {
      throw new AdministrationError('branch_not_found');
    }
    if (classType === null || classType.archivedAt !== null) {
      throw new AdministrationError('class_type_not_found');
    }
    if (
      trainer === null ||
      trainer.role !== StaffRole.TRAINER ||
      trainer.account?.disabledAt != null ||
      trainer.branchAssignments.length === 0
    ) {
      throw new AdministrationError('trainer_not_assignable');
    }
    return classType;
  };

  const requireScheduleValues = (input: ScheduleInput) => {
    if (input.weekday < 1 || input.weekday > 7 || input.capacity < 1) {
      throw new AdministrationError('invalid_schedule');
    }
  };

  // Cancels the schedule's unbooked, non-exception Sessions on or after the
  // date that have not started; booked ones and exceptions stay (ADR-0059).
  const withdrawFrom = async (
    transaction: Transaction,
    sessionScheduleId: string,
    from: Date,
    actor: AdministratorActor,
    now: Date,
  ): Promise<{ cancelledSessions: number; keptSessions: number }> => {
    const sessions = await transaction.session.findMany({
      where: {
        sessionScheduleId,
        state: SessionState.SCHEDULED,
        startsAt: { gte: boliviaInstant(from, 0), gt: now },
      },
      select: {
        id: true,
        isException: true,
        _count: {
          select: {
            bookings: { where: { state: BookingState.BOOKED } },
            waitlistEntries: { where: { closedAt: null } },
          },
        },
      },
    });
    const unbooked = sessions.filter(
      (session) =>
        !session.isException &&
        session._count.bookings === 0 &&
        session._count.waitlistEntries === 0,
    );
    if (unbooked.length > 0) {
      await transaction.session.updateMany({
        where: { id: { in: unbooked.map(({ id }) => id) } },
        data: {
          state: SessionState.CANCELLED,
          cancellationCause: SessionCancellationCause.SCHEDULE_CHANGED,
          cancelledAt: now,
          cancelledByAccountId: actor.accountId,
        },
      });
    }
    return {
      cancelledSessions: unbooked.length,
      keptSessions: sessions.length - unbooked.length,
    };
  };

  const createAndMaterialize = async (
    transaction: Transaction,
    input: ScheduleInput & { effectiveFrom: Date; effectiveUntil: Date | null },
    now: Date,
  ) => {
    const schedule = await transaction.sessionSchedule.create({
      data: {
        branchId: input.branchId,
        classTypeId: input.classTypeId,
        trainerStaffMemberId: input.trainerStaffMemberId,
        weekday: input.weekday,
        startsAtLocal: wallClock(input.startsAtLocal),
        capacity: input.capacity,
        effectiveFrom: input.effectiveFrom,
        effectiveUntil: input.effectiveUntil,
      },
      select: scheduleSelect,
    });
    const counts = await materializeSchedule(transaction, schedule, {
      today: boliviaDate(now),
      now,
    });
    return { schedule, ...counts };
  };

  const findSchedule = async (transaction: Transaction, id: string) => {
    const schedule = await transaction.sessionSchedule.findUnique({
      where: { id },
      select: scheduleSelect,
    });
    if (schedule === null) {
      throw new AdministrationError('session_schedule_not_found');
    }
    return schedule;
  };

  // A change takes effect today or later, inside the schedule's current range.
  const requireChangeDate = (
    schedule: { effectiveFrom: Date; effectiveUntil: Date | null },
    date: Date,
    today: Date,
  ) => {
    if (
      date < today ||
      date <= schedule.effectiveFrom ||
      (schedule.effectiveUntil !== null && date >= schedule.effectiveUntil)
    ) {
      throw new AdministrationError('effective_date_invalid');
    }
  };

  return {
    listSchedules: async (
      input: { branchId?: string },
      principal: AuthenticatedPrincipal,
    ) => {
      requireAdministrator(principal);
      const today = boliviaDate(dependencies.now());
      return prisma.sessionSchedule.findMany({
        where: {
          ...(input.branchId === undefined ? {} : { branchId: input.branchId }),
          OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: today } }],
        },
        orderBy: [{ weekday: 'asc' }, { startsAtLocal: 'asc' }, { id: 'asc' }],
        select: {
          ...scheduleSelect,
          trainer: { select: { name: true } },
          branch: { select: { name: true } },
        },
      });
    },

    createSchedule: async (
      input: ScheduleInput & { effectiveFrom: Date },
      principal: AuthenticatedPrincipal,
    ) => {
      requireAdministrator(principal);
      requireScheduleValues(input);
      const now = dependencies.now();
      if (input.effectiveFrom < boliviaDate(now)) {
        throw new AdministrationError('effective_date_invalid');
      }
      return transact(async (transaction) => {
        await requireAssignable(transaction, input);
        return createAndMaterialize(
          transaction,
          { ...input, effectiveUntil: null },
          now,
        );
      });
    },

    replaceSchedule: async (
      input: ScheduleInput & { sessionScheduleId: string; effectiveFrom: Date },
      principal: AuthenticatedPrincipal,
    ) => {
      const actor = requireAdministrator(principal);
      requireScheduleValues(input);
      const now = dependencies.now();
      return transact(async (transaction) => {
        const old = await findSchedule(transaction, input.sessionScheduleId);
        requireChangeDate(old, input.effectiveFrom, boliviaDate(now));
        await requireAssignable(transaction, input);
        const ended = await transaction.sessionSchedule.update({
          where: { id: old.id },
          data: { effectiveUntil: input.effectiveFrom },
          select: scheduleSelect,
        });
        const withdrawn = await withdrawFrom(
          transaction,
          old.id,
          input.effectiveFrom,
          actor,
          now,
        );
        const created = await createAndMaterialize(
          transaction,
          { ...input, effectiveUntil: old.effectiveUntil },
          now,
        );
        return {
          ended,
          replacement: created.schedule,
          ...withdrawn,
          created: created.created,
          skipped: created.skipped,
        };
      });
    },

    endSchedule: async (
      input: { sessionScheduleId: string; effectiveFrom: Date },
      principal: AuthenticatedPrincipal,
    ) => {
      const actor = requireAdministrator(principal);
      const now = dependencies.now();
      return transact(async (transaction) => {
        const old = await findSchedule(transaction, input.sessionScheduleId);
        requireChangeDate(old, input.effectiveFrom, boliviaDate(now));
        const schedule = await transaction.sessionSchedule.update({
          where: { id: old.id },
          data: { effectiveUntil: input.effectiveFrom },
          select: scheduleSelect,
        });
        return {
          schedule,
          ...(await withdrawFrom(
            transaction,
            old.id,
            input.effectiveFrom,
            actor,
            now,
          )),
        };
      });
    },

    // Una sola vez (follow-up 39 §1): a one-off exception Session.
    createSession: async (
      input: {
        branchId: string;
        classTypeId: string;
        trainerStaffMemberId: string;
        startsAt: Date;
        capacity?: number;
      },
      principal: AuthenticatedPrincipal,
    ) => {
      requireAdministrator(principal);
      const now = dependencies.now();
      if (input.startsAt <= now) {
        throw new AdministrationError('effective_date_invalid');
      }
      return transact(async (transaction) => {
        const classType = await requireAssignable(transaction, input);
        const defaults = await transaction.classType.findUniqueOrThrow({
          where: { id: input.classTypeId },
          select: { defaultCapacity: true },
        });
        const capacity = input.capacity ?? defaults.defaultCapacity;
        if (capacity < 1) throw new AdministrationError('invalid_schedule');
        return transaction.session.create({
          data: {
            branchId: input.branchId,
            classTypeId: input.classTypeId,
            trainerStaffMemberId: input.trainerStaffMemberId,
            startsAt: input.startsAt,
            endsAt: new Date(
              input.startsAt.getTime() + classType.durationMinutes * minuteMs,
            ),
            capacity,
            isException: true,
          },
          select: sessionSelect,
        });
      });
    },

    // Solo esta sesión: a future scheduled Session changes its Trainer (the
    // swap), start, or capacity and becomes an exception. A new start keeps
    // the duration and reopens the 2-hour empty check (BOOK-004).
    updateSession: async (
      input: {
        sessionId: string;
        trainerStaffMemberId?: string;
        startsAt?: Date;
        capacity?: number;
      },
      principal: AuthenticatedPrincipal,
    ) => {
      const actor = requireAdministrator(principal);
      const now = dependencies.now();
      return transact(async (transaction) => {
        const session = await transaction.session.findUnique({
          where: { id: input.sessionId },
          select: {
            ...sessionSelect,
            classType: { select: { name: true } },
            bookings: {
              where: { state: BookingState.BOOKED },
              select: {
                client: { select: { account: { select: { id: true } } } },
              },
            },
          },
        });
        if (session === null)
          throw new AdministrationError('session_not_found');
        if (
          session.state !== SessionState.SCHEDULED ||
          session.startsAt <= now
        ) {
          throw new AdministrationError('session_not_editable');
        }
        const trainerChanged =
          input.trainerStaffMemberId !== undefined &&
          input.trainerStaffMemberId !== session.trainerStaffMemberId;
        const startChanged =
          input.startsAt !== undefined &&
          input.startsAt.getTime() !== session.startsAt.getTime();
        if (trainerChanged) {
          await requireAssignable(transaction, {
            branchId: session.branchId,
            classTypeId: session.classTypeId,
            trainerStaffMemberId: input.trainerStaffMemberId!,
          });
        }
        if (startChanged && input.startsAt! <= now) {
          throw new AdministrationError('effective_date_invalid');
        }
        if (
          input.capacity !== undefined &&
          input.capacity < session.bookings.length
        ) {
          throw new AdministrationError('capacity_below_bookings');
        }
        if (input.capacity !== undefined && input.capacity < 1) {
          throw new AdministrationError('invalid_schedule');
        }
        const startsAt = startChanged ? input.startsAt! : session.startsAt;
        const updated = await transaction.session.update({
          where: { id: session.id },
          data: {
            trainerStaffMemberId: input.trainerStaffMemberId,
            capacity: input.capacity,
            startsAt,
            endsAt: new Date(
              startsAt.getTime() +
                (session.endsAt.getTime() - session.startsAt.getTime()),
            ),
            isException: true,
            ...(startChanged ? { emptyBookingCheckCompletedAt: null } : {}),
          },
          select: sessionSelect,
        });

        const eventKey = `${session.id}:${now.toISOString()}`;
        const moment = formatEvaluationMoment(startsAt);
        if (trainerChanged) {
          const trainer = await transaction.account.findUnique({
            where: { staffMemberId: input.trainerStaffMemberId },
            select: { id: true },
          });
          if (trainer !== null) {
            await record(transaction, {
              accountId: trainer.id,
              category: 'booking_schedule',
              type: 'session_assigned',
              businessEventKey: `session-assigned:${eventKey}`,
              title: 'Nueva clase asignada',
              message: `Se te asignó una clase: ${session.classType.name}, ${moment}.`,
              destination: { type: 'trainer_schedule', id: null },
              occurredAt: now,
            });
          }
        }
        if (startChanged) {
          for (const booking of session.bookings) {
            const accountId = booking.client.account?.id;
            if (accountId === undefined) continue;
            await record(transaction, {
              accountId,
              category: 'booking_schedule',
              type: 'session_rescheduled_by_studio',
              businessEventKey: `session-rescheduled:${eventKey}`,
              title: 'Tu clase cambió de horario',
              message: `Tu clase de ${session.classType.name} cambió de horario: ahora es el ${moment}.`,
              destination: { type: 'booking', id: session.id },
              occurredAt: now,
            });
          }
        }
        await transaction.auditRecord.create({
          data: {
            actionCode: 'session.updated',
            outcome: AuditOutcome.SUCCEEDED,
            actorKind: AuditActorKind.ACCOUNT,
            actorAccountId: actor.accountId,
            actorRole: StaffRole.ADMINISTRATOR,
            targetType: 'session',
            targetId: session.id,
            branchId: session.branchId,
            correlationId: randomUUID(),
            metadata: {
              ...(trainerChanged
                ? {
                    previousTrainerStaffMemberId: session.trainerStaffMemberId,
                    trainerStaffMemberId: input.trainerStaffMemberId!,
                  }
                : {}),
              ...(startChanged
                ? {
                    previousStartsAt: session.startsAt.toISOString(),
                    startsAt: startsAt.toISOString(),
                  }
                : {}),
              ...(input.capacity !== undefined
                ? {
                    previousCapacity: session.capacity,
                    capacity: input.capacity,
                  }
                : {}),
            },
            occurredAt: now,
          },
        });
        return updated;
      });
    },
  };
};

export type ScheduleAdministration = ReturnType<
  typeof createPrismaScheduleAdministration
>;
