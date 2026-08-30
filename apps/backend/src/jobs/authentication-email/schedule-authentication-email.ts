import { fromPrisma } from 'pg-boss';
import type { PgBoss, PrismaTransactionLike } from 'pg-boss';
import { AUTHENTICATION_EMAIL_QUEUE } from './authentication-email-job';
import type { AuthenticationEmailJob } from './authentication-email-job';

export const scheduleAuthenticationEmail = async (
  boss: Pick<PgBoss, 'send'>,
  transaction: PrismaTransactionLike,
  job: AuthenticationEmailJob,
): Promise<string> => {
  const jobId = await boss.send(AUTHENTICATION_EMAIL_QUEUE, job, {
    db: fromPrisma(transaction),
    singletonKey: job.authenticationTokenId,
  });

  if (jobId === null) {
    throw new Error('pg-boss did not create the authentication email job');
  }

  return jobId;
};
