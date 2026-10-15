import { fromPrisma } from 'pg-boss';
import type { PgBoss, PrismaTransactionLike } from 'pg-boss';
import { PUSH_DISPATCH_QUEUE } from './push-dispatch-job';
import type { PushDispatchJob } from './push-dispatch-job';

export const schedulePushDispatch = async (
  boss: Pick<PgBoss, 'send'>,
  transaction: PrismaTransactionLike,
  job: PushDispatchJob,
): Promise<string> => {
  const jobId = await boss.send(PUSH_DISPATCH_QUEUE, job, {
    db: fromPrisma(transaction),
    singletonKey: `${job.accountId}:${job.businessEventKey}`,
  });

  if (jobId === null) {
    throw new Error('pg-boss did not create the push dispatch job');
  }

  return jobId;
};
