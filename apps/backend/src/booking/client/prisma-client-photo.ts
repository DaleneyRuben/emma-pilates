import { randomUUID } from 'node:crypto';
import { retrySerializable } from '../../database/retry-serializable';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import {
  AuditActorKind,
  AuditOutcome,
  ImageVariantKind,
  ImageVariantVisibility,
} from '../../generated/prisma/enums';
import {
  attachImageAsset,
  detachImageAsset,
  imageMediaTypes,
} from '../../uploads/image-asset-attachments';
import { createCatalogRepository } from '../catalog/prisma-catalog-repository';
import type { ClientPhotoGateway, ClientPhotoVariant } from './client-photo';

type Transaction = Prisma.TransactionClient;

const variantKinds: Record<ClientPhotoVariant, ImageVariantKind> = {
  display: ImageVariantKind.DISPLAY,
  thumbnail: ImageVariantKind.THUMBNAIL,
};

const serializable = { isolationLevel: 'Serializable' } as const;

// The Client's own photo (MOB-020): the Booking-owned `profile_image_asset_id`
// over the uploads-owned attach and detach slice (ADR-0076), audited as
// `client.photo_changed` / `client.photo_removed`.
export const createPrismaClientPhoto = (
  prisma: PrismaClient,
): ClientPhotoGateway => {
  const repository = createCatalogRepository(prisma);

  const recordAudit = (
    transaction: Transaction,
    input: {
      actionCode: 'client.photo_changed' | 'client.photo_removed';
      accountId: string;
      clientId: string;
      metadata: Prisma.InputJsonObject | undefined;
      now: Date;
    },
  ) =>
    transaction.auditRecord.create({
      data: {
        actionCode: input.actionCode,
        outcome: AuditOutcome.SUCCEEDED,
        actorKind: AuditActorKind.ACCOUNT,
        actorAccountId: input.accountId,
        targetType: 'client',
        targetId: input.clientId,
        correlationId: randomUUID(),
        metadata: input.metadata,
        occurredAt: input.now,
      },
    });

  const currentPhoto = async (transaction: Transaction, clientId: string) =>
    await transaction.client.findUniqueOrThrow({
      where: { id: clientId },
      select: { profileImageAssetId: true, account: { select: { id: true } } },
    });

  return {
    replacePhoto: async (input) => {
      await retrySerializable(() =>
        prisma.$transaction(async (transaction) => {
          const current = await currentPhoto(transaction, input.clientId);
          if (current.profileImageAssetId === input.imageAssetId) return;
          await attachImageAsset(transaction, {
            imageAssetId: input.imageAssetId,
            ownerAccountId: input.ownerAccountId,
            purpose: 'profile_photo',
            now: input.now,
          });
          await transaction.client.update({
            where: { id: input.clientId },
            data: { profileImageAssetId: input.imageAssetId },
          });
          if (current.profileImageAssetId !== null) {
            await detachImageAsset(transaction, {
              imageAssetId: current.profileImageAssetId,
              now: input.now,
            });
          }
          await recordAudit(transaction, {
            actionCode: 'client.photo_changed',
            accountId: input.ownerAccountId,
            clientId: input.clientId,
            metadata: { replaced: current.profileImageAssetId !== null },
            now: input.now,
          });
        }, serializable),
      );
      const profile = await repository.findClientProfile(input.clientId);
      if (profile === null) throw new Error('Client has no Account');
      return profile;
    },

    removePhoto: async (input) => {
      await retrySerializable(() =>
        prisma.$transaction(async (transaction) => {
          const current = await currentPhoto(transaction, input.clientId);
          if (
            current.profileImageAssetId === null ||
            current.account === null
          ) {
            return;
          }
          await transaction.client.update({
            where: { id: input.clientId },
            data: { profileImageAssetId: null },
          });
          await detachImageAsset(transaction, {
            imageAssetId: current.profileImageAssetId,
            now: input.now,
          });
          await recordAudit(transaction, {
            actionCode: 'client.photo_removed',
            accountId: current.account.id,
            clientId: input.clientId,
            metadata: undefined,
            now: input.now,
          });
        }, serializable),
      );
    },

    readPhotoObject: async (input) => {
      const client = await prisma.client.findUnique({
        where: { id: input.clientId },
        select: {
          profileImageAsset: {
            select: {
              variants: {
                where: {
                  kind: variantKinds[input.variant],
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
      });
      const variant = client?.profileImageAsset?.variants[0];
      return variant === undefined
        ? null
        : {
            objectKey: variant.storageKey,
            mediaType: imageMediaTypes[variant.mediaType],
          };
    },
  };
};
