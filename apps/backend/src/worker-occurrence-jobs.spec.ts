import { startWorker, type WorkerBoss } from './worker';
import { occurrenceJobs } from './worker-test-support';

describe('worker entrypoint occurrence jobs', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('materializes Sessions at start and hourly with a sanitized failure signal', async () => {
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
    const sessionSchedules = {
      execute: jest
        .fn()
        .mockResolvedValueOnce({ schedules: 9, created: 40, skipped: 0 })
        .mockRejectedValueOnce(new Error('sensitive session failure'))
        .mockResolvedValue({ schedules: 9, created: 0, skipped: 40 }),
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
        execute: jest.fn().mockResolvedValue({ reminded: 0 }),
      },
      purchaseIntentExpiry: {
        execute: jest.fn().mockResolvedValue({ expired: 0 }),
      },
      ...occurrenceJobs(),
      sessionSchedules,
      serviceVersion: '1.2.3',
      emit,
    });

    expect(sessionSchedules.execute).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(59 * 60 * 1_000);
    expect(sessionSchedules.execute).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(60 * 1_000);
    expect(sessionSchedules.execute).toHaveBeenCalledTimes(2);
    expect(emit).toHaveBeenCalledWith({
      event: 'session_materialization_failed',
      serviceVersion: '1.2.3',
    });
    expect(JSON.stringify(emit.mock.calls)).not.toContain('sensitive');

    await jest.advanceTimersByTimeAsync(60 * 60 * 1_000);
    expect(sessionSchedules.execute).toHaveBeenCalledTimes(3);

    await stopWorker();
    await jest.advanceTimersByTimeAsync(60 * 60 * 1_000);
    expect(sessionSchedules.execute).toHaveBeenCalledTimes(3);
  });

  it('runs the retention sweeps at start and hourly with a sanitized failure signal', async () => {
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
    const counts = {
      idempotencyRecords: 3,
      authenticationSessions: 1,
      throttleEvents: 0,
      notifications: 2,
    };
    const retentionSweeps = {
      execute: jest
        .fn()
        .mockResolvedValueOnce(counts)
        .mockRejectedValueOnce(new Error('sensitive retention failure'))
        .mockResolvedValue(counts),
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
        execute: jest.fn().mockResolvedValue({ reminded: 0 }),
      },
      purchaseIntentExpiry: {
        execute: jest.fn().mockResolvedValue({ expired: 0 }),
      },
      ...occurrenceJobs(),
      retentionSweeps,
      serviceVersion: '1.2.3',
      emit,
    });

    expect(retentionSweeps.execute).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(60 * 60 * 1_000);
    expect(retentionSweeps.execute).toHaveBeenCalledTimes(2);
    expect(emit).toHaveBeenCalledWith({
      event: 'retention_sweep_failed',
      serviceVersion: '1.2.3',
    });
    expect(JSON.stringify(emit.mock.calls)).not.toContain('sensitive');

    await stopWorker();
    await jest.advanceTimersByTimeAsync(60 * 60 * 1_000);
    expect(retentionSweeps.execute).toHaveBeenCalledTimes(2);
  });

  it('checks the Minimum Bookings, records window-close Bookings, and closes started Waitlists at start and every minute with sanitized failure signals', async () => {
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
    const order: string[] = [];
    const minimumBookingsChecks = {
      execute: jest
        .fn()
        .mockImplementationOnce(() => {
          order.push('minimum-check');
          return Promise.resolve({ checked: 1, cancelled: 1 });
        })
        .mockRejectedValueOnce(new Error('sensitive minimum check failure'))
        .mockResolvedValue({ checked: 0, cancelled: 0 }),
    };
    const windowCloseSnapshots = {
      execute: jest
        .fn()
        .mockImplementationOnce(() => {
          order.push('window-snapshot');
          return Promise.resolve({ recorded: 3 });
        })
        .mockRejectedValueOnce(new Error('sensitive snapshot failure'))
        .mockResolvedValue({ recorded: 0 }),
    };
    const startedSessionWaitlists = {
      execute: jest
        .fn()
        .mockImplementationOnce(() => {
          order.push('waitlist-closure');
          return Promise.resolve({ closed: 2 });
        })
        .mockRejectedValueOnce(new Error('sensitive waitlist failure'))
        .mockResolvedValue({ closed: 0 }),
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
        execute: jest.fn().mockResolvedValue({ reminded: 0 }),
      },
      purchaseIntentExpiry: {
        execute: jest.fn().mockResolvedValue({ expired: 0 }),
      },
      ...occurrenceJobs(),
      minimumBookingsChecks,
      windowCloseSnapshots,
      startedSessionWaitlists,
      serviceVersion: '1.2.3',
      emit,
    });

    // A check missed while the worker was down runs before the window-close
    // snapshot, so a cancelled Session gets none, and both run before the
    // Waitlist of a Session that has since started is closed.
    expect(order).toEqual([
      'minimum-check',
      'window-snapshot',
      'waitlist-closure',
    ]);

    await jest.advanceTimersByTimeAsync(59 * 1_000);
    expect(minimumBookingsChecks.execute).toHaveBeenCalledTimes(1);
    expect(startedSessionWaitlists.execute).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(1_000);
    expect(minimumBookingsChecks.execute).toHaveBeenCalledTimes(2);
    expect(startedSessionWaitlists.execute).toHaveBeenCalledTimes(2);
    expect(emit).toHaveBeenCalledWith({
      event: 'minimum_bookings_check_failed',
      serviceVersion: '1.2.3',
    });
    expect(windowCloseSnapshots.execute).toHaveBeenCalledTimes(2);
    expect(emit).toHaveBeenCalledWith({
      event: 'window_close_snapshot_failed',
      serviceVersion: '1.2.3',
    });
    expect(emit).toHaveBeenCalledWith({
      event: 'started_waitlist_closure_failed',
      serviceVersion: '1.2.3',
    });
    expect(JSON.stringify(emit.mock.calls)).not.toContain('sensitive');

    await jest.advanceTimersByTimeAsync(60 * 1_000);
    expect(minimumBookingsChecks.execute).toHaveBeenCalledTimes(3);
    expect(startedSessionWaitlists.execute).toHaveBeenCalledTimes(3);

    await stopWorker();
    await jest.advanceTimersByTimeAsync(60 * 60 * 1_000);
    expect(minimumBookingsChecks.execute).toHaveBeenCalledTimes(3);
    expect(startedSessionWaitlists.execute).toHaveBeenCalledTimes(3);
  });

  it('materializes Evaluation slots at start and hourly and sweeps Evaluation reminders every minute', async () => {
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
    const evaluationSlots = {
      execute: jest
        .fn()
        .mockResolvedValueOnce({ blocks: 1, created: 5, skipped: 0 })
        .mockRejectedValueOnce(new Error('sensitive slot failure'))
        .mockResolvedValue({ blocks: 1, created: 0, skipped: 0 }),
    };
    const evaluationReminders = {
      execute: jest
        .fn()
        .mockResolvedValueOnce({ sent: 0 })
        .mockRejectedValueOnce(new Error('sensitive reminder failure'))
        .mockResolvedValue({ sent: 1 }),
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
        execute: jest.fn().mockResolvedValue({ reminded: 0 }),
      },
      purchaseIntentExpiry: {
        execute: jest.fn().mockResolvedValue({ expired: 0 }),
      },
      ...occurrenceJobs(),
      evaluationSlots,
      evaluationReminders,
      serviceVersion: '1.2.3',
      emit,
    });

    expect(evaluationSlots.execute).toHaveBeenCalledTimes(1);
    expect(evaluationReminders.execute).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(60 * 1_000);
    expect(evaluationReminders.execute).toHaveBeenCalledTimes(2);
    expect(emit).toHaveBeenCalledWith({
      event: 'evaluation_reminders_failed',
      serviceVersion: '1.2.3',
    });

    await jest.advanceTimersByTimeAsync(59 * 60 * 1_000);
    expect(evaluationReminders.execute).toHaveBeenCalledTimes(61);
    expect(evaluationSlots.execute).toHaveBeenCalledTimes(2);
    expect(emit).toHaveBeenCalledWith({
      event: 'evaluation_slot_materialization_failed',
      serviceVersion: '1.2.3',
    });
    expect(JSON.stringify(emit.mock.calls)).not.toContain('sensitive');

    await stopWorker();
    await jest.advanceTimersByTimeAsync(60 * 60 * 1_000);
    expect(evaluationSlots.execute).toHaveBeenCalledTimes(2);
    expect(evaluationReminders.execute).toHaveBeenCalledTimes(61);
  });
});
