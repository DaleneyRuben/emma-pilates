import type { Prisma } from '../generated/prisma/client';
import {
  ImageVariantKind,
  ImageVariantVisibility,
} from '../generated/prisma/enums';
import { imageMediaTypes } from './image-asset-attachments';

// UPL-002: a private receipt is served as the rebuilt variant that fits the
// screen (ADR-0073). One finalized before variants existed still has its
// original object, so that is served instead.
export type ReceiptVariant = 'readable' | 'thumbnail';
export const receiptVariants: readonly ReceiptVariant[] = [
  'readable',
  'thumbnail',
];

const variantKinds: Record<ReceiptVariant, ImageVariantKind> = {
  readable: ImageVariantKind.READABLE,
  thumbnail: ImageVariantKind.THUMBNAIL,
};

export const isReceiptVariant = (value: unknown): value is ReceiptVariant =>
  typeof value === 'string' &&
  (receiptVariants as readonly string[]).includes(value);

// The asset fields an owning context selects to serve one receipt variant.
export const receiptObjectSelect = (variant: ReceiptVariant) =>
  ({
    pendingObjectKey: true,
    deletedAt: true,
    declaredMediaType: true,
    verifiedMediaType: true,
    variants: {
      where: {
        kind: variantKinds[variant],
        visibility: ImageVariantVisibility.PRIVATE,
        deleteRequestedAt: null,
        deletedAt: null,
      },
      select: { storageKey: true, mediaType: true },
      take: 1,
    },
  }) satisfies Prisma.ImageAssetSelect;

type ReceiptAsset = Prisma.ImageAssetGetPayload<{
  select: ReturnType<typeof receiptObjectSelect>;
}>;

// Null when the asset is gone; the owning context names its own problem.
export const receiptObject = (
  asset: ReceiptAsset | null | undefined,
): { objectKey: string; mediaType: string } | null => {
  if (asset === null || asset === undefined || asset.deletedAt !== null) {
    return null;
  }
  const variant = asset.variants[0];
  return variant === undefined
    ? {
        objectKey: asset.pendingObjectKey,
        mediaType:
          imageMediaTypes[asset.verifiedMediaType ?? asset.declaredMediaType],
      }
    : {
        objectKey: variant.storageKey,
        mediaType: imageMediaTypes[variant.mediaType],
      };
};
