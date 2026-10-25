import {
  BookingState,
  SessionCancellationCause,
  SessionState,
} from '../../generated/prisma/enums';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import type { NotificationRecorder } from '../../notifications/prisma-notification-store';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { boliviaDate, boliviaInstant } from '../../time/bolivia-time';
import {
  AdministrationError,
  requireOperations,
  type AdministratorActor,
} from './administration-errors';
import {
  createAndMaterialize,
  isSessionLength,
  requireAssignable,
  scheduleSelect,
  scheduleTransaction,
  type ScheduleInput,
} from './schedule-writes';
import { createPrismaSessionExceptions } from './prisma-session-exceptions';

export type { ScheduleInput } from './schedule-writes';

type Transaction = Prisma.TransactionClient;

// ADM-001 slices B and C: weekly Session Schedules with effective dates and
// single-Session exceptions for the admin web (ADR-0059, follow-up 39 §1).
export const createPrismaScheduleAdministration = (
  prisma: PrismaClient,
  dependencies: { now: () => Date; recordNotification?: NotificationRecorder },
) => {
  const transact = scheduleTransaction(prisma);

  const requireScheduleValues = (input: ScheduleInput) => {
    if (
      input.weekday < 1 ||
      input.weekday > 7 ||
      input.capacity < 1 ||
      !isSessionLength(input.durationMinutes)
    ) {
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
    ...createPrismaSessionExceptions(prisma, dependencies),

    listSchedules: async (
      input: { branchId?: string },
      principal: AuthenticatedPrincipal,
    ) => {
      requireOperations(principal);
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
      requireOperations(principal);
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
      const actor = requireOperations(principal);
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
      const actor = requireOperations(principal);
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
  };
};

export type ScheduleAdministration = ReturnType<
  typeof createPrismaScheduleAdministration
>;
