import { startWorker, type WorkerBoss } from './worker';

const idle = (result: unknown) => ({
  execute: jest.fn().mockResolvedValue(result),
});

describe('worker without an email provider', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('leaves authentication emails queued and runs every other job (EXT-002)', async () => {
    jest.useFakeTimers();
    const work = jest
      .fn<Promise<string>, unknown[]>()
      .mockResolvedValue('worker-id') as WorkerBoss['work'];
    const boss: WorkerBoss = {
      isInstalled: jest.fn().mockResolvedValue(true),
      schemaVersion: jest.fn().mockResolvedValue(38),
      start: jest.fn().mockResolvedValue(undefined),
      work,
      getQueueStats: jest.fn().mockResolvedValue([]),
      getDb: () => ({ executeSql: jest.fn().mockResolvedValue({ rows: [] }) }),
      stop: jest.fn().mockResolvedValue(undefined),
    };
    const emit = jest.fn();

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
    });

    expect(work).toHaveBeenCalledTimes(1);
    expect(work).toHaveBeenCalledWith(
      'uploads.finalize.v1',
      expect.anything(),
      expect.any(Function),
    );
    expect(emit).toHaveBeenCalledWith({
      event: 'authentication_email_disabled',
      serviceVersion: '1.2.3',
    });

    await stopWorker();
  });
});
