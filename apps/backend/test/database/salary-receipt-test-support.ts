import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '../../src/generated/prisma/client';
import { toPrismaBytes } from '../../src/database/prisma-bytes';
import { fixtureNow } from './evaluation-test-support';

// BKO-008 and finding 112: a ready photo of the transfer, uploaded by the
// Administrator who records or approves the Salary Payment it proves.
export const readySalaryReceipt = async (
  prisma: PrismaClient,
  ownerAccountId: string,
  state: 'READY' | 'PENDING' = 'READY',
) => {
  const created = new Date(fixtureNow.getTime() - 60 * 60 * 1_000);
  return prisma.imageAsset.create({
    data: {
      ownerAccountId,
      purpose: 'TRANSFER_RECEIPT',
      state,
      pendingObjectKey: `pending/transfer_receipt/${randomUUID()}`,
      declaredMediaType: 'JPEG',
      declaredByteSize: 10,
      declaredChecksum: toPrismaBytes(Buffer.alloc(32, 3)),
      verifiedMediaType: 'JPEG',
      verifiedByteSize: 10,
      verifiedChecksum: toPrismaBytes(Buffer.alloc(32, 3)),
      verifiedWidth: 1200,
      verifiedHeight: 1600,
      createdAt: created,
      expiresAt: new Date(created.getTime() + 15 * 60 * 1_000),
      finalizedAt: new Date(created.getTime() + 5 * 60 * 1_000),
      deletionDueAt: new Date(created.getTime() + 24 * 60 * 60 * 1_000),
      variants: {
        create: (['READABLE', 'THUMBNAIL'] as const).map((kind) => ({
          kind,
          visibility: 'PRIVATE',
          storageKey: `private/transfer_receipt/${randomUUID()}/${kind.toLowerCase()}`,
          mediaType: 'WEBP',
          byteSize: 3,
          width: 600,
          height: 800,
        })),
      },
    },
    include: { variants: true },
  });
};

// A receipt's id for a call that only needs the payment to carry one.
export const readySalaryReceiptId = async (
  prisma: PrismaClient,
  ownerAccountId: string,
) => (await readySalaryReceipt(prisma, ownerAccountId)).id;
