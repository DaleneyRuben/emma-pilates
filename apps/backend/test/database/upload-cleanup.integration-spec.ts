import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import {
  ImageAssetState,
  ImageMediaType,
} from '../../src/generated/prisma/enums';
import { cleanupAbandonedUploads } from '../../src/uploads/cleanup-abandoned-uploads';
import { LocalObjectStorage } from '../../src/uploads/local-object-storage';
import { createUploadCleanupGateway } from '../../src/uploads/prisma-upload-cleanup-gateway';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

describe('Upload cleanup gateway', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  let storageRoot: string;
  let storage: LocalObjectStorage;
  const createdAccountIds: string[] = [];
  const createdClientIds: string[] = [];

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({ adapter: new PrismaPg(context.pool) });
    storageRoot = await mkdtemp(join(tmpdir(), 'pilates-cleanup-'));
    storage = new LocalObjectStorage(storageRoot);
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
    await rm(storageRoot, { recursive: true, force: true });
  });

  afterEach(async () => {
    await prisma.imageVariant.deleteMany({
      where: { imageAsset: { ownerAccountId: { in: createdAccountIds } } },
    });
    await prisma.imageAsset.deleteMany({
      where: { ownerAccountId: { in: createdAccountIds } },
    });
    await prisma.account.deleteMany({
      where: { id: { in: createdAccountIds } },
    });
    await prisma.client.deleteMany({
      where: { id: { in: createdClientIds } },
    });
    createdAccountIds.length = 0;
    createdClientIds.length = 0;
  });

  const createAccount = async () => {
    const client = await prisma.client.create({
      data: { name: 'Ana', referralCode: randomUUID() },
    });
    createdClientIds.push(client.id);
    const account = await prisma.account.create({
      data: { email: `${randomUUID()}@example.com`, clientId: client.id },
    });
    createdAccountIds.push(account.id);
    return account;
  };

  const createImageAsset = async (
    ownerAccountId: string,
    overrides: Partial<{
      state: ImageAssetState;
      purpose: 'PROFILE_PHOTO' | 'TRANSFER_RECEIPT';
      deletionDueAt: Date | null;
      deleteRequestedAt: Date | null;
    }>,
  ) => {
    const pendingObjectKey = `pending/profile_photo/${randomUUID()}`;
    return prisma.imageAsset.create({
      data: {
        ownerAccountId,
        purpose: overrides.purpose ?? 'PROFILE_PHOTO',
        pendingObjectKey,
        declaredMediaType: ImageMediaType.JPEG,
        declaredByteSize: 4,
        declaredChecksum: Buffer.alloc(32, 'test'),
        createdAt: new Date('2026-09-01T00:00:00Z'),
        expiresAt: new Date('2026-10-01'),
        state: overrides.state ?? ImageAssetState.PENDING,
        deletionDueAt: overrides.deletionDueAt ?? null,
        deleteRequestedAt: overrides.deleteRequestedAt ?? null,
      },
    });
  };

  const runCleanup = (now: Date) =>
    cleanupAbandonedUploads({
      ...createUploadCleanupGateway(prisma, storage),
      now: () => now,
    });

  it('deletes the object and marks a pending upload past its cleanup deadline as deleted', async () => {
    const account = await createAccount();
    const now = new Date('2026-09-18T00:00:00Z');
    const asset = await createImageAsset(account.id, {
      deletionDueAt: new Date('2026-09-17T00:00:00Z'),
    });
    await storage.put(asset.pendingObjectKey, Buffer.from('bytes'));

    await expect(runCleanup(now)).resolves.toEqual({
      cleaned: 1,
      variantsCleaned: 0,
    });

    const reloaded = await prisma.imageAsset.findUniqueOrThrow({
      where: { id: asset.id },
    });
    expect(reloaded.state).toBe('DELETED');
    expect(reloaded.deletedAt).toEqual(now);
    await expect(storage.get(asset.pendingObjectKey)).rejects.toThrow();
  });

  it('leaves an attached upload untouched even past its cleanup deadline', async () => {
    const account = await createAccount();
    const now = new Date('2026-09-18T00:00:00Z');
    const asset = await createImageAsset(account.id, {
      state: ImageAssetState.ATTACHED,
      deletionDueAt: new Date('2026-09-17T00:00:00Z'),
    });

    await expect(runCleanup(now)).resolves.toEqual({
      cleaned: 0,
      variantsCleaned: 0,
    });

    const reloaded = await prisma.imageAsset.findUniqueOrThrow({
      where: { id: asset.id },
    });
    expect(reloaded.state).toBe('ATTACHED');
    expect(reloaded.deletedAt).toBeNull();
  });

  const createVariant = (
    imageAssetId: string,
    kind: 'READABLE' | 'THUMBNAIL' | 'PROMOTION_480',
    visibility: 'PRIVATE' | 'PUBLIC',
    deleteRequestedAt: Date | null = null,
  ) =>
    prisma.imageVariant.create({
      data: {
        imageAssetId,
        kind,
        visibility,
        storageKey: `${visibility.toLowerCase()}/${imageAssetId}/${kind.toLowerCase()}-${randomUUID()}`,
        mediaType: ImageMediaType.JPEG,
        byteSize: 5,
        width: 2,
        height: 2,
        deleteRequestedAt,
      },
    });

  // ADR-0075: every variant of a retained receipt goes with it.
  it('deletes an attached transfer receipt and every variant once its retention has ended', async () => {
    const account = await createAccount();
    const now = new Date('2026-09-18T00:00:00Z');
    const asset = await createImageAsset(account.id, {
      state: ImageAssetState.ATTACHED,
      purpose: 'TRANSFER_RECEIPT',
      deletionDueAt: new Date('2026-09-17T00:00:00Z'),
    });
    const readable = await createVariant(asset.id, 'READABLE', 'PRIVATE');
    const thumbnail = await createVariant(asset.id, 'THUMBNAIL', 'PRIVATE');
    await storage.put(readable.storageKey, Buffer.from('bytes'));
    await storage.put(thumbnail.storageKey, Buffer.from('bytes'));

    await expect(runCleanup(now)).resolves.toEqual({
      cleaned: 1,
      variantsCleaned: 0,
    });

    const reloaded = await prisma.imageAsset.findUniqueOrThrow({
      where: { id: asset.id },
      include: { variants: true },
    });
    expect(reloaded.state).toBe('DELETED');
    expect(reloaded.deletedAt).toEqual(now);
    expect(reloaded.variants.map((v) => v.deletedAt)).toEqual([now, now]);
    await expect(storage.get(readable.storageKey)).rejects.toThrow();
    await expect(storage.get(thumbnail.storageKey)).rejects.toThrow();
  });

  // ADR-0077: unpublished public copies go on their own; the private
  // variants and the asset stay.
  it('deletes variants whose deletion was requested and keeps the rest of the asset', async () => {
    const account = await createAccount();
    const now = new Date('2026-09-18T00:00:00Z');
    const asset = await createImageAsset(account.id, {
      state: ImageAssetState.ATTACHED,
    });
    const kept = await createVariant(asset.id, 'PROMOTION_480', 'PRIVATE');
    const unpublished = await createVariant(
      asset.id,
      'PROMOTION_480',
      'PUBLIC',
      new Date('2026-09-17T23:00:00Z'),
    );
    await storage.put(kept.storageKey, Buffer.from('bytes'));
    await storage.put(unpublished.storageKey, Buffer.from('bytes'));

    await expect(runCleanup(now)).resolves.toEqual({
      cleaned: 0,
      variantsCleaned: 1,
    });

    const variants = await prisma.imageVariant.findMany({
      where: { imageAssetId: asset.id },
      orderBy: { visibility: 'asc' },
    });
    expect(variants.map((v) => [v.visibility, v.deletedAt])).toEqual([
      ['PRIVATE', null],
      ['PUBLIC', now],
    ]);
    await expect(storage.get(kept.storageKey)).resolves.toEqual(
      Buffer.from('bytes'),
    );
    await expect(storage.get(unpublished.storageKey)).rejects.toThrow();
    expect(
      (await prisma.imageAsset.findUniqueOrThrow({ where: { id: asset.id } }))
        .state,
    ).toBe('ATTACHED');
  });

  it('leaves an upload that is not yet due untouched', async () => {
    const account = await createAccount();
    const now = new Date('2026-09-18T00:00:00Z');
    const asset = await createImageAsset(account.id, {
      deletionDueAt: new Date('2026-09-19T00:00:00Z'),
    });

    await expect(runCleanup(now)).resolves.toEqual({
      cleaned: 0,
      variantsCleaned: 0,
    });

    const reloaded = await prisma.imageAsset.findUniqueOrThrow({
      where: { id: asset.id },
    });
    expect(reloaded.state).toBe('PENDING');
    expect(reloaded.deletedAt).toBeNull();
  });

  it('retries a previously marked deletion that never finished, regardless of the deadline', async () => {
    const account = await createAccount();
    const now = new Date('2026-09-18T00:00:00Z');
    const asset = await createImageAsset(account.id, {
      deletionDueAt: new Date('2026-09-19T00:00:00Z'),
      deleteRequestedAt: new Date('2026-09-17T00:00:00Z'),
    });
    await storage.put(asset.pendingObjectKey, Buffer.from('bytes'));

    await expect(runCleanup(now)).resolves.toEqual({
      cleaned: 1,
      variantsCleaned: 0,
    });

    const reloaded = await prisma.imageAsset.findUniqueOrThrow({
      where: { id: asset.id },
    });
    expect(reloaded.state).toBe('DELETED');
    expect(reloaded.deletedAt).toEqual(now);
  });
});
