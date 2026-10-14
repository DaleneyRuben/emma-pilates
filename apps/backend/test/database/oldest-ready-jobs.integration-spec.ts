import { randomUUID } from 'node:crypto';
import { PgBoss } from 'pg-boss';
import { AUTHENTICATION_EMAIL_QUEUE } from '../../src/jobs/authentication-email/authentication-email-job';
import { FINALIZE_UPLOAD_QUEUE } from '../../src/jobs/finalize-upload/finalize-upload-job';
import {
  readOldestReadyJobs,
  type SqlExecutor,
} from '../../src/jobs/oldest-ready-jobs';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

describe('oldest ready jobs (EXT-011)', () => {
  let context: DatabaseTestContext;
  let db: SqlExecutor;
  let boss: PgBoss;

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    db = {
      executeSql: async (text, values) => {
        const result = await context.pool.query(text, values);
        return { rows: result.rows as unknown[] };
      },
    };
    boss = new PgBoss({ db, schema: 'pgboss', migrate: false });
  });

  afterAll(async () => {
    await context?.stop();
  });

  const queueJob = async (
    queue: string,
    state: 'created' | 'retry' | 'active' | 'completed',
    startAfter: string,
  ): Promise<void> => {
    const id = await boss.send(queue, {
      version: 1,
      imageAssetId: randomUUID(),
    });
    await context.pool.query(
      `update pgboss.job set state = $2, start_after = $3::timestamptz
         where name = $4 and id = $1`,
      [id, state, startAfter, queue],
    );
  };

  it('answers no ready job for an empty queue', async () => {
    await expect(
      readOldestReadyJobs(db, [AUTHENTICATION_EMAIL_QUEUE]),
    ).resolves.toEqual([
      { queue: AUTHENTICATION_EMAIL_QUEUE, readySince: null },
    ]);
  });

  // A retry waiting out its backoff and a job scheduled for later are not
  // ready yet; active and finished jobs are not waiting.
  it('answers when the oldest ready job of each queue became ready', async () => {
    await queueJob(FINALIZE_UPLOAD_QUEUE, 'created', '2026-10-01T11:50:00Z');
    await queueJob(FINALIZE_UPLOAD_QUEUE, 'retry', '2026-10-01T11:40:00Z');
    await queueJob(FINALIZE_UPLOAD_QUEUE, 'retry', '2999-01-01T00:00:00Z');
    await queueJob(FINALIZE_UPLOAD_QUEUE, 'active', '2026-10-01T10:00:00Z');
    await queueJob(FINALIZE_UPLOAD_QUEUE, 'completed', '2026-10-01T09:00:00Z');

    await expect(
      readOldestReadyJobs(db, [
        FINALIZE_UPLOAD_QUEUE,
        AUTHENTICATION_EMAIL_QUEUE,
      ]),
    ).resolves.toEqual([
      {
        queue: FINALIZE_UPLOAD_QUEUE,
        readySince: new Date('2026-10-01T11:40:00Z'),
      },
      { queue: AUTHENTICATION_EMAIL_QUEUE, readySince: null },
    ]);
  });
});
