import type { Prisma } from '../../generated/prisma/client';
import {
  AuditActorKind,
  AuditOutcome,
  EvaluationCancellationCause,
  EvaluationState,
  PaymentKind,
  PaymentState,
} from '../../generated/prisma/client';
import type { NotificationRecorder } from '../../notifications/prisma-notification-store';
import { auditActorOf } from '../../system-identity/authentication/audit-actor';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { BookingAccessDeniedError } from '../commands/create-booking';
import { PaymentRuleError } from '../payments/payment-errors';
import { scheduleReceiptDeletion } from '../payments/purchase-intent-settlement';
import { releaseSlot } from './evaluation-slot-release';

type Transaction = Prisma.TransactionClient;

const cancellationReason = 'La evaluación fue cancelada';

const conflict = (message: string) =>
  new PaymentRuleError('payment_confirmation_conflict', message);

// An Evaluation Payment has no Purchase Intent (booking ADR-0011). Confirm
// and reject stay here so the oversized command adapters only call in.
export const decideEvaluationTransfer = async (
  transaction: Transaction,
  recordNotification: NotificationRecorder,
  input: {
    paymentId: string;
    principal: AuthenticatedPrincipal;
    now: Date;
    feeCentavos: number;
    decision: 'confirm' | 'reject';
    reason?: string;
  },
): Promise<void> => {
  const payment = await transaction.payment.findUnique({
    where: { id: input.paymentId },
    select: {
      id: true,
      clientId: true,
      kind: true,
      state: true,
      method: true,
      amountDueCentavos: true,
      creditAppliedCentavos: true,
      rejectionReason: true,
      receiptImageAssetId: true,
      evaluation: {
        select: { id: true, state: true, evaluationSlotId: true },
      },
    },
  });
  if (
    payment === null ||
    payment.kind !== PaymentKind.EVALUATION ||
    payment.evaluation === null
  ) {
    throw new BookingAccessDeniedError();
  }
  const evaluationPayment = { ...payment, evaluation: payment.evaluation };
  if (input.decision === 'reject') {
    await rejectEvaluationTransfer(transaction, recordNotification, {
      payment: evaluationPayment,
      principal: input.principal,
      now: input.now,
      reason: input.reason ?? '',
    });
    return;
  }
  await confirmBookedEvaluation(transaction, recordNotification, {
    payment: evaluationPayment,
    principal: input.principal,
    now: input.now,
    feeCentavos: input.feeCentavos,
  });
};

const confirmBookedEvaluation = async (
  transaction: Transaction,
  recordNotification: NotificationRecorder,
  input: {
    payment: EvaluationPayment;
    principal: AuthenticatedPrincipal;
    now: Date;
    feeCentavos: number;
  },
): Promise<void> => {
  if (input.payment.state === PaymentState.CONFIRMED) return;
  if (
    input.payment.state !== PaymentState.PENDING ||
    input.payment.evaluation.state !== EvaluationState.BOOKED
  ) {
    throw conflict('The Evaluation is no longer booked');
  }
  await transaction.payment.update({
    where: { id: input.payment.id },
    data: {
      state: PaymentState.CONFIRMED,
      decidedByAccountId: input.principal.accountId,
      decidedAt: input.now,
    },
  });
  await transaction.evaluation.update({
    where: { id: input.payment.evaluation.id },
    data: { nutritionistCostCentavos: input.feeCentavos },
  });
  await finishDecision(transaction, recordNotification, {
    payment: input.payment,
    principal: input.principal,
    now: input.now,
    actionCode: 'payment.transfer_confirmed',
    priorState: 'pending',
    newState: 'confirmed',
    type: 'payment_confirmed',
    title: 'Pago confirmado',
    message: 'Tu pago fue confirmado. Tu evaluación quedó reservada.',
  });
};

const rejectEvaluationTransfer = async (
  transaction: Transaction,
  recordNotification: NotificationRecorder,
  input: {
    payment: EvaluationPayment;
    principal: AuthenticatedPrincipal;
    now: Date;
    reason: string;
  },
): Promise<void> => {
  if (input.payment.state === PaymentState.REJECTED) {
    if (input.payment.rejectionReason === input.reason) return;
    throw conflict('Payment was already rejected with another reason');
  }
  if (input.payment.state === PaymentState.CONFIRMED) {
    throw conflict('Payment was already confirmed');
  }
  await transaction.payment.update({
    where: { id: input.payment.id },
    data: {
      state: PaymentState.REJECTED,
      decidedByAccountId: input.principal.accountId,
      decidedAt: input.now,
      rejectionReason: input.reason,
    },
  });
  if (input.payment.evaluation.state === EvaluationState.BOOKED) {
    await cancelEvaluationRow(transaction, {
      evaluation: input.payment.evaluation,
      now: input.now,
      accountId: input.principal.accountId,
      cause: EvaluationCancellationCause.PAYMENT_REJECTED,
    });
  }
  const sentence = input.reason.endsWith('.')
    ? input.reason
    : `${input.reason}.`;
  await finishDecision(transaction, recordNotification, {
    payment: input.payment,
    principal: input.principal,
    now: input.now,
    actionCode: 'payment.transfer_rejected',
    priorState: 'pending',
    newState: 'rejected',
    type: 'payment_rejected',
    title: 'Comprobante rechazado',
    message: `Tu comprobante fue rechazado: ${sentence} Puedes reservar la evaluación de nuevo.`,
  });
};

// Cancelling the Evaluation settles its pending Payment in the same
// transaction. A later confirm must not book income on a cancelled one.
export const rejectPaymentOfCancelledEvaluation = async (
  transaction: Transaction,
  input: {
    evaluationId: string;
    now: Date;
    accountId: string | null;
    reason?: string;
  },
): Promise<void> => {
  const evaluation = await transaction.evaluation.findUnique({
    where: { id: input.evaluationId },
    select: {
      payment: {
        select: {
          id: true,
          state: true,
          amountDueCentavos: true,
          creditAppliedCentavos: true,
          receiptImageAssetId: true,
        },
      },
    },
  });
  const payment = evaluation?.payment ?? null;
  if (payment === null || payment.state !== PaymentState.PENDING) return;
  await transaction.payment.update({
    where: { id: payment.id },
    data: {
      state: PaymentState.REJECTED,
      decidedAt: input.now,
      decidedByAccountId: null,
      rejectionReason: input.reason ?? cancellationReason,
    },
  });
  await transaction.auditRecord.create({
    data: {
      actionCode: 'payment.transfer_rejected',
      outcome: AuditOutcome.SUCCEEDED,
      actorKind: AuditActorKind.SYSTEM,
      targetType: 'payment',
      targetId: payment.id,
      correlationId: payment.id,
      occurredAt: input.now,
      metadata: {
        method: 'transfer',
        priorState: 'pending',
        newState: 'rejected',
        amountDueCentavos: payment.amountDueCentavos,
        creditAppliedCentavos: payment.creditAppliedCentavos,
        kind: 'evaluation',
        reason: 'evaluation_cancelled',
      },
    },
  });
  await scheduleReceiptDeletion(
    transaction,
    payment.receiptImageAssetId,
    input.now,
    true,
  );
};

type EvaluationPayment = {
  id: string;
  clientId: string;
  method: string;
  amountDueCentavos: number;
  creditAppliedCentavos: number;
  receiptImageAssetId: string | null;
  rejectionReason: string | null;
  state: PaymentState;
  evaluation: { id: string; state: EvaluationState; evaluationSlotId: string };
};

const cancelEvaluationRow = async (
  transaction: Transaction,
  input: {
    evaluation: { id: string; evaluationSlotId: string };
    now: Date;
    accountId: string;
    cause: EvaluationCancellationCause;
  },
) => {
  await transaction.evaluation.update({
    where: { id: input.evaluation.id },
    data: {
      state: EvaluationState.CANCELLED,
      cancelledAt: input.now,
      cancelledByAccountId: input.accountId,
      cancellationCause: input.cause,
    },
  });
  await releaseSlot(transaction, input.evaluation.evaluationSlotId, input.now);
};

const finishDecision = async (
  transaction: Transaction,
  recordNotification: NotificationRecorder,
  input: {
    payment: EvaluationPayment;
    principal: AuthenticatedPrincipal;
    now: Date;
    actionCode: string;
    priorState: string;
    newState: string;
    type: 'payment_confirmed' | 'payment_rejected';
    title: string;
    message: string;
  },
) => {
  const actor = auditActorOf(input.principal);
  await transaction.auditRecord.create({
    data: {
      actionCode: input.actionCode,
      outcome: AuditOutcome.SUCCEEDED,
      actorKind: AuditActorKind.ACCOUNT,
      actorAccountId: actor.accountId,
      actorRole: actor.role,
      impersonationId: actor.impersonationId,
      targetType: 'payment',
      targetId: input.payment.id,
      correlationId: input.payment.id,
      occurredAt: input.now,
      metadata: {
        method: 'transfer',
        priorState: input.priorState,
        newState: input.newState,
        amountDueCentavos: input.payment.amountDueCentavos,
        creditAppliedCentavos: input.payment.creditAppliedCentavos,
        kind: 'evaluation',
      },
    },
  });
  await scheduleReceiptDeletion(
    transaction,
    input.payment.receiptImageAssetId,
    input.now,
    true,
  );
  const client = await transaction.client.findUniqueOrThrow({
    where: { id: input.payment.clientId },
    select: { account: { select: { id: true } } },
  });
  if (client.account === null) return;
  await recordNotification(transaction, {
    accountId: client.account.id,
    category: 'subscription_payment',
    type: input.type,
    businessEventKey: `${
      input.type === 'payment_confirmed'
        ? 'payment-confirmed'
        : 'payment-rejected'
    }:${input.payment.id}`,
    title: input.title,
    message: input.message,
    destination: { type: 'evaluation', id: input.payment.evaluation.id },
    occurredAt: input.now,
  });
};
