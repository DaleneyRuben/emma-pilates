import { WORKER_HEARTBEAT_INTERVAL_MS } from './jobs/worker-heartbeat';
import { startWorker, type WorkerBoss } from './worker';

const idle = (result: unknown) => ({
  execute: jest.fn().mockResolvedValue(result),
});

const startWithJobs = async ({
  rows = [] as unknown[],
  evaluationReminders = idle({ sent: 0 }),
  emailEnabled = false,
} = {}) => {
  const executeSql = jest.fn().mockResolvedValue({ rows });
  const boss: WorkerBoss = {
    isInstalled: jest.fn().mockResolvedValue(true),
    schemaVersion: jest.fn().mockResolvedValue(38),
    start: jest.fn().mockResolvedValue(undefined),
    work: jest.fn().mockResolvedValue('worker-id') as WorkerBoss['work'],
    getQueueStats: jest.fn().mockResolvedValue([]),
    getDb: () => ({ executeSql }),
    stop: jest.fn().mockResolvedValue(undefined),
  };
  const emit = jest.fn();
  const pingHeartbeat = jest.fn().mockResolvedValue(undefined);

  const stopWorker = await startWorker({
    boss,
    authenticationEmail: emailEnabled
      ? {
          stateReader: { find: jest.fn() },
          decryptor: { decrypt: jest.fn() },
          renderer: { render: jest.fn() },
          delivery: { deliver: jest.fn() },
        }
      : null,
    finalizeUpload: { process: jest.fn() },
    pendingAccountCleanup: idle({ cleaned: 0 }),
    imageUploadCleanup: idle({ cleaned: 0 }),
    subscriptionReminders: idle({ reminded: 0 }),
    purchaseIntentExpiry: idle({ expired: 0 }),
    sessionSchedules: idle({ schedules: 0, created: 0, skipped: 0 }),
    evaluationSlots: idle({ blocks: 0, created: 0, skipped: 0 }),
    evaluationReminders,
    emptySessionChecks: idle({ checked: 0, cancelled: 0 }),
    startedSessionWaitlists: idle({ closed: 0 }),
    pushDispatch: { dispatch: jest.fn() },
    pushReceipts: idle({ discarded: 0, checked: 0, delivered: 0, failed: 0 }),
    retentionSweeps: idle({
      idempotencyRecords: 0,
      authenticationSessions: 0,
      throttleEvents: 0,
      notifications: 0,
    }),
    serviceVersion: '1.2.3',
    emit,
    pingHeartbeat,
  });

  return { executeSql, emit, pingHeartbeat, stopWorker };
};

describe('worker progress gate (EXT-011)', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-10-14T12:00:00.000Z') });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('pings while the queues move and every sweep succeeds', async () => {
    const { pingHeartbeat, stopWorker } = await startWithJobs({
      rows: [{ queue: 'uploads.finalize.v1', ready_since: null }],
    });

    await jest.advanceTimersByTimeAsync(WORKER_HEARTBEAT_INTERVAL_MS);

    expect(pingHeartbeat).toHaveBeenCalledTimes(1);
    await stopWorker();
  });

  // Production has no email provider yet, so its queue fills on purpose.
  it('reads the uploads and push queues while email is disabled', async () => {
    const { executeSql, stopWorker } = await startWithJobs();

    await jest.advanceTimersByTimeAsync(WORKER_HEARTBEAT_INTERVAL_MS);

    expect(executeSql).toHaveBeenCalledWith(expect.any(String), [
      ['uploads.finalize.v1', 'notifications.push-dispatch.v1'],
    ]);
    await stopWorker();
  });

  it('reads the authentication email queue too once email is enabled', async () => {
    const { executeSql, stopWorker } = await startWithJobs({
      emailEnabled: true,
    });

    await jest.advanceTimersByTimeAsync(WORKER_HEARTBEAT_INTERVAL_MS);

    expect(executeSql).toHaveBeenCalledWith(expect.any(String), [
      [
        'uploads.finalize.v1',
        'notifications.push-dispatch.v1',
        'system.authentication-email.v1',
      ],
    ]);
    await stopWorker();
  });

  it('stops pinging when an upload has waited five minutes', async () => {
    const { emit, pingHeartbeat, stopWorker } = await startWithJobs({
      rows: [
        {
          queue: 'uploads.finalize.v1',
          ready_since: new Date('2026-10-14T11:50:00.000Z'),
        },
      ],
    });

    await jest.advanceTimersByTimeAsync(WORKER_HEARTBEAT_INTERVAL_MS);

    expect(pingHeartbeat).not.toHaveBeenCalled();
    expect(emit).toHaveBeenCalledWith({
      event: 'worker_progress_stalled',
      serviceVersion: '1.2.3',
      reasons: ['queue_stuck:uploads.finalize.v1'],
    });
    await stopWorker();
  });

  it('stops pinging once an every-minute sweep has failed for over four minutes', async () => {
    const { emit, pingHeartbeat, stopWorker } = await startWithJobs({
      evaluationReminders: {
        execute: jest.fn().mockRejectedValue(new Error('P1001')),
      },
    });

    await jest.advanceTimersByTimeAsync(4 * 60_000);
    const pingsWhileFresh = pingHeartbeat.mock.calls.length;
    await jest.advanceTimersByTimeAsync(WORKER_HEARTBEAT_INTERVAL_MS * 2);

    expect(pingsWhileFresh).toBe(8);
    expect(pingHeartbeat).toHaveBeenCalledTimes(8);
    expect(emit).toHaveBeenCalledWith({
      event: 'worker_progress_stalled',
      serviceVersion: '1.2.3',
      reasons: ['sweep_stale:evaluation_reminders'],
    });
    await stopWorker();
  });
});
