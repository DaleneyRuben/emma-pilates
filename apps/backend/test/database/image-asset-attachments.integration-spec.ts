import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createPrismaAdapter } from '../../src/database/prisma-adapter';
import { toPrismaBytes } from '../../src/database/prisma-bytes';
import {
  attachImageAsset,
  detachImageAsset,
  ImageAssetNotAttachableError,
  publishImageVariants,
  readPublicImageVariants,
  unpublishImageVariants,
} from '../../src/uploads/image-asset-attachments';
import { LocalObjectStorage } from '../../src/uploads/local-object-storage';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const now = new Date('2026-09-24T15:00:00.000Z');

// The uploads-owned slice Booking uses to attach, detach, publish, and
// unpublish an image (ADR-0076, ADR-0077).
describe('image asset attachments (PostgreSQL)', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  let storageRoot: string;
  let storage: LocalObjectStorage;
  let ownerAccountId: string;

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({
      adapter: createPrismaAdapter(context.databaseUrl),
    });
    storageRoot = await mkdtemp(join(tmpdir(), 'pilates-attachments-'));
    storage = new LocalObjectStorage(storageRoot);
    const client = await prisma.client.create({
      data: { name: 'Paola', referralCode: randomUUID().slice(0, 8) },
    });
    ownerAccountId = (
      await prisma.account.create({
        data: { email: `${randomUUID()}@example.com`, clientId: client.id },
      })
    ).id;
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
    await rm(storageRoot, { recursive: true, force: true });
  });

  const readyPromotionImage = async (
    state: 'READY' | 'PENDING' | 'ATTACHED' = 'READY',
    purpose: 'PROMOTION' | 'TRANSFER_RECEIPT' = 'PROMOTION',
  ) => {
    const asset = await prisma.imageAsset.create({
      data: {
        ownerAccountId,
        purpose,
        state,
        pendingObjectKey: `pending/promotion/${randomUUID()}`,
        declaredMediaType: 'PNG',
        declaredByteSize: 10,
        declaredChecksum: toPrismaBytes(Buffer.alloc(32, 2)),
        createdAt: now,
        expiresAt: now,
        deletionDueAt: now,
        variants: {
          create: ['PROMOTION_480', 'PROMOTION_960', 'PROMOTION_1440'].map(
            (kind, index) => ({
              kind: kind as 'PROMOTION_480',
              visibility: 'PRIVATE',
              storageKey: `private/promotion/${randomUUID()}/${kind.toLowerCase()}`,
              mediaType: 'WEBP',
              byteSize: 3,
              width: 480 * (index + 1),
              height: 270 * (index + 1),
            }),
          ),
        },
      },
      include: { variants: true },
    });
    for (const variant of asset.variants) {
      await storage.put(variant.storageKey, Buffer.from(variant.kind));
    }
    return asset;
  };

  it('attaches a ready image of the right purpose owned by the actor and clears its cleanup deadline', async () => {
    const asset = await readyPromotionImage();

    await prisma.$transaction((tx) =>
      attachImageAsset(tx, {
        imageAssetId: asset.id,
        ownerAccountId,
        purpose: 'promotion',
        now,
      }),
    );

    const reloaded = await prisma.imageAsset.findUniqueOrThrow({
      where: { id: asset.id },
    });
    expect(reloaded.state).toBe('ATTACHED');
    expect(reloaded.attachedAt).toEqual(now);
    expect(reloaded.deletionDueAt).toBeNull();
  });

  it('refuses an image that is not ready, has another purpose, or belongs to someone else', async () => {
    const attach = (imageAssetId: string, owner = ownerAccountId) =>
      prisma.$transaction((tx) =>
        attachImageAsset(tx, {
          imageAssetId,
          ownerAccountId: owner,
          purpose: 'promotion',
          now,
        }),
      );
    await expect(
      attach((await readyPromotionImage('PENDING')).id),
    ).rejects.toThrow(ImageAssetNotAttachableError);
    await expect(
      attach((await readyPromotionImage('READY', 'TRANSFER_RECEIPT')).id),
    ).rejects.toThrow(ImageAssetNotAttachableError);
    await expect(
      attach((await readyPromotionImage()).id, randomUUID()),
    ).rejects.toThrow(ImageAssetNotAttachableError);
    await expect(attach(randomUUID())).rejects.toThrow(
      ImageAssetNotAttachableError,
    );
  });

  it('publishes versioned public copies of every private variant and lists them, then unpublishes them', async () => {
    const asset = await readyPromotionImage('ATTACHED');

    await prisma.$transaction((tx) =>
      publishImageVariants(tx, storage, { imageAssetId: asset.id, now }),
    );

    const published = await readPublicImageVariants(prisma, [asset.id]);
    expect(
      published.get(asset.id)?.map((v) => [v.kind, v.width, v.height]),
    ).toEqual([
      ['promotion_480', 480, 270],
      ['promotion_960', 960, 540],
      ['promotion_1440', 1440, 810],
    ]);
    for (const variant of published.get(asset.id) ?? []) {
      expect(variant.storageKey).toMatch(
        new RegExp(
          `^public/promotion/${asset.id}/${variant.kind}-[0-9a-f-]{36}$`,
        ),
      );
      expect(variant.mediaType).toBe('image/webp');
      await expect(storage.get(variant.storageKey)).resolves.toEqual(
        Buffer.from(variant.kind.toUpperCase()),
      );
    }

    await prisma.$transaction((tx) =>
      unpublishImageVariants(tx, { imageAssetId: asset.id, now }),
    );

    expect((await readPublicImageVariants(prisma, [asset.id])).size).toBe(0);
    const rows = await prisma.imageVariant.findMany({
      where: { imageAssetId: asset.id, visibility: 'PUBLIC' },
    });
    expect(rows).toHaveLength(3);
    expect(
      rows.every((row) => row.deleteRequestedAt?.getTime() === now.getTime()),
    ).toBe(true);
    const privateRows = await prisma.imageVariant.findMany({
      where: { imageAssetId: asset.id, visibility: 'PRIVATE' },
    });
    expect(privateRows.every((row) => row.deleteRequestedAt === null)).toBe(
      true,
    );
  });

  it('publishing twice keeps one live public copy per kind', async () => {
    const asset = await readyPromotionImage('ATTACHED');
    await prisma.$transaction((tx) =>
      publishImageVariants(tx, storage, { imageAssetId: asset.id, now }),
    );
    await prisma.$transaction((tx) =>
      publishImageVariants(tx, storage, { imageAssetId: asset.id, now }),
    );

    expect(
      (await readPublicImageVariants(prisma, [asset.id])).get(asset.id),
    ).toHaveLength(3);
  });

  it('detaching requests the deletion of the asset and every variant', async () => {
    const asset = await readyPromotionImage('ATTACHED');
    await prisma.$transaction((tx) =>
      publishImageVariants(tx, storage, { imageAssetId: asset.id, now }),
    );

    await prisma.$transaction((tx) =>
      detachImageAsset(tx, { imageAssetId: asset.id, now }),
    );

    const reloaded = await prisma.imageAsset.findUniqueOrThrow({
      where: { id: asset.id },
      include: { variants: true },
    });
    expect(reloaded.deleteRequestedAt).toEqual(now);
    expect(reloaded.variants).toHaveLength(6);
    expect(reloaded.variants.every((v) => v.deleteRequestedAt !== null)).toBe(
      true,
    );
  });
});
