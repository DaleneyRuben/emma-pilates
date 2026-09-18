import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import { ImageAssetState, ImageMediaType } from '../../src/generated/prisma/enums';
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
      deletionDueAt: Date | null;
      deleteRequestedAt: Date | null;
    }>,
  ) => {
    const pendingObjectKey = `pending/profile_photo/${randomUUID()}`;
    return prisma.imageAsset.create({
      data: {
        ownerAccountId,
        purpose: 'PROFILE_PHOTO',
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

    await expect(runCleanup(now)).resolves.toEqual({ cleaned: 1 });

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

    await expect(runCleanup(now)).resolves.toEqual({ cleaned: 0 });

    const reloaded = await prisma.imageAsset.findUniqueOrThrow({
      where: { id: asset.id },
    });
    expect(reloaded.state).toBe('ATTACHED');
    expect(reloaded.deletedAt).toBeNull();
  });

  it('leaves an upload that is not yet due untouched', async () => {
    const account = await createAccount();
    const now = new Date('2026-09-18T00:00:00Z');
    const asset = await createImageAsset(account.id, {
      deletionDueAt: new Date('2026-09-19T00:00:00Z'),
    });

    await expect(runCleanup(now)).resolves.toEqual({ cleaned: 0 });

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

    await expect(runCleanup(now)).resolves.toEqual({ cleaned: 1 });

    const reloaded = await prisma.imageAsset.findUniqueOrThrow({
      where: { id: asset.id },
    });
    expect(reloaded.state).toBe('DELETED');
    expect(reloaded.deletedAt).toEqual(now);
  });
});
