import type { PgBoss, PrismaTransactionLike } from 'pg-boss';
import type { AuthenticationEmailJob } from './authentication-email-job';

export const scheduleAuthenticationEmail = async (
  _boss: Pick<PgBoss, 'send'>,
  _transaction: PrismaTransactionLike,
  _job: AuthenticationEmailJob,
): Promise<string> => {
  throw new Error('Not implemented');
};
