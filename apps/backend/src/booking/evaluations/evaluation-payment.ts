import type { Prisma } from '../../generated/prisma/client';
import {
  EvaluationState,
  PaymentKind,
  PaymentMethod,
  PaymentState,
} from '../../generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { EvaluationRuleError } from './evaluation-errors';
import { rejectPaymentOfCancelledEvaluation } from './evaluation-payment-decision';
import { evaluationHoldExpiresAt } from './evaluation-rules';

type Transaction = Prisma.TransactionClient;

const isUniqueViolation = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  error.code === 'P2002';

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
  const pending = await transaction.payment.findFirst({
    where: {
      clientId: input.clientId,
      kind: PaymentKind.EVALUATION,
      state: PaymentState.PENDING,
    },
    select: { id: true },
  });
  if (pending !== null) {
    throw new EvaluationRuleError(
      'evaluation_payment_pending',
      'Ya tienes un pago de evaluación pendiente.',
    );
  }
  let payment: { id: string };
  try {
    payment = await transaction.payment.create({
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
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    throw new EvaluationRuleError(
      'evaluation_payment_pending',
      'Ya tienes un pago de evaluación pendiente.',
    );
  }
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

export const releaseExpiredEvaluationHolds = async (
  transaction: Transaction,
  now: Date,
): Promise<number> => {
  const due = await transaction.evaluation.findMany({
    where: {
      state: EvaluationState.BOOKED,
      slot: { startsAt: { gt: now } },
      payment: {
        kind: PaymentKind.EVALUATION,
        state: PaymentState.PENDING,
        submittedAt: { lte: new Date(now.getTime() - 24 * 60 * 60 * 1_000) },
      },
    },
    select: { id: true, paymentId: true, state: true },
  });
  for (const row of due) {
    if (row.state === EvaluationState.BOOKED) {
      await transaction.evaluation.update({
        where: { id: row.id },
        data: {
          state: 'CANCELLED',
          cancelledAt: now,
          cancellationCause: 'PAYMENT_EXPIRED',
        },
      });
    }
    await rejectPaymentOfCancelledEvaluation(transaction, {
      evaluationId: row.id,
      now,
      actor: null,
      reason: evaluationPaymentReason,
    });
  }
  return due.length;
};
