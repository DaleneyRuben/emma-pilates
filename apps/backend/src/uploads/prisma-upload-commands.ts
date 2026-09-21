import { createHash, randomUUID } from 'node:crypto';
import type { PgBoss } from 'pg-boss';
import { scheduleFinalizeUpload } from '../jobs/finalize-upload/schedule-finalize-upload';
import { retrySerializable } from '../booking/commands/retry-serializable';
import type { Prisma, PrismaClient } from '../generated/prisma/client';
import {
  ImageAssetPurpose,
  ImageAssetState,
  ImageMediaType,
} from '../generated/prisma/enums';
import { createPendingUpload } from './create-pending-upload';
import { finalizeUpload } from './finalize-upload';
import { validateImageUploadDeclaration, type ImagePurpose } from './image-purpose';
import type { LocalObjectStorage } from './local-object-storage';
import { processFinalizeUploadJob } from './process-finalize-upload-job';
import { putPendingUploadObject } from './put-pending-upload-object';
import { verifyImageBytes, type VerifiableMediaType } from './verify-image-bytes';

const finalizeUploadIdempotencyRetentionMs = 24 * 60 * 60 * 1_000;

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
  boss: Pick<PgBoss, 'send'>,
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

    putPendingUploadObject: (
      command: { imageAssetId: string; bytes: Buffer },
      ownerAccountId: string,
    ) =>
      putPendingUploadObject(command, {
        ownerAccountId,
        loadPendingObjectKey: async (imageAssetId) => {
          const asset = await prisma.imageAsset.findUnique({
            where: { id: imageAssetId },
            select: { ownerAccountId: true, pendingObjectKey: true, state: true },
          });

          if (asset === null) return null;

          return {
            ownerAccountId: asset.ownerAccountId,
            pendingObjectKey: asset.pendingObjectKey,
            state: stateFromPrisma[asset.state],
          };
        },
        writeObject: (objectKey, bytes) => storage.put(objectKey, bytes),
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
            select: { id: true, ownerAccountId: true, state: true },
          });

          if (asset === null) return null;

          return {
            id: asset.id,
            ownerAccountId: asset.ownerAccountId,
            state: stateFromPrisma[asset.state],
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
        enqueueFinalization: async (imageAssetId) => {
          await scheduleFinalizeUpload(boss, prisma, {
            version: 1,
            imageAssetId,
          });
        },
      }),
  };
}

export function createFinalizeUploadJobCommands(
  prisma: Prisma.TransactionClient,
  storage: LocalObjectStorage,
  now: () => Date,
) {
  return {
    process: (job: { imageAssetId: string }) =>
      processFinalizeUploadJob(job, {
        loadImageAsset: async (imageAssetId) => {
          const asset = await prisma.imageAsset.findUnique({
            where: { id: imageAssetId },
            select: {
              id: true,
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
            purpose: purposeFromPrisma[asset.purpose],
            state: stateFromPrisma[asset.state],
            pendingObjectKey: asset.pendingObjectKey,
            declaredMediaType: mediaTypeFromPrisma[asset.declaredMediaType],
            declaredByteSize: asset.declaredByteSize,
            declaredChecksum: new Uint8Array(asset.declaredChecksum),
          };
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
              state: ImageAssetState.READY,
              finalizedAt: now(),
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

type FinalizeUploadResponse = { id: string; state: string };

const isFinalizeUploadResponse = (
  value: unknown,
): value is FinalizeUploadResponse =>
  typeof value === 'object' &&
  value !== null &&
  'id' in value &&
  'state' in value &&
  typeof value.id === 'string' &&
  typeof value.state === 'string';

export function createFinalizeUploadIdempotent(
  prisma: PrismaClient,
  storage: LocalObjectStorage,
  now: () => Date,
  boss: Pick<PgBoss, 'send'>,
) {
  return async (
    command: { imageAssetId: string },
    ownerAccountId: string,
    idempotencyKey: string,
  ): Promise<FinalizeUploadResponse> => {
    const requestHash = createHash('sha256')
      .update(JSON.stringify({ imageAssetId: command.imageAssetId }))
      .digest();

    return retrySerializable(() =>
      prisma.$transaction(
        async (transaction) => {
          const existing = await transaction.idempotencyRecord.findUnique({
            where: {
              accountId_command_idempotencyKey: {
                accountId: ownerAccountId,
                command: 'finalize_upload',
                idempotencyKey,
              },
            },
            select: { requestHash: true, responseBody: true },
          });

          if (existing !== null) {
            if (!Buffer.from(existing.requestHash).equals(requestHash)) {
              throw new Error(
                'Idempotency Key was reused with a different request',
              );
            }

            if (!isFinalizeUploadResponse(existing.responseBody)) {
              throw new Error('Stored idempotency response is invalid');
            }

            return existing.responseBody;
          }

          await createPrismaUploadCommands(
            transaction,
            storage,
            now,
            boss,
          ).finalizeUpload(command, ownerAccountId);

          const asset = await transaction.imageAsset.findUniqueOrThrow({
            where: { id: command.imageAssetId },
            select: { id: true, state: true },
          });
          const response: FinalizeUploadResponse = {
            id: asset.id,
            state: stateFromPrisma[asset.state],
          };

          await transaction.idempotencyRecord.create({
            data: {
              accountId: ownerAccountId,
              command: 'finalize_upload',
              idempotencyKey,
              requestHash,
              responseStatus: 202,
              responseBody: response,
              expiresAt: new Date(
                now().getTime() + finalizeUploadIdempotencyRetentionMs,
              ),
            },
          });

          return response;
        },
        { isolationLevel: 'Serializable' },
      ),
    );
  };
}
