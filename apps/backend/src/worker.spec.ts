import { WORKER_HEARTBEAT_INTERVAL_MS } from './jobs/worker-heartbeat';
import { startWorker, type WorkerBoss } from './worker';
import { occurrenceJobs } from './worker-test-support';

describe('worker entrypoint', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts only the worker services and shuts them down gracefully', async () => {
    jest.useFakeTimers();
    const isInstalled = jest.fn().mockResolvedValue(true);
    const schemaVersion = jest.fn().mockResolvedValue(38);
    const start = jest.fn().mockResolvedValue(undefined);
    const work = jest
      .fn<Promise<string>, unknown[]>()
      .mockResolvedValue('worker-id') as WorkerBoss['work'];
    const getQueueStats = jest
      .fn()
      .mockResolvedValue([{ readyCount: 2, activeCount: 1, failedCount: 3 }]);
    const stop = jest.fn().mockResolvedValue(undefined);
    const boss: WorkerBoss = {
      isInstalled,
      schemaVersion,
      start,
      work,
      getQueueStats,
      getDb: () => ({ executeSql: jest.fn().mockResolvedValue({ rows: [] }) }),
      stop,
    };
    const emit = jest.fn();

    const stopWorker = await startWorker({
      boss,
      authenticationEmail: {
        stateReader: { find: jest.fn() },
        decryptor: { decrypt: jest.fn() },
        suppressions: { isSuppressed: jest.fn().mockResolvedValue(false) },
        renderer: { render: jest.fn() },
        delivery: { deliver: jest.fn() },
      },
      finalizeUpload: {
        process: jest.fn(),
      },
      subscriptionReminders: {
        execute: jest.fn().mockResolvedValue({ reminded: 0 }),
      },
      purchaseIntentExpiry: {
        execute: jest.fn().mockResolvedValue({ expired: 0 }),
      },
      pendingAccountCleanup: {
        execute: jest.fn().mockResolvedValue({ cleaned: 0 }),
      },
      imageUploadCleanup: {
        execute: jest.fn().mockResolvedValue({ cleaned: 0 }),
      },
      ...occurrenceJobs(),
      serviceVersion: '1.2.3',
      emit,
    });

    expect(isInstalled).toHaveBeenCalledTimes(1);
    expect(schemaVersion).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledTimes(1);
    expect(work).toHaveBeenCalledTimes(3);

    await jest.advanceTimersByTimeAsync(WORKER_HEARTBEAT_INTERVAL_MS);
    expect(getQueueStats).toHaveBeenCalledWith(
      'system.authentication-email.v1',
      { force: true },
    );
    expect(getQueueStats).toHaveBeenCalledWith('uploads.finalize.v1', {
      force: true,
    });
    expect(emit).toHaveBeenCalledTimes(1);

    await stopWorker();
    expect(stop).toHaveBeenCalledWith({ graceful: true });
  });

  it('runs the scheduled reconcilers immediately and once per hour', async () => {
    jest.useFakeTimers();
    const boss: WorkerBoss = {
      isInstalled: jest.fn().mockResolvedValue(true),
      schemaVersion: jest.fn().mockResolvedValue(38),
      start: jest.fn().mockResolvedValue(undefined),
      work: jest.fn().mockResolvedValue('worker-id'),
      getQueueStats: jest.fn().mockResolvedValue([]),
      getDb: () => ({ executeSql: jest.fn().mockResolvedValue({ rows: [] }) }),
      stop: jest.fn().mockResolvedValue(undefined),
    };
    const pendingAccountCleanup = {
      execute: jest.fn().mockResolvedValue({ cleaned: 2 }),
    };
    const imageUploadCleanup = {
      execute: jest.fn().mockResolvedValue({ cleaned: 1 }),
    };
    const subscriptionReminders = {
      execute: jest.fn().mockResolvedValue({ reminded: 1 }),
    };
    const purchaseIntentExpiry = {
      execute: jest.fn().mockResolvedValue({ expired: 1 }),
    };
    const dependencies = {
      boss,
      authenticationEmail: {
        stateReader: { find: jest.fn() },
        decryptor: { decrypt: jest.fn() },
        suppressions: { isSuppressed: jest.fn().mockResolvedValue(false) },
        renderer: { render: jest.fn() },
        delivery: { deliver: jest.fn() },
      },
      finalizeUpload: {
        process: jest.fn(),
      },
      pendingAccountCleanup,
      imageUploadCleanup,
      subscriptionReminders,
      purchaseIntentExpiry,
      ...occurrenceJobs(),
      serviceVersion: '1.2.3',
      emit: jest.fn(),
    };

    const stopWorker = await startWorker(dependencies);

    expect(pendingAccountCleanup.execute).toHaveBeenCalledTimes(1);
    expect(imageUploadCleanup.execute).toHaveBeenCalledTimes(1);
    expect(subscriptionReminders.execute).toHaveBeenCalledTimes(1);
    expect(purchaseIntentExpiry.execute).toHaveBeenCalledTimes(1);

    // Purchase Intents expire on a five-minute sweep, the rest hourly.
    await jest.advanceTimersByTimeAsync(5 * 60 * 1_000);
    expect(purchaseIntentExpiry.execute).toHaveBeenCalledTimes(2);
    expect(subscriptionReminders.execute).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(55 * 60 * 1_000);
    expect(dependencies.studioFacts.execute).toHaveBeenCalledTimes(1);
    expect(pendingAccountCleanup.execute).toHaveBeenCalledTimes(2);
    expect(imageUploadCleanup.execute).toHaveBeenCalledTimes(2);
    expect(subscriptionReminders.execute).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(23 * 60 * 60 * 1_000);
    expect(dependencies.studioFacts.execute).toHaveBeenCalledTimes(2);

    await stopWorker();
    expect(dependencies.studioFacts.execute).toHaveBeenCalledTimes(2);
  });

  it('emits a sanitized signal when subscription reminders fail', async () => {
    jest.useFakeTimers();
    const boss: WorkerBoss = {
      isInstalled: jest.fn().mockResolvedValue(true),
      schemaVersion: jest.fn().mockResolvedValue(38),
      start: jest.fn().mockResolvedValue(undefined),
      work: jest.fn().mockResolvedValue('worker-id'),
      getQueueStats: jest.fn().mockResolvedValue([]),
      getDb: () => ({ executeSql: jest.fn().mockResolvedValue({ rows: [] }) }),
      stop: jest.fn().mockResolvedValue(undefined),
    };
    const emit = jest.fn();

    const stopWorker = await startWorker({
      boss,
      authenticationEmail: {
        stateReader: { find: jest.fn() },
        decryptor: { decrypt: jest.fn() },
        suppressions: { isSuppressed: jest.fn().mockResolvedValue(false) },
        renderer: { render: jest.fn() },
        delivery: { deliver: jest.fn() },
      },
      finalizeUpload: { process: jest.fn() },
      pendingAccountCleanup: {
        execute: jest.fn().mockResolvedValue({ cleaned: 0 }),
      },
      imageUploadCleanup: {
        execute: jest.fn().mockResolvedValue({ cleaned: 0 }),
      },
      subscriptionReminders: {
        execute: jest
          .fn()
          .mockResolvedValueOnce({ reminded: 0 })
          .mockRejectedValueOnce(new Error('sensitive database failure')),
      },
      purchaseIntentExpiry: {
        execute: jest.fn().mockResolvedValue({ expired: 0 }),
      },
      ...occurrenceJobs(),
      serviceVersion: '1.2.3',
      emit,
    });

    await jest.advanceTimersByTimeAsync(60 * 60 * 1_000);

    expect(emit).toHaveBeenCalledWith({
      event: 'subscription_reminders_failed',
      serviceVersion: '1.2.3',
    });
    expect(JSON.stringify(emit.mock.calls)).not.toContain(
      'sensitive database failure',
    );

    await stopWorker();
  });

  it('emits a sanitized signal when a scheduled cleanup fails', async () => {
    jest.useFakeTimers();
    const boss: WorkerBoss = {
      isInstalled: jest.fn().mockResolvedValue(true),
      schemaVersion: jest.fn().mockResolvedValue(38),
      start: jest.fn().mockResolvedValue(undefined),
      work: jest.fn().mockResolvedValue('worker-id'),
      getQueueStats: jest.fn().mockResolvedValue([]),
      getDb: () => ({ executeSql: jest.fn().mockResolvedValue({ rows: [] }) }),
      stop: jest.fn().mockResolvedValue(undefined),
    };
    const pendingAccountCleanup = {
      execute: jest
        .fn()
        .mockResolvedValueOnce({ cleaned: 0 })
        .mockRejectedValueOnce(new Error('sensitive database failure')),
    };
    const emit = jest.fn();

    const stopWorker = await startWorker({
      boss,
      authenticationEmail: {
        stateReader: { find: jest.fn() },
        decryptor: { decrypt: jest.fn() },
        suppressions: { isSuppressed: jest.fn().mockResolvedValue(false) },
        renderer: { render: jest.fn() },
        delivery: { deliver: jest.fn() },
      },
      finalizeUpload: {
        process: jest.fn(),
      },
      subscriptionReminders: {
        execute: jest.fn().mockResolvedValue({ reminded: 0 }),
      },
      purchaseIntentExpiry: {
        execute: jest.fn().mockResolvedValue({ expired: 0 }),
      },
      pendingAccountCleanup,
      imageUploadCleanup: {
        execute: jest.fn().mockResolvedValue({ cleaned: 0 }),
      },
      ...occurrenceJobs(),
      serviceVersion: '1.2.3',
      emit,
    });

    await jest.advanceTimersByTimeAsync(60 * 60 * 1_000);

    expect(emit).toHaveBeenCalledWith({
      event: 'pending_account_cleanup_failed',
      serviceVersion: '1.2.3',
    });
    expect(JSON.stringify(emit.mock.calls)).not.toContain(
      'sensitive database failure',
    );

    await stopWorker();
  });

  it('emits a sanitized signal when a scheduled image upload cleanup fails', async () => {
    jest.useFakeTimers();
    const boss: WorkerBoss = {
      isInstalled: jest.fn().mockResolvedValue(true),
      schemaVersion: jest.fn().mockResolvedValue(38),
      start: jest.fn().mockResolvedValue(undefined),
      work: jest.fn().mockResolvedValue('worker-id'),
      getQueueStats: jest.fn().mockResolvedValue([]),
      getDb: () => ({ executeSql: jest.fn().mockResolvedValue({ rows: [] }) }),
      stop: jest.fn().mockResolvedValue(undefined),
    };
    const imageUploadCleanup = {
      execute: jest
        .fn()
        .mockResolvedValueOnce({ cleaned: 0 })
        .mockRejectedValueOnce(new Error('sensitive storage failure')),
    };
    const emit = jest.fn();

    const stopWorker = await startWorker({
      boss,
      authenticationEmail: {
        stateReader: { find: jest.fn() },
        decryptor: { decrypt: jest.fn() },
        suppressions: { isSuppressed: jest.fn().mockResolvedValue(false) },
        renderer: { render: jest.fn() },
        delivery: { deliver: jest.fn() },
      },
      finalizeUpload: {
        process: jest.fn(),
      },
      subscriptionReminders: {
        execute: jest.fn().mockResolvedValue({ reminded: 0 }),
      },
      purchaseIntentExpiry: {
        execute: jest.fn().mockResolvedValue({ expired: 0 }),
      },
      pendingAccountCleanup: {
        execute: jest.fn().mockResolvedValue({ cleaned: 0 }),
      },
      imageUploadCleanup,
      ...occurrenceJobs(),
      serviceVersion: '1.2.3',
      emit,
    });

    await jest.advanceTimersByTimeAsync(60 * 60 * 1_000);

    expect(emit).toHaveBeenCalledWith({
      event: 'image_upload_cleanup_failed',
      serviceVersion: '1.2.3',
    });
    expect(JSON.stringify(emit.mock.calls)).not.toContain(
      'sensitive storage failure',
    );

    await stopWorker();
  });
});
