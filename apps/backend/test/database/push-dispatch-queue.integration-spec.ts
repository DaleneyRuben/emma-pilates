import {
  PUSH_DISPATCH_FAILED_QUEUE,
  PUSH_DISPATCH_QUEUE,
  pushDispatchFailedQueueOptions,
  pushDispatchQueueOptions,
} from '../../src/jobs/push-dispatch/push-dispatch-job';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

type QueueRow = {
  name: string;
  policy: string;
  retry_limit: number;
  retry_delay: number;
  retry_backoff: boolean;
  retry_delay_max: number | null;
  expire_seconds: number;
  retention_seconds: number;
  deletion_seconds: number;
  dead_letter: string | null;
  partition: boolean;
  notify: boolean;
};

// The migration creates the queues; the worker trusts the code's options.
// This spec keeps the two from drifting apart.
describe('push dispatch queues (NOT-002)', () => {
  let context: DatabaseTestContext;

  beforeAll(async () => {
    context = await startDatabaseTestContext();
  });

  afterAll(async () => {
    await context?.stop();
  });

  const readQueue = async (name: string): Promise<QueueRow | undefined> => {
    const result = await context.pool.query<QueueRow>(
      `select name, policy, retry_limit, retry_delay, retry_backoff,
              retry_delay_max, expire_seconds, retention_seconds,
              deletion_seconds, dead_letter, partition, notify
         from pgboss.queue where name = $1`,
      [name],
    );
    return result.rows[0];
  };

  it('creates the dispatch queue with the approved retry preset', async () => {
    await expect(readQueue(PUSH_DISPATCH_QUEUE)).resolves.toEqual({
      name: PUSH_DISPATCH_QUEUE,
      policy: 'standard',
      retry_limit: pushDispatchQueueOptions.retryLimit,
      retry_delay: pushDispatchQueueOptions.retryDelay,
      retry_backoff: pushDispatchQueueOptions.retryBackoff,
      retry_delay_max: pushDispatchQueueOptions.retryDelayMax,
      expire_seconds: pushDispatchQueueOptions.expireInSeconds,
      retention_seconds: pushDispatchQueueOptions.retentionSeconds,
      deletion_seconds: pushDispatchQueueOptions.deleteAfterSeconds,
      dead_letter: PUSH_DISPATCH_FAILED_QUEUE,
      partition: false,
      notify: false,
    });
  });

  it('creates the dead letter that keeps failures for thirty days', async () => {
    await expect(readQueue(PUSH_DISPATCH_FAILED_QUEUE)).resolves.toMatchObject({
      name: PUSH_DISPATCH_FAILED_QUEUE,
      policy: 'standard',
      retry_limit: pushDispatchFailedQueueOptions.retryLimit,
      retention_seconds: pushDispatchFailedQueueOptions.retentionSeconds,
      deletion_seconds: pushDispatchFailedQueueOptions.deleteAfterSeconds,
      dead_letter: null,
    });
  });
});
