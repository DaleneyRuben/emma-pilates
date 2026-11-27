import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '../../src/generated/prisma/client';
import { toPrismaBytes } from '../../src/database/prisma-bytes';
import { hour, now } from './payment-lifecycle-test-support';

export type InvoiceAssetOptions = {
  state?: 'READY' | 'PROCESSING' | 'ATTACHED';
  purpose?: 'INVOICE' | 'TRANSFER_RECEIPT';
  mediaType?: 'PDF' | 'JPEG';
  deletedAt?: Date;
};

/**
 * An uploaded invoice file as the worker leaves it: verified, with its
 * private DOCUMENT copy when it is a PDF (FIX-044, walkthrough n.º 24).
 */
export const createInvoiceAsset = async (
  prisma: PrismaClient,
  ownerAccountId: string,
  options: InvoiceAssetOptions = {},
): Promise<string> => {
  const id = randomUUID();
  const mediaType = options.mediaType ?? 'PDF';
  await prisma.imageAsset.create({
    data: {
      id,
      ownerAccountId,
      purpose: options.purpose ?? 'INVOICE',
      state: options.state ?? 'READY',
      pendingObjectKey: `pending/invoice/${id}`,
      declaredMediaType: mediaType,
      declaredByteSize: 2_048,
      declaredChecksum: toPrismaBytes(Buffer.alloc(32, 2)),
      verifiedMediaType: mediaType,
      verifiedByteSize: 2_048,
      verifiedChecksum: toPrismaBytes(Buffer.alloc(32, 2)),
      verifiedWidth: mediaType === 'PDF' ? 0 : 800,
      verifiedHeight: mediaType === 'PDF' ? 0 : 1_200,
      createdAt: now,
      expiresAt: new Date(now.getTime() + 15 * 60 * 1_000),
      finalizedAt: now,
      deletionDueAt: new Date(now.getTime() + 72 * hour),
      deletedAt: options.deletedAt ?? null,
    },
  });
  if (mediaType === 'PDF') {
    await prisma.imageVariant.create({
      data: {
        imageAssetId: id,
        kind: 'DOCUMENT',
        visibility: 'PRIVATE',
        storageKey: `private/invoice/${id}/document`,
        mediaType: 'PDF',
        byteSize: 2_048,
        width: 0,
        height: 0,
      },
    });
  }
  return id;
};
