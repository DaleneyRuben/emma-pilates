import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import sharp from 'sharp';
import { PrismaClient } from '../../src/generated/prisma/client';
import { LocalObjectStorage } from '../../src/uploads/local-object-storage';
import {
  createFinalizeUploadIdempotent,
  createPrismaUploadCommands,
} from '../../src/uploads/prisma-upload-commands';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

describe('Finalize upload idempotency', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  let storageRoot: string;
  let storage: LocalObjectStorage;

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({ adapter: new PrismaPg(context.pool) });
    storageRoot = await mkdtemp(join(tmpdir(), 'pilates-uploads-idempotency-'));
    storage = new LocalObjectStorage(storageRoot);
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
    await rm(storageRoot, { recursive: true, force: true });
  });

  const createAccount = async () => {
    const client = await prisma.client.create({
      data: { name: 'Ana', referralCode: randomUUID() },
    });
    return prisma.account.create({
      data: { email: `${randomUUID()}@example.com`, clientId: client.id },
    });
  };

  const receiptBytes = () =>
    sharp({
      create: { width: 20, height: 10, channels: 3, background: '#c81e1e' },
    })
      .jpeg()
      .toBuffer();

  const createFinalizableUpload = async (ownerAccountId: string) => {
    const bytes = await receiptBytes();
    const commands = createPrismaUploadCommands(prisma, storage, () => new Date());
    const intent = await commands.createPendingUpload({
      ownerAccountId,
      purpose: 'transfer_receipt',
      mediaType: 'image/jpeg',
      byteSize: bytes.byteLength,
      checksum: createHash('sha256').update(bytes).digest(),
    });
    await storage.put(intent.pendingObjectKey, bytes);
    return intent;
  };

  it('replays a finalize-upload command without re-executing it', async () => {
    const account = await createAccount();
    const intent = await createFinalizableUpload(account.id);
    const finalizeUploadIdempotent = createFinalizeUploadIdempotent(
      prisma,
      storage,
      () => new Date(),
    );
    const idempotencyKey = randomUUID();

    const first = await finalizeUploadIdempotent(
      { imageAssetId: intent.id },
      account.id,
      idempotencyKey,
    );

    await prisma.imageAsset.update({
      where: { id: intent.id },
      data: { state: 'FAILED', failureCode: 'mutated_after_first_call' },
    });

    const replay = await finalizeUploadIdempotent(
      { imageAssetId: intent.id },
      account.id,
      idempotencyKey,
    );

    expect(replay).toEqual(first);
    expect(replay.state).toBe('processing');
  });

  it('rejects reusing an idempotency key for a different Upload', async () => {
    const account = await createAccount();
    const firstIntent = await createFinalizableUpload(account.id);
    const secondIntent = await createFinalizableUpload(account.id);
    const finalizeUploadIdempotent = createFinalizeUploadIdempotent(
      prisma,
      storage,
      () => new Date(),
    );
    const idempotencyKey = randomUUID();

    await finalizeUploadIdempotent(
      { imageAssetId: firstIntent.id },
      account.id,
      idempotencyKey,
    );

    await expect(
      finalizeUploadIdempotent(
        { imageAssetId: secondIntent.id },
        account.id,
        idempotencyKey,
      ),
    ).rejects.toThrow('Idempotency Key was reused with a different request');
  });
});
