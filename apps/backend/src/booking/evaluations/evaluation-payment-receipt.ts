import type { Prisma } from '../../generated/prisma/client';
import {
  ImageAssetPurpose,
  ImageAssetState,
  PaymentKind,
  PaymentState,
} from '../../generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { BookingAccessDeniedError } from '../commands/create-booking';
import type { NotificationRecorder } from '../../notifications/prisma-notification-store';
import { PaymentRuleError } from '../payments/payment-errors';
import { notifyPaymentSubmitted } from '../payments/payment-submitted-notice';

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
  recordNotification: NotificationRecorder,
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
  // Walkthrough n.º 65: the same «Comprobante por revisar» a Plan raises.
  await notifyPaymentSubmitted(transaction, recordNotification, {
    paymentId: payment.id,
    now: input.now,
  });
};

export const evaluationReceiptOf = (
  asset:
    | {
        id: string;
        deletedAt: Date | null;
        declaredMediaType: 'JPEG' | 'PNG' | 'WEBP' | 'PDF';
        verifiedMediaType: 'JPEG' | 'PNG' | 'WEBP' | 'PDF' | null;
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
    PDF: 'application/pdf',
  } as const;
  return {
    imageAssetId: asset.id,
    mediaType: mediaTypes[asset.verifiedMediaType ?? asset.declaredMediaType],
  };
};

export const evaluationReceiptSelect = receiptSelect;
