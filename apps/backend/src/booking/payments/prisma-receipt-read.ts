import type { Provider } from '@nestjs/common';
import type { PrismaClient } from '../../generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import {
  receiptObject,
  receiptObjectSelect,
  type ReceiptVariant,
} from '../../uploads/private-image-object';
import { BookingAccessDeniedError } from '../commands/create-booking';
import { receiptRead } from './administrator.controller';
import { PaymentRuleError } from './payment-errors';

// UPL-002: the receipt route serves the rebuilt variant that fits the screen
// (ADR-0073, sizes in docs/implementation/UPL-002-image-variants.md). Only an
// Administrator reviewing the Payment may read it (ADR-0054).
export const createPrismaReceiptRead = (prisma: PrismaClient) => ({
  readReceiptObject: async (
    command: { paymentId: string; variant: ReceiptVariant },
    principal: AuthenticatedPrincipal,
  ): Promise<{ objectKey: string; mediaType: string }> => {
    if (
      principal.identity.kind !== 'staff' ||
      principal.identity.role !== 'administrator'
    ) {
      throw new BookingAccessDeniedError();
    }
    const assetSelect = receiptObjectSelect(command.variant);
    const payment = await prisma.payment.findUnique({
      where: { id: command.paymentId },
      select: {
        purchaseIntent: {
          select: { receiptImageAsset: { select: assetSelect } },
        },
        receiptImageAsset: { select: assetSelect },
      },
    });
    if (payment === null) {
      throw new PaymentRuleError('payment_not_found', 'Payment not found');
    }
    const receipt = receiptObject(
      payment.receiptImageAsset ?? payment.purchaseIntent?.receiptImageAsset,
    );
    if (receipt === null) {
      throw new PaymentRuleError(
        'payment_receipt_not_ready',
        'Receipt is no longer available',
      );
    }
    return receipt;
  },
});

export type ReceiptRead = ReturnType<typeof createPrismaReceiptRead>;

export const receiptReadProvider = (prismaToken: symbol): Provider => ({
  provide: receiptRead,
  inject: [prismaToken],
  useFactory: (prisma: PrismaClient) =>
    createPrismaReceiptRead(prisma).readReceiptObject,
});
