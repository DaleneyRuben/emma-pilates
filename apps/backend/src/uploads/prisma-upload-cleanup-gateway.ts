import type { PrismaClient } from '../generated/prisma/client';
import {
  ImageAssetPurpose,
  ImageAssetState,
} from '../generated/prisma/enums';
import type { AbandonedUpload } from './cleanup-abandoned-uploads';
import type { LocalObjectStorage } from './local-object-storage';

export function createUploadCleanupGateway(
  prisma: PrismaClient,
  storage: LocalObjectStorage,
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

        return tx.imageAsset.findMany({
          where: { deletedAt: null, deleteRequestedAt: { not: null } },
          select: { id: true, pendingObjectKey: true },
        });
      }),
    deleteObject: (objectKey: string) => storage.delete(objectKey),
    markDeleted: async (imageAssetId: string, deletedAt: Date) => {
      await prisma.imageAsset.update({
        where: { id: imageAssetId },
        data: { deletedAt, state: ImageAssetState.DELETED },
      });
    },
  };
}
