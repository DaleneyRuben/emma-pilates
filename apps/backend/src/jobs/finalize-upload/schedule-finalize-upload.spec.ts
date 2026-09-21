import type { PgBoss, PrismaTransactionLike } from 'pg-boss';
import { FINALIZE_UPLOAD_QUEUE } from './finalize-upload-job';
import { scheduleFinalizeUpload } from './schedule-finalize-upload';

jest.mock('pg-boss', () => ({
  fromPrisma: (transaction: PrismaTransactionLike) => ({ transaction }),
}));

const job = {
  version: 1,
  imageAssetId: '63b83bb4-65b8-4e24-bbb3-b42c59d1e261',
} as const;

describe('scheduleFinalizeUpload', () => {
  it('enqueues through the active Prisma transaction', async () => {
    const transaction = { $queryRawUnsafe: jest.fn() };
    const boss = {
      send: jest.fn().mockResolvedValue('job-id'),
    } as unknown as Pick<PgBoss, 'send'>;

    await expect(
      scheduleFinalizeUpload(boss, transaction, job),
    ).resolves.toBe('job-id');

    expect(boss.send).toHaveBeenCalledWith(
      FINALIZE_UPLOAD_QUEUE,
      job,
      expect.objectContaining({
        db: { transaction },
        singletonKey: job.imageAssetId,
      }),
    );
  });

  it('fails the transaction when pg-boss does not create a job', async () => {
    const transaction = { $queryRawUnsafe: jest.fn() };
    const boss = {
      send: jest.fn().mockResolvedValue(null),
    } as unknown as Pick<PgBoss, 'send'>;

    await expect(
      scheduleFinalizeUpload(boss, transaction, job),
    ).rejects.toThrow('pg-boss did not create the finalize upload job');
  });
});
