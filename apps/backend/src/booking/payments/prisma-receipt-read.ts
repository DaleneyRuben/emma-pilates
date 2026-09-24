import type { Provider } from '@nestjs/common';
import type { PrismaClient } from '../../generated/prisma/client';
import {
  ImageMediaType,
  ImageVariantKind,
  ImageVariantVisibility,
} from '../../generated/prisma/enums';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { BookingAccessDeniedError } from '../commands/create-booking';
import { receiptRead } from './administrator.controller';
import { PaymentRuleError } from './payment-errors';

export type ReceiptVariant = 'readable' | 'thumbnail';
export const receiptVariants: readonly ReceiptVariant[] = [
  'readable',
  'thumbnail',
];

const variantKinds: Record<ReceiptVariant, ImageVariantKind> = {
  readable: ImageVariantKind.READABLE,
  thumbnail: ImageVariantKind.THUMBNAIL,
};

const mediaTypes: Record<ImageMediaType, string> = {
  [ImageMediaType.JPEG]: 'image/jpeg',
  [ImageMediaType.PNG]: 'image/png',
  [ImageMediaType.WEBP]: 'image/webp',
};

// UPL-002: the receipt route serves the rebuilt variant that fits the screen
// (ADR-0073, sizes in docs/implementation/UPL-002-image-variants.md). A
// receipt finalized before variants existed still has its original object,
// so it is served as before. Only an Administrator reviewing the Payment may
// read it (ADR-0054).
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
    const payment = await prisma.payment.findUnique({
      where: { id: command.paymentId },
      select: {
        purchaseIntent: {
          select: {
            receiptImageAsset: {
              select: {
                pendingObjectKey: true,
                deletedAt: true,
                declaredMediaType: true,
                verifiedMediaType: true,
                variants: {
                  where: {
                    kind: variantKinds[command.variant],
                    visibility: ImageVariantVisibility.PRIVATE,
                    deleteRequestedAt: null,
                    deletedAt: null,
                  },
                  select: { storageKey: true, mediaType: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });
    if (payment === null) {
      throw new PaymentRuleError('payment_not_found', 'Payment not found');
    }
    const receipt = payment.purchaseIntent?.receiptImageAsset;
    if (
      receipt === null ||
      receipt === undefined ||
      receipt.deletedAt !== null
    ) {
      throw new PaymentRuleError(
        'payment_receipt_not_ready',
        'Receipt is no longer available',
      );
    }
    const variant = receipt.variants[0];
    return variant === undefined
      ? {
          objectKey: receipt.pendingObjectKey,
          mediaType:
            mediaTypes[receipt.verifiedMediaType ?? receipt.declaredMediaType],
        }
      : {
          objectKey: variant.storageKey,
          mediaType: mediaTypes[variant.mediaType],
        };
  },
});

export type ReceiptRead = ReturnType<typeof createPrismaReceiptRead>;

export const receiptReadProvider = (prismaToken: symbol): Provider => ({
  provide: receiptRead,
  inject: [prismaToken],
  useFactory: (prisma: PrismaClient) =>
    createPrismaReceiptRead(prisma).readReceiptObject,
});
