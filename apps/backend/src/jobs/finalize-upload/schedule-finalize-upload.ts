import { fromPrisma } from 'pg-boss';
import type { PgBoss, PrismaTransactionLike } from 'pg-boss';
import { FINALIZE_UPLOAD_QUEUE } from './finalize-upload-job';
import type { FinalizeUploadJob } from './finalize-upload-job';

export const scheduleFinalizeUpload = async (
  boss: Pick<PgBoss, 'send'>,
  transaction: PrismaTransactionLike,
  job: FinalizeUploadJob,
): Promise<string> => {
  const jobId = await boss.send(FINALIZE_UPLOAD_QUEUE, job, {
    db: fromPrisma(transaction),
    singletonKey: job.imageAssetId,
  });

  if (jobId === null) {
    throw new Error('pg-boss did not create the finalize upload job');
  }

  return jobId;
};
