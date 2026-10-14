import type { PgBoss, PrismaTransactionLike } from 'pg-boss';
import { PUSH_DISPATCH_QUEUE } from './push-dispatch-job';
import { schedulePushDispatch } from './schedule-push-dispatch';

jest.mock('pg-boss', () => ({
  fromPrisma: (transaction: PrismaTransactionLike) => ({ transaction }),
}));

const job = {
  version: 1,
  accountId: '63b83bb4-65b8-4e24-bbb3-b42c59d1e261',
  businessEventKey: 'waitlist-promoted:entry-1',
} as const;

describe('schedulePushDispatch', () => {
  it('enqueues through the active Prisma transaction, once per Account and event', async () => {
    const transaction = { $queryRawUnsafe: jest.fn() };
    const boss = {
      send: jest.fn().mockResolvedValue('job-id'),
    } as unknown as Pick<PgBoss, 'send'>;

    await expect(schedulePushDispatch(boss, transaction, job)).resolves.toBe(
      'job-id',
    );

    expect(boss.send).toHaveBeenCalledWith(
      PUSH_DISPATCH_QUEUE,
      job,
      expect.objectContaining({
        db: { transaction },
        singletonKey: `${job.accountId}:${job.businessEventKey}`,
      }),
    );
  });

  it('fails the transaction when pg-boss does not create a job', async () => {
    const boss = {
      send: jest.fn().mockResolvedValue(null),
    } as unknown as Pick<PgBoss, 'send'>;

    await expect(
      schedulePushDispatch(boss, { $queryRawUnsafe: jest.fn() }, job),
    ).rejects.toThrow('pg-boss did not create the push dispatch job');
  });
});
