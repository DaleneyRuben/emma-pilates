import type { PgBoss, PrismaTransactionLike } from 'pg-boss';
import type { PushDispatchJob } from './push-dispatch-job';

export const schedulePushDispatch = (
  boss: Pick<PgBoss, 'send'>,
  transaction: PrismaTransactionLike,
  job: PushDispatchJob,
): Promise<string> =>
  Promise.reject(
    new Error(
      `not implemented ${typeof boss} ${typeof transaction} ${job.accountId}`,
    ),
  );
