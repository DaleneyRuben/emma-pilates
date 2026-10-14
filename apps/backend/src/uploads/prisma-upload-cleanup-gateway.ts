import type { PrismaClient } from '../generated/prisma/client';
import { ImageAssetPurpose, ImageAssetState } from '../generated/prisma/enums';
import type {
  AbandonedUpload,
  DetachedVariant,
} from './cleanup-abandoned-uploads';
import type { ObjectStorage } from './object-storage';

export function createUploadCleanupGateway(
  prisma: PrismaClient,
  storage: ObjectStorage,
) {
  return {
    markDueForDeletion: async (now: Date): Promise<AbandonedUpload[]> =>
      prisma.$transaction(async (tx) => {
        // Attached assets are kept, except transfer receipts whose retention
        // ended after the Payment decision; their metadata tombstone remains.
        await tx.imageAsset.updateMany({
          where: {
            deletionDueAt: { lte: now },
            deletedAt: null,
            deleteRequestedAt: null,
            OR: [
              { state: { not: ImageAssetState.ATTACHED } },
              {
                state: ImageAssetState.ATTACHED,
                purpose: ImageAssetPurpose.TRANSFER_RECEIPT,
              },
            ],
          },
          data: { deleteRequestedAt: now },
        });

        const due = await tx.imageAsset.findMany({
          where: { deletedAt: null, deleteRequestedAt: { not: null } },
          select: {
            id: true,
            pendingObjectKey: true,
            variants: {
              where: { deletedAt: null },
              select: { storageKey: true },
            },
          },
        });
        return due.map((asset) => ({
          id: asset.id,
          pendingObjectKey: asset.pendingObjectKey,
          variantObjectKeys: asset.variants.map((v) => v.storageKey),
        }));
      }),
    listDetachedVariants: (): Promise<DetachedVariant[]> =>
      prisma.imageVariant.findMany({
        where: {
          deletedAt: null,
          deleteRequestedAt: { not: null },
          imageAsset: { deleteRequestedAt: null },
        },
        select: { id: true, storageKey: true },
      }),
    deleteObject: (objectKey: string) => storage.delete(objectKey),
    markDeleted: async (imageAssetId: string, deletedAt: Date) => {
      await prisma.$transaction([
        prisma.imageVariant.updateMany({
          where: { imageAssetId, deletedAt: null },
          data: { deletedAt, deleteRequestedAt: deletedAt },
        }),
        prisma.imageAsset.update({
          where: { id: imageAssetId },
          data: { deletedAt, state: ImageAssetState.DELETED },
        }),
      ]);
    },
    markVariantsDeleted: async (variantIds: string[], deletedAt: Date) => {
      await prisma.imageVariant.updateMany({
        where: { id: { in: variantIds } },
        data: { deletedAt },
      });
    },
  };
}
