import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '../../src/generated/prisma/client';
import { toPrismaBytes } from '../../src/database/prisma-bytes';

// FIX-041: gives a Client a ready profile photo with its variants, the way
// MOB-020 leaves one, so a Staff read model can be shown to name it. The
// photo's owner is the Client's Account, or a new one when she has none.
export const attachClientPhoto = async (
  prisma: PrismaClient,
  clientId: string,
): Promise<string> => {
  const now = new Date();
  const account =
    (await prisma.account.findFirst({ where: { clientId } })) ??
    (await prisma.account.create({
      data: { email: `${randomUUID()}@example.com`, clientId },
    }));
  const asset = await prisma.imageAsset.create({
    data: {
      ownerAccountId: account.id,
      purpose: 'PROFILE_PHOTO',
      state: 'READY',
      pendingObjectKey: `pending/profile_photo/${randomUUID()}`,
      declaredMediaType: 'JPEG',
      declaredByteSize: 10,
      declaredChecksum: toPrismaBytes(Buffer.alloc(32, 1)),
      createdAt: new Date(now.getTime() - 60_000),
      expiresAt: new Date(now.getTime() + 60_000),
      finalizedAt: new Date(now.getTime() - 30_000),
      deletionDueAt: new Date(now.getTime() + 24 * 60 * 60_000),
      variants: {
        create: (['DISPLAY', 'THUMBNAIL'] as const).map((kind) => ({
          kind,
          visibility: 'PRIVATE' as const,
          storageKey: `private/profile_photo/${randomUUID()}/${kind.toLowerCase()}`,
          mediaType: 'JPEG' as const,
          byteSize: 3,
          width: kind === 'DISPLAY' ? 320 : 96,
          height: kind === 'DISPLAY' ? 320 : 96,
        })),
      },
    },
  });
  await prisma.client.update({
    where: { id: clientId },
    data: { profileImageAssetId: asset.id },
  });
  return asset.id;
};
