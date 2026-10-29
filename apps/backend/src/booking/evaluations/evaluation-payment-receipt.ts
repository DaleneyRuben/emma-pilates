import type { Prisma } from '../../generated/prisma/client';
import {
  EvaluationState,
  ImageAssetPurpose,
  ImageAssetState,
  PaymentKind,
  PaymentState,
} from '../../generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { BookingAccessDeniedError } from '../commands/create-booking';
import { PaymentRuleError } from '../payments/payment-errors';
import { isSubscriptionEffective } from '../payments/purchase-eligibility';

type Transaction = Prisma.TransactionClient;

const receiptSelect = {
  id: true,
  deletedAt: true,
  declaredMediaType: true,
  verifiedMediaType: true,
} as const;

// An Evaluation transfer has no Purchase Intent, so the receipt lives on the
// Payment and uses the same image asset a Plan receipt uses (ADR-0011).
export const attachEvaluationReceipt = async (
  transaction: Transaction,
  input: {
    paymentId?: string;
    evaluationId?: string;
    imageAssetId: string;
    principal: AuthenticatedPrincipal;
    now: Date;
  },
): Promise<void> => {
  if (input.principal.identity.kind !== 'client') {
    throw new BookingAccessDeniedError();
  }
  const linked =
    input.evaluationId === undefined
      ? null
      : await transaction.evaluation.findFirst({
          where: {
            id: input.evaluationId,
            clientId: input.principal.identity.clientId,
          },
          select: { paymentId: true },
        });
  const paymentId = input.paymentId ?? linked?.paymentId ?? undefined;
  const payment =
    paymentId === undefined
      ? null
      : await transaction.payment.findFirst({
          where: {
            id: paymentId,
            clientId: input.principal.identity.clientId,
            kind: PaymentKind.EVALUATION,
            state: PaymentState.PENDING,
          },
          select: { id: true, receiptImageAssetId: true },
        });
  if (payment === null) {
    throw new PaymentRuleError('payment_not_pending', 'Payment is not pending');
  }
  const asset = await transaction.imageAsset.findUnique({
    where: { id: input.imageAssetId },
    select: {
      id: true,
      ownerAccountId: true,
      purpose: true,
      state: true,
    },
  });
  if (
    asset === null ||
    asset.ownerAccountId !== input.principal.accountId ||
    asset.purpose !== ImageAssetPurpose.TRANSFER_RECEIPT
  ) {
    throw new PaymentRuleError(
      'payment_receipt_invalid_owner',
      'Receipt does not belong to this Account',
    );
  }
  if (payment.receiptImageAssetId === asset.id) return;
  if (asset.state !== ImageAssetState.READY) {
    throw new PaymentRuleError(
      'payment_receipt_not_ready',
      'Receipt is not ready',
    );
  }
  if (payment.receiptImageAssetId !== null) {
    await transaction.imageAsset.update({
      where: { id: payment.receiptImageAssetId },
      data: {
        state: ImageAssetState.READY,
        attachedAt: null,
        deletionDueAt: input.now,
      },
    });
  }
  await transaction.payment.update({
    where: { id: payment.id },
    data: { receiptImageAssetId: asset.id },
  });
  await transaction.imageAsset.update({
    where: { id: asset.id },
    data: {
      state: ImageAssetState.ATTACHED,
      attachedAt: input.now,
      deletionDueAt: null,
    },
  });
};

// The same effectiveness check a class booking uses. A date range alone is
// not enough: an exhausted Plan cannot buy a paid Evaluation.
export const coveringSubscription = async (
  transaction: Transaction,
  input: { clientId: string; slotDate: Date; today: Date; now: Date },
) => {
  const candidates = await transaction.subscription.findMany({
    where: {
      clientId: input.clientId,
      state: 'ACTIVE',
      startsOn: { lte: input.slotDate },
      endsOn: { gte: input.slotDate },
    },
    orderBy: [{ endsOn: 'desc' }, { id: 'asc' }],
    select: {
      id: true,
      planId: true,
      planNameSnapshot: true,
      durationDaysSnapshot: true,
      weeklyClassCapSnapshot: true,
      originalClassAllowance: true,
      startsOn: true,
      endsOn: true,
      remainingClassAllowance: true,
      evaluations: {
        where: {
          state: { in: [EvaluationState.BOOKED, EvaluationState.NO_SHOW] },
        },
        select: { id: true },
      },
      _count: {
        select: {
          bookings: {
            where: {
              state: 'BOOKED',
              session: { startsAt: { gt: input.now } },
            },
          },
        },
      },
    },
  });
  return (
    candidates.find((candidate) =>
      isSubscriptionEffective(
        {
          endsOn: candidate.endsOn,
          remainingClassAllowance: candidate.remainingClassAllowance,
          futureBookedCount: candidate._count.bookings,
        },
        input.today,
      ),
    ) ?? null
  );
};

export const evaluationReceiptOf = (
  asset:
    | {
        id: string;
        deletedAt: Date | null;
        declaredMediaType: 'JPEG' | 'PNG' | 'WEBP';
        verifiedMediaType: 'JPEG' | 'PNG' | 'WEBP' | null;
      }
    | null
    | undefined,
) => {
  if (asset === null || asset === undefined || asset.deletedAt !== null) {
    return null;
  }
  const mediaTypes = {
    JPEG: 'image/jpeg',
    PNG: 'image/png',
    WEBP: 'image/webp',
  } as const;
  return {
    imageAssetId: asset.id,
    mediaType: mediaTypes[asset.verifiedMediaType ?? asset.declaredMediaType],
  };
};

export const evaluationReceiptSelect = receiptSelect;
