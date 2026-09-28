import type { Prisma } from '../generated/prisma/client';
import {
  ImageMediaType,
  ImageVariantKind,
  ImageVariantVisibility,
} from '../generated/prisma/enums';
import type { StoredImageVariant } from './process-finalize-upload-job';

export const mediaTypeToPrisma: Record<string, ImageMediaType> = {
  'image/jpeg': ImageMediaType.JPEG,
  'image/png': ImageMediaType.PNG,
  'image/webp': ImageMediaType.WEBP,
};

const variantKindToPrisma: Record<string, ImageVariantKind> = {
  thumbnail: ImageVariantKind.THUMBNAIL,
  display: ImageVariantKind.DISPLAY,
  readable: ImageVariantKind.READABLE,
  promotion_480: ImageVariantKind.PROMOTION_480,
  promotion_960: ImageVariantKind.PROMOTION_960,
  promotion_1440: ImageVariantKind.PROMOTION_1440,
};

// A retried job reuses the rows of the keys it writes again and marks the
// others removed (ADR-0086), so no earlier row is ever deleted.
export const recordVerifiedVariants = async (
  prisma: Prisma.TransactionClient,
  input: {
    imageAssetId: string;
    variants: StoredImageVariant[];
    verifiedAt: Date;
  },
): Promise<void> => {
  await prisma.imageVariant.updateMany({
    where: {
      imageAssetId: input.imageAssetId,
      deletedAt: null,
      storageKey: { notIn: input.variants.map((v) => v.storageKey) },
    },
    data: { deleteRequestedAt: input.verifiedAt, deletedAt: input.verifiedAt },
  });
  for (const variant of input.variants) {
    const recorded = {
      kind: variantKindToPrisma[variant.kind],
      visibility: ImageVariantVisibility.PRIVATE,
      mediaType: mediaTypeToPrisma[variant.mediaType],
      byteSize: variant.byteSize,
      width: variant.width,
      height: variant.height,
    };
    await prisma.imageVariant.upsert({
      where: { storageKey: variant.storageKey },
      create: {
        ...recorded,
        imageAssetId: input.imageAssetId,
        storageKey: variant.storageKey,
      },
      // The key holds the new bytes, so its row is live again.
      update: { ...recorded, deleteRequestedAt: null, deletedAt: null },
    });
  }
};
