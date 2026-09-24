import { randomUUID } from 'node:crypto';
import type { Prisma, PrismaClient } from '../generated/prisma/client';
import {
  ImageAssetPurpose,
  ImageAssetState,
  ImageMediaType,
  ImageVariantVisibility,
} from '../generated/prisma/enums';
import type { ImagePurpose } from './image-purpose';
import type { ImageVariantKind } from './image-variants';
import type { LocalObjectStorage } from './local-object-storage';

type Transaction = Prisma.TransactionClient;

// The uploads-owned slice an owning context (Promotions, profiles) calls
// inside its own transaction to take, drop, publish, or unpublish an image
// (ADR-0026 states, ADR-0076 detachment, ADR-0077 public delivery).

export type ImageAssetNotAttachableReason =
  'not_found' | 'not_owned' | 'wrong_purpose' | 'not_ready';

export class ImageAssetNotAttachableError extends Error {
  constructor(readonly reason: ImageAssetNotAttachableReason) {
    super(`Image asset is not attachable: ${reason}`);
    this.name = 'ImageAssetNotAttachableError';
  }
}

const purposeToPrisma: Record<ImagePurpose, ImageAssetPurpose> = {
  profile_photo: ImageAssetPurpose.PROFILE_PHOTO,
  transfer_receipt: ImageAssetPurpose.TRANSFER_RECEIPT,
  promotion: ImageAssetPurpose.PROMOTION,
};

const mediaTypes: Record<ImageMediaType, string> = {
  [ImageMediaType.JPEG]: 'image/jpeg',
  [ImageMediaType.PNG]: 'image/png',
  [ImageMediaType.WEBP]: 'image/webp',
};

export const attachImageAsset = async (
  tx: Transaction,
  input: {
    imageAssetId: string;
    ownerAccountId: string;
    purpose: ImagePurpose;
    now: Date;
  },
): Promise<void> => {
  const asset = await tx.imageAsset.findUnique({
    where: { id: input.imageAssetId },
    select: { ownerAccountId: true, purpose: true, state: true },
  });
  if (asset === null) throw new ImageAssetNotAttachableError('not_found');
  if (asset.ownerAccountId !== input.ownerAccountId) {
    throw new ImageAssetNotAttachableError('not_owned');
  }
  if (asset.purpose !== purposeToPrisma[input.purpose]) {
    throw new ImageAssetNotAttachableError('wrong_purpose');
  }
  if (asset.state !== ImageAssetState.READY) {
    throw new ImageAssetNotAttachableError('not_ready');
  }
  await tx.imageAsset.update({
    where: { id: input.imageAssetId },
    data: {
      state: ImageAssetState.ATTACHED,
      attachedAt: input.now,
      deletionDueAt: null,
    },
  });
};

// The sweep deletes the objects and marks the rows; the asset keeps its
// metadata tombstone (ADR-0076).
export const detachImageAsset = async (
  tx: Transaction,
  input: { imageAssetId: string; now: Date },
): Promise<void> => {
  await tx.imageVariant.updateMany({
    where: { imageAssetId: input.imageAssetId, deleteRequestedAt: null },
    data: { deleteRequestedAt: input.now },
  });
  await tx.imageAsset.update({
    where: { id: input.imageAssetId },
    data: { deleteRequestedAt: input.now },
  });
};

export type PublicImageVariant = {
  kind: ImageVariantKind;
  storageKey: string;
  deliveryVersion: string;
  mediaType: string;
  width: number;
  height: number;
};

const kindName = (kind: string): ImageVariantKind =>
  kind.toLowerCase() as ImageVariantKind;

// Every publication writes fresh versioned keys, so cached URLs never change
// meaning (ADR-0077); the previous public copies are retired first.
export const publishImageVariants = async (
  tx: Transaction,
  storage: Pick<LocalObjectStorage, 'get' | 'replace'>,
  input: { imageAssetId: string; now: Date },
): Promise<void> => {
  await unpublishImageVariants(tx, input);
  const privateVariants = await tx.imageVariant.findMany({
    where: {
      imageAssetId: input.imageAssetId,
      visibility: ImageVariantVisibility.PRIVATE,
      deleteRequestedAt: null,
      deletedAt: null,
    },
    orderBy: { width: 'asc' },
  });
  for (const variant of privateVariants) {
    const deliveryVersion = randomUUID();
    const storageKey = `public/promotion/${input.imageAssetId}/${kindName(variant.kind)}-${deliveryVersion}`;
    await storage.replace(storageKey, await storage.get(variant.storageKey));
    await tx.imageVariant.create({
      data: {
        imageAssetId: input.imageAssetId,
        kind: variant.kind,
        visibility: ImageVariantVisibility.PUBLIC,
        deliveryVersion,
        storageKey,
        mediaType: variant.mediaType,
        byteSize: variant.byteSize,
        width: variant.width,
        height: variant.height,
        createdAt: input.now,
      },
    });
  }
};

export const unpublishImageVariants = async (
  tx: Transaction,
  input: { imageAssetId: string; now: Date },
): Promise<void> => {
  await tx.imageVariant.updateMany({
    where: {
      imageAssetId: input.imageAssetId,
      visibility: ImageVariantVisibility.PUBLIC,
      deleteRequestedAt: null,
    },
    data: { deleteRequestedAt: input.now },
  });
};

export const readPublicImageVariants = async (
  prisma: Pick<PrismaClient, 'imageVariant'>,
  imageAssetIds: readonly string[],
): Promise<Map<string, PublicImageVariant[]>> => {
  const rows = await prisma.imageVariant.findMany({
    where: {
      imageAssetId: { in: [...imageAssetIds] },
      visibility: ImageVariantVisibility.PUBLIC,
      deleteRequestedAt: null,
      deletedAt: null,
    },
    orderBy: [{ imageAssetId: 'asc' }, { width: 'asc' }],
  });
  const byAsset = new Map<string, PublicImageVariant[]>();
  for (const row of rows) {
    const list = byAsset.get(row.imageAssetId) ?? [];
    list.push({
      kind: kindName(row.kind),
      storageKey: row.storageKey,
      deliveryVersion: row.deliveryVersion,
      mediaType: mediaTypes[row.mediaType],
      width: row.width,
      height: row.height,
    });
    byAsset.set(row.imageAssetId, list);
  }
  return byAsset;
};

// The public delivery route serves exactly one live public copy per key.
export const readPublicImageVariant = async (
  prisma: Pick<PrismaClient, 'imageVariant'>,
  input: {
    imageAssetId: string;
    kind: ImageVariantKind;
    deliveryVersion: string;
  },
): Promise<{ storageKey: string; mediaType: string } | null> => {
  const row = await prisma.imageVariant.findFirst({
    where: {
      imageAssetId: input.imageAssetId,
      kind: input.kind.toUpperCase() as never,
      visibility: ImageVariantVisibility.PUBLIC,
      deliveryVersion: input.deliveryVersion,
      deleteRequestedAt: null,
      deletedAt: null,
    },
    select: { storageKey: true, mediaType: true },
  });
  return row === null
    ? null
    : { storageKey: row.storageKey, mediaType: mediaTypes[row.mediaType] };
};
