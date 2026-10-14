import { startWorker, type WorkerBoss } from './worker';

const idle = (result: unknown) => ({
  execute: jest.fn().mockResolvedValue(result),
});

const failing = () => ({
  execute: jest.fn().mockRejectedValue(new Error('P2028')),
});

const sweeps = () => ({
  pendingAccountCleanup: idle({ cleaned: 0 }),
  imageUploadCleanup: idle({ cleaned: 0 }),
  subscriptionReminders: idle({ reminded: 0 }),
  purchaseIntentExpiry: idle({ expired: 0 }),
});

describe('worker startup sweeps (EXT-002)', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it.each([
    ['pendingAccountCleanup', 'pending_account_cleanup_failed'],
    ['imageUploadCleanup', 'image_upload_cleanup_failed'],
    ['subscriptionReminders', 'subscription_reminders_failed'],
    ['purchaseIntentExpiry', 'purchase_intent_expiry_failed'],
  ] as const)(
    'keeps the worker running when the first %s pass fails',
    async (sweep, event) => {
      jest.useFakeTimers();
      const boss: WorkerBoss = {
        isInstalled: jest.fn().mockResolvedValue(true),
        schemaVersion: jest.fn().mockResolvedValue(38),
        start: jest.fn().mockResolvedValue(undefined),
        work: jest.fn().mockResolvedValue('worker-id') as WorkerBoss['work'],
        getQueueStats: jest.fn().mockResolvedValue([]),
        getDb: () => ({
          executeSql: jest.fn().mockResolvedValue({ rows: [] }),
        }),
        stop: jest.fn().mockResolvedValue(undefined),
      };
      const emit = jest.fn();

      const stopWorker = await startWorker({
        boss,
        authenticationEmail: null,
        finalizeUpload: { process: jest.fn() },
        ...sweeps(),
        [sweep]: failing(),
        sessionSchedules: idle({ schedules: 0, created: 0, skipped: 0 }),
        evaluationSlots: idle({ blocks: 0, created: 0, skipped: 0 }),
        evaluationReminders: idle({ sent: 0 }),
        emptySessionChecks: idle({ checked: 0, cancelled: 0 }),
        startedSessionWaitlists: idle({ closed: 0 }),
        retentionSweeps: idle({
          idempotencyRecords: 0,
          authenticationSessions: 0,
          throttleEvents: 0,
          notifications: 0,
        }),
        serviceVersion: '1.2.3',
        emit,
      });

      expect(emit).toHaveBeenCalledWith({ event, serviceVersion: '1.2.3' });
      await stopWorker();
    },
  );
});
