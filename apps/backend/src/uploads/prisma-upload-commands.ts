import { randomUUID } from 'node:crypto';
import type { Prisma } from '../generated/prisma/client';
import {
  ImageAssetPurpose,
  ImageAssetState,
  ImageMediaType,
} from '../generated/prisma/enums';
import { createPendingUpload } from './create-pending-upload';
import { finalizeUpload } from './finalize-upload';
import { validateImageUploadDeclaration, type ImagePurpose } from './image-purpose';
import type { LocalObjectStorage } from './local-object-storage';
import { verifyImageBytes, type VerifiableMediaType } from './verify-image-bytes';

const purposeToPrisma: Record<ImagePurpose, ImageAssetPurpose> = {
  profile_photo: ImageAssetPurpose.PROFILE_PHOTO,
  transfer_receipt: ImageAssetPurpose.TRANSFER_RECEIPT,
  promotion: ImageAssetPurpose.PROMOTION,
};

const purposeFromPrisma: Record<ImageAssetPurpose, ImagePurpose> = {
  PROFILE_PHOTO: 'profile_photo',
  TRANSFER_RECEIPT: 'transfer_receipt',
  PROMOTION: 'promotion',
};

const mediaTypeToPrisma: Record<string, ImageMediaType> = {
  'image/jpeg': ImageMediaType.JPEG,
  'image/png': ImageMediaType.PNG,
  'image/webp': ImageMediaType.WEBP,
};

const mediaTypeFromPrisma: Record<ImageMediaType, VerifiableMediaType> = {
  JPEG: 'image/jpeg',
  PNG: 'image/png',
  WEBP: 'image/webp',
};

const stateFromPrisma: Record<
  ImageAssetState,
  'pending' | 'processing' | 'ready' | 'attached' | 'failed' | 'deleted'
> = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  READY: 'ready',
  ATTACHED: 'attached',
  FAILED: 'failed',
  DELETED: 'deleted',
};

export function createPrismaUploadCommands(
  prisma: Prisma.TransactionClient,
  storage: LocalObjectStorage,
  now: () => Date,
) {
  return {
    createPendingUpload: (command: {
      ownerAccountId: string;
      purpose: ImagePurpose;
      mediaType: string;
      byteSize: number;
      checksum: Uint8Array;
    }) =>
      createPendingUpload(command, {
        now,
        generateObjectKey: (purpose) => `pending/${purpose}/${randomUUID()}`,
        save: async (input) => {
          const created = await prisma.imageAsset.create({
            data: {
              ownerAccountId: input.ownerAccountId,
              purpose: purposeToPrisma[input.purpose],
              pendingObjectKey: input.pendingObjectKey,
              declaredMediaType: mediaTypeToPrisma[input.declaredMediaType],
              declaredByteSize: input.declaredByteSize,
              declaredChecksum: Buffer.from(input.declaredChecksum),
              createdAt: input.createdAt,
              expiresAt: input.expiresAt,
              deletionDueAt: input.deletionDueAt,
            },
            select: { id: true },
          });
          return { id: created.id };
        },
      }),

    finalizeUpload: (
      command: { imageAssetId: string },
      ownerAccountId: string,
    ) =>
      finalizeUpload(command, {
        ownerAccountId,
        loadImageAsset: async (imageAssetId) => {
          const asset = await prisma.imageAsset.findUnique({
            where: { id: imageAssetId },
            select: {
              id: true,
              ownerAccountId: true,
              purpose: true,
              state: true,
              pendingObjectKey: true,
              declaredMediaType: true,
              declaredByteSize: true,
              declaredChecksum: true,
            },
          });

          if (asset === null) return null;

          return {
            id: asset.id,
            ownerAccountId: asset.ownerAccountId,
            purpose: purposeFromPrisma[asset.purpose],
            state: stateFromPrisma[asset.state],
            pendingObjectKey: asset.pendingObjectKey,
            declaredMediaType: mediaTypeFromPrisma[asset.declaredMediaType],
            declaredByteSize: asset.declaredByteSize,
            declaredChecksum: new Uint8Array(asset.declaredChecksum),
          };
        },
        beginProcessing: async (imageAssetId) => {
          await prisma.imageAsset.updateMany({
            where: { id: imageAssetId, state: ImageAssetState.PENDING },
            data: {
              state: ImageAssetState.PROCESSING,
              processingStartedAt: now(),
            },
          });
        },
        readObject: (objectKey) => storage.get(objectKey),
        verifyBytes: (bytes, declared, purpose) => {
          const { maxAxisPixels } = validateImageUploadDeclaration({
            purpose,
            mediaType: declared.mediaType,
            byteSize: declared.byteSize,
            checksum: declared.checksum,
          });

          return verifyImageBytes(
            bytes,
            {
              mediaType: declared.mediaType as VerifiableMediaType,
              byteSize: declared.byteSize,
              checksum: declared.checksum,
            },
            maxAxisPixels,
          );
        },
        markVerified: async ({ imageAssetId, verified }) => {
          await prisma.imageAsset.update({
            where: { id: imageAssetId },
            data: {
              verifiedMediaType: mediaTypeToPrisma[verified.mediaType],
              verifiedByteSize: verified.byteSize,
              verifiedChecksum: Buffer.from(verified.checksum),
              verifiedWidth: verified.width,
              verifiedHeight: verified.height,
            },
          });
        },
        markFailed: async ({ imageAssetId, failureCode }) => {
          await prisma.imageAsset.update({
            where: { id: imageAssetId },
            data: {
              state: ImageAssetState.FAILED,
              failedAt: now(),
              failureCode,
            },
          });
        },
      }),
  };
}
