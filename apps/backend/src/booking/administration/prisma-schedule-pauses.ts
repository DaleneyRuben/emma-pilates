import {
  SessionCancellationCause,
  SessionState,
} from '../../generated/prisma/enums';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { boliviaDate, boliviaInstant } from '../../time/bolivia-time';
import { materializeSchedule } from '../sessions/prisma-session-materializer';
import {
  AdministrationError,
  requireOperations,
} from './administration-errors';
import { scheduleSelect, scheduleTransaction } from './schedule-writes';
import { withdrawSessions } from './schedule-withdrawal';

type Transaction = Prisma.TransactionClient;

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

// A withdrawn Session comes back only when no scheduled Session took its
// Branch slot or its Trainer meanwhile (the exclusion constraints).
const restorable = async (
  transaction: Transaction,
  session: {
    id: string;
    branchId: string;
    trainerStaffMemberId: string;
    startsAt: Date;
    endsAt: Date;
  },
) =>
  (await transaction.session.count({
    where: {
      id: { not: session.id },
      state: SessionState.SCHEDULED,
      startsAt: { lt: session.endsAt },
      endsAt: { gt: session.startsAt },
      OR: [
        { branchId: session.branchId },
        { trainerStaffMemberId: session.trainerStaffMemberId },
      ],
    },
  })) === 0;

// BKM-018 (owner approval 2026-11-04): pause a weekly series without ending
// it, for holidays say, and resume it. One pause at a time per series.
export const createPrismaSchedulePauses = (
  prisma: PrismaClient,
  dependencies: { now: () => Date },
) => {
  const transact = scheduleTransaction(prisma);

  return {
    pauseSchedule: async (
      input: {
        sessionScheduleId: string;
        pausedFrom: Date;
        pausedUntil: Date | null;
      },
      principal: AuthenticatedPrincipal,
    ) => {
      const actor = requireOperations(principal);
      const now = dependencies.now();
      if (
        input.pausedFrom < boliviaDate(now) ||
        (input.pausedUntil !== null && input.pausedUntil <= input.pausedFrom)
      ) {
        throw new AdministrationError('effective_date_invalid');
      }
      return transact(async (transaction) => {
        const old = await findSchedule(transaction, input.sessionScheduleId);
        const today = boliviaDate(now);
        if (
          old.pausedFrom !== null &&
          (old.pausedUntil === null || old.pausedUntil > today)
        ) {
          throw new AdministrationError('session_schedule_paused');
        }
        if (
          old.effectiveUntil !== null &&
          input.pausedFrom >= old.effectiveUntil
        ) {
          throw new AdministrationError('effective_date_invalid');
        }
        const schedule = await transaction.sessionSchedule.update({
          where: { id: old.id },
          data: {
            pausedFrom: input.pausedFrom,
            pausedUntil: input.pausedUntil,
          },
          select: scheduleSelect,
        });
        const withdrawn = await withdrawSessions(
          transaction,
          {
            sessionScheduleId: old.id,
            from: input.pausedFrom,
            until: input.pausedUntil,
            cause: SessionCancellationCause.SCHEDULE_PAUSED,
          },
          actor,
          now,
        );
        return { schedule, ...withdrawn };
      });
    },

    resumeSchedule: async (
      input: { sessionScheduleId: string },
      principal: AuthenticatedPrincipal,
    ) => {
      requireOperations(principal);
      const now = dependencies.now();
      return transact(async (transaction) => {
        const old = await findSchedule(transaction, input.sessionScheduleId);
        if (old.pausedFrom === null) {
          throw new AdministrationError('session_schedule_not_paused');
        }
        const withdrawn = await transaction.session.findMany({
          where: {
            sessionScheduleId: old.id,
            state: SessionState.CANCELLED,
            cancellationCause: SessionCancellationCause.SCHEDULE_PAUSED,
            // Never past the series' own end (review of pull request #286).
            startsAt: {
              gt: now,
              ...(old.effectiveUntil === null
                ? {}
                : { lt: boliviaInstant(old.effectiveUntil, 0) }),
            },
          },
          orderBy: { startsAt: 'asc' },
          select: {
            id: true,
            branchId: true,
            trainerStaffMemberId: true,
            startsAt: true,
            endsAt: true,
          },
        });
        let restoredSessions = 0;
        for (const session of withdrawn) {
          if (!(await restorable(transaction, session))) continue;
          await transaction.session.update({
            where: { id: session.id },
            data: {
              state: SessionState.SCHEDULED,
              cancellationCause: null,
              cancelledAt: null,
              cancelledByAccountId: null,
            },
          });
          restoredSessions += 1;
        }
        const schedule = await transaction.sessionSchedule.update({
          where: { id: old.id },
          data: { pausedFrom: null, pausedUntil: null },
          select: scheduleSelect,
        });
        const { created } = await materializeSchedule(transaction, schedule, {
          today: boliviaDate(now),
          now,
        });
        return { schedule, restoredSessions, created };
      });
    },
  };
};

export type SchedulePauses = ReturnType<typeof createPrismaSchedulePauses>;
