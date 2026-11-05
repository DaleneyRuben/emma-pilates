import { randomUUID } from 'node:crypto';
import { retrySerializable } from '../../../database/retry-serializable';
import type { Prisma, PrismaClient } from '../../../generated/prisma/client';
import {
  AuditActorKind,
  AuditOutcome,
  ImageVariantKind,
  ImageVariantVisibility,
} from '../../../generated/prisma/enums';
import {
  attachImageAsset,
  detachImageAsset,
  imageMediaTypes,
} from '../../../uploads/image-asset-attachments';
import type {
  StaffPhotoChange,
  StaffPhotoGateway,
  StaffPhotoVariant,
} from './staff-photo';

type Transaction = Prisma.TransactionClient;

const variantKinds: Record<StaffPhotoVariant, ImageVariantKind> = {
  display: ImageVariantKind.DISPLAY,
  thumbnail: ImageVariantKind.THUMBNAIL,
};

const serializable = { isolationLevel: 'Serializable' } as const;

// FIX-041: the Booking-owned `staff_members.profile_image_asset_id` over the
// uploads-owned attach and detach slice (ADR-0076), audited on the member's
// Account as `staff_member.photo_changed` / `staff_member.photo_removed`
// with whoever changed it (herself, the Administrator, or the Coordinator).
export const createPrismaStaffPhoto = (
  prisma: PrismaClient,
): StaffPhotoGateway => {
  const recordAudit = (
    transaction: Transaction,
    change: StaffPhotoChange,
    actionCode: 'staff_member.photo_changed' | 'staff_member.photo_removed',
    metadata: Prisma.InputJsonObject | undefined,
  ) =>
    transaction.auditRecord.create({
      data: {
        actionCode,
        outcome: AuditOutcome.SUCCEEDED,
        actorKind: AuditActorKind.ACCOUNT,
        actorAccountId: change.actor.accountId,
        actorRole: change.actor.role,
        impersonationId: change.actor.impersonationId,
        targetType: 'account',
        targetId: change.targetAccountId,
        correlationId: randomUUID(),
        metadata,
        occurredAt: change.now,
      },
    });

  const currentPhoto = async (
    transaction: Transaction,
    staffMemberId: string,
  ) =>
    (
      await transaction.staffMember.findUniqueOrThrow({
        where: { id: staffMemberId },
        select: { profileImageAssetId: true },
      })
    ).profileImageAssetId;

  return {
    findMember: async (staffMemberId) => {
      const member = await prisma.staffMember.findFirst({
        where: { id: staffMemberId, deletedAt: null },
        select: {
          id: true,
          account: {
            select: { id: true, activatedAt: true, disabledAt: true },
          },
        },
      });
      if (member === null || member.account === null) return null;
      const { account } = member;
      return {
        id: member.id,
        accountId: account.id,
        status:
          account.disabledAt !== null
            ? 'deactivated'
            : account.activatedAt === null
              ? 'pending'
              : 'active',
      };
    },

    replacePhoto: async (input) => {
      await retrySerializable(() =>
        prisma.$transaction(async (transaction) => {
          const current = await currentPhoto(transaction, input.staffMemberId);
          if (current === input.imageAssetId) return;
          await attachImageAsset(transaction, {
            imageAssetId: input.imageAssetId,
            ownerAccountId: input.ownerAccountId,
            purpose: 'profile_photo',
            now: input.now,
          });
          await transaction.staffMember.update({
            where: { id: input.staffMemberId },
            data: { profileImageAssetId: input.imageAssetId },
          });
          if (current !== null) {
            await detachImageAsset(transaction, {
              imageAssetId: current,
              now: input.now,
            });
          }
          await recordAudit(transaction, input, 'staff_member.photo_changed', {
            replaced: current !== null,
          });
        }, serializable),
      );
      return { imageAssetId: input.imageAssetId };
    },

    removePhoto: async (input) => {
      await retrySerializable(() =>
        prisma.$transaction(async (transaction) => {
          const current = await currentPhoto(transaction, input.staffMemberId);
          if (current === null) return;
          await transaction.staffMember.update({
            where: { id: input.staffMemberId },
            data: { profileImageAssetId: null },
          });
          await detachImageAsset(transaction, {
            imageAssetId: current,
            now: input.now,
          });
          await recordAudit(
            transaction,
            input,
            'staff_member.photo_removed',
            undefined,
          );
        }, serializable),
      );
    },

    readPhotoObject: async (input) => {
      const member = await prisma.staffMember.findUnique({
        where: { profileImageAssetId: input.imageAssetId },
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
      const variant = member?.profileImageAsset?.variants[0];
      return variant === undefined
        ? null
        : {
            objectKey: variant.storageKey,
            mediaType: imageMediaTypes[variant.mediaType],
          };
    },
  };
};
