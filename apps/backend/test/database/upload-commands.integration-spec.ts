import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import sharp from 'sharp';
import { PrismaClient, type Prisma } from '../../src/generated/prisma/client';
import { LocalObjectStorage } from '../../src/uploads/local-object-storage';
import { createPrismaUploadCommands } from '../../src/uploads/prisma-upload-commands';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

describe('Prisma upload commands', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  let storageRoot: string;
  let storage: LocalObjectStorage;

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({ adapter: new PrismaPg(context.pool) });
    storageRoot = await mkdtemp(join(tmpdir(), 'pilates-uploads-'));
    storage = new LocalObjectStorage(storageRoot);
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
    await rm(storageRoot, { recursive: true, force: true });
  });

  const withRollback = async (
    work: (tx: Prisma.TransactionClient) => Promise<void>,
  ): Promise<void> => {
    const rollback = new Error('test rollback');
    try {
      await prisma.$transaction(async (tx) => {
        await work(tx);
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    }
  };

  const createAccount = async (tx: Prisma.TransactionClient) => {
    const client = await tx.client.create({
      data: { name: 'Ana', referralCode: randomUUID() },
    });
    return tx.account.create({
      data: { email: `${randomUUID()}@example.com`, clientId: client.id },
    });
  };

  const receiptBytes = () =>
    sharp({
      create: { width: 20, height: 10, channels: 3, background: '#c81e1e' },
    })
      .jpeg()
      .toBuffer();

  it('records verified metadata once the stored bytes match the declared upload', async () => {
    await withRollback(async (tx) => {
      const account = await createAccount(tx);
      const bytes = await receiptBytes();
      const checksum = createHash('sha256').update(bytes).digest();
      const commands = createPrismaUploadCommands(
        tx,
        storage,
        () => new Date('2026-09-18T12:00:00Z'),
      );

      const intent = await commands.createPendingUpload({
        ownerAccountId: account.id,
        purpose: 'transfer_receipt',
        mediaType: 'image/jpeg',
        byteSize: bytes.byteLength,
        checksum,
      });

      await storage.put(intent.pendingObjectKey, bytes);
      await commands.finalizeUpload({ imageAssetId: intent.id }, account.id);

      const asset = await tx.imageAsset.findUniqueOrThrow({
        where: { id: intent.id },
      });
      expect(asset.state).toBe('PROCESSING');
      expect(asset.processingStartedAt).toEqual(new Date('2026-09-18T12:00:00Z'));
      expect(asset.verifiedMediaType).toBe('JPEG');
      expect(asset.verifiedByteSize).toBe(bytes.byteLength);
      expect(Buffer.from(asset.verifiedChecksum ?? [])).toEqual(checksum);
      expect(asset.verifiedWidth).toBe(20);
      expect(asset.verifiedHeight).toBe(10);
      expect(asset.failureCode).toBeNull();
    });
  });

  it('fails finalization when the stored bytes do not match the declared checksum', async () => {
    await withRollback(async (tx) => {
      const account = await createAccount(tx);
      const bytes = await receiptBytes();
      const commands = createPrismaUploadCommands(
        tx,
        storage,
        () => new Date('2026-09-18T12:00:00Z'),
      );

      const intent = await commands.createPendingUpload({
        ownerAccountId: account.id,
        purpose: 'transfer_receipt',
        mediaType: 'image/jpeg',
        byteSize: bytes.byteLength,
        checksum: new Uint8Array(32),
      });

      await storage.put(intent.pendingObjectKey, bytes);
      await commands.finalizeUpload({ imageAssetId: intent.id }, account.id);

      const asset = await tx.imageAsset.findUniqueOrThrow({
        where: { id: intent.id },
      });
      expect(asset.state).toBe('FAILED');
      expect(asset.failureCode).toBe('image_checksum_mismatch');
      expect(asset.verifiedMediaType).toBeNull();
    });
  });
});
