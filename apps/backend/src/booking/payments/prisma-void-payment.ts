import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import {
  AuditActorKind,
  AuditOutcome,
  BookingCancellationCause,
  BookingState,
  PaymentState,
  SessionState,
  StaffRole,
} from '../../generated/prisma/client';
import { retrySerializable } from '../../database/retry-serializable';
import { closureScope } from '../account-closure/closure-scope';
import { promoteWaitlistInTransaction } from '../commands/waitlist-promotion';
import {
  recordNotification as defaultNotificationRecorder,
  type NotificationRecorder,
} from '../../notifications/prisma-notification-store';
import { addCivilDays, boliviaDate } from '../../time/bolivia-time';
import { VoidSaleError, type VoidedSale } from './void-sale';

type Transaction = Prisma.TransactionClient;

// A void corrects a mistake: the Subscription stops covering today, future
// Bookings are cancelled, and Attendance already taken stays (ADR-0012).
export const createPrismaVoidPayment = (
  prisma: PrismaClient,
  dependencies: { recordNotification?: NotificationRecorder } = {},
) => {
  const recordNotification =
    dependencies.recordNotification ?? defaultNotificationRecorder;

  const voidPayment = async (input: {
    paymentId: string;
    reason: string;
    actorAccountId: string;
    now: Date;
  }): Promise<VoidedSale> =>
    retrySerializable(() =>
      prisma.$transaction(
        (transaction) => voidInTransaction(transaction, input),
        { isolationLevel: 'Serializable' },
      ),
    );

  const voidInTransaction = async (
    transaction: Transaction,
    input: {
      paymentId: string;
      reason: string;
      actorAccountId: string;
      now: Date;
    },
  ): Promise<VoidedSale> => {
    const payment = await transaction.payment.findUnique({
      where: { id: input.paymentId },
      select: {
        id: true,
        clientId: true,
        state: true,
        method: true,
        amountDueCentavos: true,
        subscription: { select: { id: true, endsOn: true } },
      },
    });
    if (payment === null) {
      throw new VoidSaleError('payment_not_found');
    }
    if (payment.state === PaymentState.VOIDED) {
      throw new VoidSaleError('payment_already_voided');
    }
    if (
      payment.state !== PaymentState.CONFIRMED ||
      payment.subscription === null
    ) {
      throw new VoidSaleError('payment_not_voidable');
    }

    const endsOn = addCivilDays(boliviaDate(input.now), -1);
    await transaction.payment.update({
      where: { id: payment.id },
      data: {
        state: PaymentState.VOIDED,
        voidedAt: input.now,
        voidedByAccountId: input.actorAccountId,
        voidReason: input.reason,
      },
    });
    await transaction.subscription.update({
      where: { id: payment.subscription.id },
      data: { endsOn, endedByVoid: true },
    });

    const future = await transaction.booking.findMany({
      where: {
        subscriptionId: payment.subscription.id,
        ...closureScope.futureBookings(payment.clientId, input.now),
      },
      select: { id: true, sessionId: true },
    });
    if (future.length > 0) {
      await transaction.booking.updateMany({
        where: { id: { in: future.map(({ id }) => id) } },
        data: {
          state: BookingState.CANCELLED,
          cancelledAt: input.now,
          cancelledByAccountId: input.actorAccountId,
          cancellationCause: BookingCancellationCause.PAYMENT_VOIDED,
        },
      });
    }
    const sessionIds = [...new Set(future.map(({ sessionId }) => sessionId))];
    for (const sessionId of sessionIds) {
      const session = await transaction.session.findUnique({
        where: { id: sessionId },
        select: { state: true },
      });
      if (session?.state !== SessionState.SCHEDULED) continue;
      await promoteWaitlistInTransaction(transaction, sessionId, {
        now: () => input.now,
        recordNotification,
      });
    }

    await transaction.auditRecord.create({
      data: {
        actionCode: 'payment.voided',
        outcome: AuditOutcome.SUCCEEDED,
        actorKind: AuditActorKind.ACCOUNT,
        actorAccountId: input.actorAccountId,
        actorRole: StaffRole.ADMINISTRATOR,
        targetType: 'payment',
        targetId: payment.id,
        correlationId: payment.id,
        occurredAt: input.now,
        metadata: {
          clientId: payment.clientId,
          reason: input.reason,
          method: payment.method.toLowerCase(),
          amountDueCentavos: payment.amountDueCentavos,
          previousEndsOn: payment.subscription.endsOn
            .toISOString()
            .slice(0, 10),
          endsOn: endsOn.toISOString().slice(0, 10),
          cancelledBookings: future.length,
        },
      },
    });

    return {
      paymentId: payment.id,
      state: 'voided',
      voidReason: input.reason,
      cancelledBookings: future.length,
    };
  };

  return { voidPayment };
};
