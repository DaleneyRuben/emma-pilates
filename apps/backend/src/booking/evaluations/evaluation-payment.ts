import type { Prisma } from '../../generated/prisma/client';
import {
  PaymentKind,
  PaymentMethod,
  PaymentState,
} from '../../generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { BookingAccessDeniedError } from '../commands/create-booking';
import { rejectPaymentOfCancelledEvaluation } from './evaluation-payment-decision';
import { evaluationHoldExpiresAt } from './evaluation-rules';

type Transaction = Prisma.TransactionClient;

export type PaidEvaluationQuote = {
  priceCentavos: number;
  feeCentavos: number;
  planId: string;
  planName: string;
  durationDays: number;
  weeklyClassCap: number | null;
  classAllowance: number;
  startsOn: Date;
};

const evaluationPaymentReason = 'El pago de la evaluación venció';

// A paid Evaluation is a Payment of its own, with no Subscription (ADR-0011).
export const startEvaluationTransfer = async (
  transaction: Transaction,
  input: {
    clientId: string;
    slotId: string;
    eligibilityMonth: Date;
    quote: PaidEvaluationQuote;
    principal: AuthenticatedPrincipal;
    now: Date;
  },
): Promise<{ paymentId: string; evaluationId: string }> => {
  const payment = await transaction.payment.create({
    data: {
      clientId: input.clientId,
      planId: input.quote.planId,
      planNameSnapshot: input.quote.planName,
      durationDaysSnapshot: input.quote.durationDays,
      weeklyClassCapSnapshot: input.quote.weeklyClassCap,
      classAllowanceSnapshot: input.quote.classAllowance,
      planPriceCentavos: input.quote.priceCentavos,
      creditAppliedCentavos: 0,
      amountDueCentavos: input.quote.priceCentavos,
      startsOn: input.quote.startsOn,
      method: PaymentMethod.TRANSFER,
      kind: PaymentKind.EVALUATION,
      state: PaymentState.PENDING,
      submittedByAccountId: input.principal.accountId,
      submittedAt: input.now,
      createdAt: input.now,
    },
    select: { id: true },
  });
  const evaluation = await transaction.evaluation.create({
    data: {
      clientId: input.clientId,
      evaluationSlotId: input.slotId,
      eligibilityMonth: input.eligibilityMonth,
      paymentId: payment.id,
      createdByAccountId: input.principal.accountId,
      createdAt: input.now,
    },
    select: { id: true },
  });
  return { paymentId: payment.id, evaluationId: evaluation.id };
};

export const evaluationTransferHoldUntil = (submittedAt: Date): Date =>
  evaluationHoldExpiresAt(submittedAt);

export const confirmEvaluationTransfer = async (
  transaction: Transaction,
  input: {
    paymentId: string;
    principal: AuthenticatedPrincipal;
    now: Date;
    feeCentavos: number;
  },
): Promise<void> => {
  if (
    input.principal.identity.kind !== 'staff' ||
    input.principal.identity.role !== 'administrator'
  ) {
    throw new BookingAccessDeniedError();
  }
  const payment = await transaction.payment.findUnique({
    where: { id: input.paymentId },
    select: {
      id: true,
      kind: true,
      state: true,
      method: true,
      evaluation: { select: { id: true, state: true } },
    },
  });
  if (
    payment === null ||
    payment.kind !== PaymentKind.EVALUATION ||
    payment.evaluation === null
  ) {
    throw new BookingAccessDeniedError();
  }
  if (payment.state === PaymentState.CONFIRMED) return;
  if (payment.state !== PaymentState.PENDING) {
    throw new BookingAccessDeniedError();
  }
  await transaction.payment.update({
    where: { id: payment.id },
    data: {
      state: PaymentState.CONFIRMED,
      decidedByAccountId: input.principal.accountId,
      decidedAt: input.now,
    },
  });
  await transaction.evaluation.update({
    where: { id: payment.evaluation.id },
    data: { nutritionistCostCentavos: input.feeCentavos },
  });
};

export const releaseExpiredEvaluationHolds = async (
  transaction: Transaction,
  now: Date,
): Promise<number> => {
  const due = await transaction.evaluation.findMany({
    where: {
      state: 'BOOKED',
      payment: {
        kind: PaymentKind.EVALUATION,
        state: PaymentState.PENDING,
        submittedAt: { lte: new Date(now.getTime() - 24 * 60 * 60 * 1_000) },
      },
    },
    select: { id: true, paymentId: true },
  });
  for (const row of due) {
    await transaction.evaluation.update({
      where: { id: row.id },
      data: {
        state: 'CANCELLED',
        cancelledAt: now,
        cancellationCause: 'PAYMENT_EXPIRED',
      },
    });
    await rejectPaymentOfCancelledEvaluation(transaction, {
      evaluationId: row.id,
      now,
      accountId: null,
      reason: evaluationPaymentReason,
    });
  }
  return due.length;
};
