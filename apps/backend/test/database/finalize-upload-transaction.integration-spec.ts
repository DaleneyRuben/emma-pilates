import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PgBoss } from 'pg-boss';
import sharp from 'sharp';
import { PrismaClient } from '../../src/generated/prisma/client';
import { FINALIZE_UPLOAD_QUEUE } from '../../src/jobs/finalize-upload/finalize-upload-job';
import { LocalObjectStorage } from '../../src/uploads/local-object-storage';
import { createPrismaUploadCommands } from '../../src/uploads/prisma-upload-commands';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

describe('finalize upload transaction', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  let storageRoot: string;
  let storage: LocalObjectStorage;
  let boss: PgBoss;

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({ adapter: new PrismaPg(context.pool) });
    storageRoot = await mkdtemp(join(tmpdir(), 'pilates-uploads-transaction-'));
    storage = new LocalObjectStorage(storageRoot);
    boss = new PgBoss({
      db: {
        executeSql: async (text, values) => {
          const result = await context.pool.query(text, values);
          return { rows: result.rows };
        },
      },
      schema: 'pgboss',
      migrate: false,
    });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
    await rm(storageRoot, { recursive: true, force: true });
  });

  const createFinalizableUpload = async (): Promise<{
    imageAssetId: string;
    ownerAccountId: string;
  }> => {
    const clientId = randomUUID();
    const accountId = randomUUID();

    await prisma.client.create({
      data: {
        id: clientId,
        name: 'Finalize Transaction Test',
        referralCode: `ref-${clientId}`,
        account: {
          create: { id: accountId, email: `${accountId}@example.com` },
        },
      },
    });

    const bytes = await sharp({
      create: { width: 20, height: 10, channels: 3, background: '#c81e1e' },
    })
      .jpeg()
      .toBuffer();
    const commands = createPrismaUploadCommands(
      prisma,
      storage,
      () => new Date(),
      boss,
    );
    const intent = await commands.createPendingUpload({
      ownerAccountId: accountId,
      purpose: 'transfer_receipt',
      mediaType: 'image/jpeg',
      byteSize: bytes.byteLength,
      checksum: createHash('sha256').update(bytes).digest(),
    });
    await storage.put(intent.pendingObjectKey, bytes);

    return { imageAssetId: intent.id, ownerAccountId: accountId };
  };

  it('commits the processing transition and its finalize job together', async () => {
    const { imageAssetId, ownerAccountId } = await createFinalizableUpload();

    const jobId = await prisma.$transaction(async (transaction) => {
      const commands = createPrismaUploadCommands(
        transaction,
        storage,
        () => new Date(),
        boss,
      );

      await commands.finalizeUpload({ imageAssetId }, ownerAccountId);

      const jobs = await transaction.$queryRawUnsafe<{ id: string }[]>(
        `SELECT id FROM pgboss.job WHERE name = $1 AND data->>'imageAssetId' = $2`,
        FINALIZE_UPLOAD_QUEUE,
        imageAssetId,
      );

      return jobs[0]?.id;
    });

    await expect(
      prisma.imageAsset.findUniqueOrThrow({ where: { id: imageAssetId } }),
    ).resolves.toMatchObject({ state: 'PROCESSING' });
    await expect(
      boss.findJobs(FINALIZE_UPLOAD_QUEUE, { id: jobId }),
    ).resolves.toHaveLength(1);
  });

  it('rolls back both when the transaction fails', async () => {
    const { imageAssetId, ownerAccountId } = await createFinalizableUpload();
    let jobId: string | undefined;

    await expect(
      prisma.$transaction(async (transaction) => {
        const commands = createPrismaUploadCommands(
          transaction,
          storage,
          () => new Date(),
          boss,
        );

        await commands.finalizeUpload({ imageAssetId }, ownerAccountId);

        const jobs = await transaction.$queryRawUnsafe<{ id: string }[]>(
          `SELECT id FROM pgboss.job WHERE name = $1 AND data->>'imageAssetId' = $2`,
          FINALIZE_UPLOAD_QUEUE,
          imageAssetId,
        );
        jobId = jobs[0]?.id;

        throw new Error('force rollback');
      }),
    ).rejects.toThrow('force rollback');

    expect(jobId).toBeDefined();
    await expect(
      prisma.imageAsset.findUniqueOrThrow({ where: { id: imageAssetId } }),
    ).resolves.toMatchObject({ state: 'PENDING' });
    await expect(
      boss.findJobs(FINALIZE_UPLOAD_QUEUE, { id: jobId }),
    ).resolves.toHaveLength(0);
  });
});
