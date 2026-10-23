import { randomUUID } from 'node:crypto';
import {
  AuditActorKind,
  AuditOutcome,
  BookingState,
  SessionState,
  StaffRole,
} from '../../generated/prisma/enums';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import {
  recordNotification as defaultNotificationRecorder,
  type NotificationRecorder,
} from '../../notifications/prisma-notification-store';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { formatEvaluationMoment } from '../evaluations/evaluation-notifications';
import { recordAdministratorAudit } from './administration-audit';
import {
  AdministrationError,
  requireAdministrator,
} from './administration-errors';
import {
  isSessionLength,
  requireAssignable,
  scheduleTransaction,
} from './schedule-writes';

const minuteMs = 60 * 1_000;

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

// ADM-001 slice C: single-Session exceptions («Una sola vez» and «Solo esta
// sesión», follow-up 39 §1) for the admin web.
export const createPrismaSessionExceptions = (
  prisma: PrismaClient,
  dependencies: { now: () => Date; recordNotification?: NotificationRecorder },
) => {
  const record = dependencies.recordNotification ?? defaultNotificationRecorder;
  const transact = scheduleTransaction(prisma);

  return {
    // Una sola vez (follow-up 39 §1): a one-off exception Session.
    createSession: async (
      input: {
        branchId: string;
        classTypeId: string;
        trainerStaffMemberId: string;
        startsAt: Date;
        durationMinutes: number;
        capacity?: number;
      },
      principal: AuthenticatedPrincipal,
    ) => {
      const actor = requireAdministrator(principal);
      const now = dependencies.now();
      if (input.startsAt <= now) {
        throw new AdministrationError('effective_date_invalid');
      }
      if (!isSessionLength(input.durationMinutes)) {
        throw new AdministrationError('invalid_schedule');
      }
      return transact(async (transaction) => {
        await requireAssignable(transaction, input);
        const defaults = await transaction.classType.findUniqueOrThrow({
          where: { id: input.classTypeId },
          select: { defaultCapacity: true },
        });
        const capacity = input.capacity ?? defaults.defaultCapacity;
        if (capacity < 1) throw new AdministrationError('invalid_schedule');
        const session = await transaction.session.create({
          data: {
            branchId: input.branchId,
            classTypeId: input.classTypeId,
            trainerStaffMemberId: input.trainerStaffMemberId,
            startsAt: input.startsAt,
            endsAt: new Date(
              input.startsAt.getTime() + input.durationMinutes * minuteMs,
            ),
            capacity,
            isException: true,
          },
          select: sessionSelect,
        });
        await recordAdministratorAudit(transaction, actor, {
          actionCode: 'session.created',
          targetType: 'session',
          targetId: session.id,
          branchId: session.branchId,
          metadata: {
            classTypeId: session.classTypeId,
            trainerStaffMemberId: session.trainerStaffMemberId,
            startsAt: session.startsAt.toISOString(),
            durationMinutes: input.durationMinutes,
            capacity,
          },
          occurredAt: now,
        });
        return session;
      });
    },

    // Solo esta sesión: a future scheduled Session changes its Trainer (the
    // swap), start, duration, or capacity and becomes an exception. A new
    // start keeps the duration unless one is given and reopens the 2-hour
    // empty check (BOOK-004).
    updateSession: async (
      input: {
        sessionId: string;
        trainerStaffMemberId?: string;
        startsAt?: Date;
        durationMinutes?: number;
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
        if (
          (input.capacity !== undefined && input.capacity < 1) ||
          (input.durationMinutes !== undefined &&
            !isSessionLength(input.durationMinutes))
        ) {
          throw new AdministrationError('invalid_schedule');
        }
        const startsAt = startChanged ? input.startsAt! : session.startsAt;
        const previousMinutes =
          (session.endsAt.getTime() - session.startsAt.getTime()) / minuteMs;
        const durationMinutes = input.durationMinutes ?? previousMinutes;
        const updated = await transaction.session.update({
          where: { id: session.id },
          data: {
            trainerStaffMemberId: input.trainerStaffMemberId,
            capacity: input.capacity,
            startsAt,
            endsAt: new Date(startsAt.getTime() + durationMinutes * minuteMs),
            isException: true,
            // A moved Session is checked and snapshotted again at its new time.
            ...(startChanged
              ? {
                  minimumBookingsCheckCompletedAt: null,
                  bookingsAtWindowClose: null,
                }
              : {}),
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
              ...(durationMinutes !== previousMinutes
                ? { previousDurationMinutes: previousMinutes, durationMinutes }
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
