import type { PushDispatchWorkerHandler } from './notifications/push/push-dispatch-worker';
import { startWorker, type WorkerBoss } from './worker';

const idle = (result: unknown) => ({
  execute: jest.fn().mockResolvedValue(result),
});

const startWithPush = async () => {
  const handlers = new Map<string, PushDispatchWorkerHandler>();
  const work = jest.fn(
    (name: string, _options: unknown, handler: PushDispatchWorkerHandler) => {
      handlers.set(name, handler);
      return Promise.resolve('worker-id');
    },
  );
  const boss: WorkerBoss = {
    isInstalled: jest.fn().mockResolvedValue(true),
    schemaVersion: jest.fn().mockResolvedValue(38),
    start: jest.fn().mockResolvedValue(undefined),
    work: work as unknown as WorkerBoss['work'],
    getQueueStats: jest.fn().mockResolvedValue([]),
    getDb: () => ({ executeSql: jest.fn().mockResolvedValue({ rows: [] }) }),
    stop: jest.fn().mockResolvedValue(undefined),
  };
  const dispatch = jest
    .fn()
    .mockResolvedValue({ outcome: 'sent', submitted: 1, failed: 0 });
  const pushReceipts = idle({
    discarded: 0,
    checked: 0,
    delivered: 0,
    failed: 0,
  });

  const stopWorker = await startWorker({
    boss,
    authenticationEmail: null,
    finalizeUpload: { process: jest.fn() },
    pendingAccountCleanup: idle({ cleaned: 0 }),
    imageUploadCleanup: idle({ cleaned: 0 }),
    subscriptionReminders: idle({ reminded: 0 }),
    purchaseIntentExpiry: idle({ expired: 0 }),
    sessionSchedules: idle({ schedules: 0, created: 0, skipped: 0 }),
    evaluationSlots: idle({ blocks: 0, created: 0, skipped: 0 }),
    evaluationReminders: idle({ sent: 0 }),
    classReminders: idle({ sent: 0 }),
    emptySessionChecks: idle({ checked: 0, cancelled: 0 }),
    startedSessionWaitlists: idle({ closed: 0 }),
    pushDispatch: { dispatch },
    pushReceipts,
    retentionSweeps: idle({
      idempotencyRecords: 0,
      authenticationSessions: 0,
      throttleEvents: 0,
      notifications: 0,
    }),
    serviceVersion: '1.2.3',
    emit: jest.fn(),
  });

  return { handlers, dispatch, pushReceipts, stopWorker };
};

describe('worker push delivery (NOT-002)', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('works the push dispatch queue', async () => {
    jest.useFakeTimers();
    const { handlers, dispatch, stopWorker } = await startWithPush();
    const job = {
      version: 1,
      accountId: '0ae2701e-f8ac-4c8a-8cf0-65182ee0fc1d',
      businessEventKey: 'waitlist-promoted:entry-1',
    };

    const handler = handlers.get('notifications.push-dispatch.v1');
    expect(handler).toBeDefined();
    await expect(handler!([{ id: 'job-1', data: job }])).resolves.toEqual([
      expect.objectContaining({ status: 'completed' }),
    ]);
    expect(dispatch).toHaveBeenCalledWith(job);
    await stopWorker();
  });

  it('checks push receipts at start and every five minutes', async () => {
    jest.useFakeTimers();
    const { pushReceipts, stopWorker } = await startWithPush();

    expect(pushReceipts.execute).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(5 * 60_000);
    expect(pushReceipts.execute).toHaveBeenCalledTimes(2);
    await stopWorker();
  });
});
