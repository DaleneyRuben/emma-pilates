import type { Prisma } from '../../generated/prisma/client';
import {
  AuditActorKind,
  AuditOutcome,
  BookingCancellationCause,
  BookingState,
  SessionCancellationCause,
  SessionState,
  WaitlistClosureReason,
} from '../../generated/prisma/client';
import type { NotificationRecorder } from '../../notifications/prisma-notification-store';
import type { AuditActor } from '../../system-identity/authentication/audit-actor';
import type { SessionCancellationResult } from './cancel-session';
import { restoreBookedClass } from './restore-class';

// Cancels every live Booking as session_cancelled, refunds one unit to each
// Subscription, closes the active waitlist, audits, and notifies the booked
// and queued Clients plus the assigned Trainer.
export async function executeSessionCancellation(
  transaction: Prisma.TransactionClient,
  input: {
    sessionId: string;
    cancelledByAccountId: string;
    audit: AuditActor;
  },
  dependencies: {
    now: () => Date;
    recordNotification: NotificationRecorder;
  },
): Promise<SessionCancellationResult> {
  const now = dependencies.now();
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
          clientId: true,
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
    dependencies.recordNotification(transaction, {
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
    await restoreBookedClass(transaction, {
      bookingId: booking.id,
      subscriptionId: booking.subscriptionId,
      clientId: booking.clientId,
      now,
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
      actorAccountId: input.audit.accountId,
      actorRole: input.audit.role,
      impersonationId: input.audit.impersonationId,
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
