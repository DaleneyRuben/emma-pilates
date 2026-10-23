import type { AuthenticationEmailProcessorDependencies } from './jobs/authentication-email/process-authentication-email';
import { AUTHENTICATION_EMAIL_QUEUE } from './jobs/authentication-email/authentication-email-job';
import {
  registerAuthenticationEmailWorker,
  type AuthenticationEmailWorkerBoss,
} from './jobs/authentication-email/authentication-email-worker';
import { FINALIZE_UPLOAD_QUEUE } from './jobs/finalize-upload/finalize-upload-job';
import {
  registerFinalizeUploadWorker,
  type FinalizeUploadWorkerBoss,
  type FinalizeUploadWorkerDependencies,
} from './jobs/finalize-upload/finalize-upload-worker';
import { PUSH_DISPATCH_QUEUE } from './jobs/push-dispatch/push-dispatch-job';
import {
  registerPushDispatchWorker,
  type PushDispatchWorkerBoss,
  type PushDispatchWorkerDependencies,
} from './notifications/push/push-dispatch-worker';
import type { CheckPushReceiptsResult } from './notifications/push/check-push-receipts';
import {
  startInstalledPgBoss,
  type StartablePgBoss,
} from './jobs/pg-boss-runtime';
import {
  readOldestReadyJobs,
  type SqlExecutor,
} from './jobs/oldest-ready-jobs';
import { findProgressStalls } from './jobs/worker-progress';
import { startWorkerHeartbeat } from './jobs/worker-heartbeat';
import {
  noErrorReporting,
  type ErrorReporter,
} from './monitoring/error-reporting';
import { startSweeps } from './worker-sweeps';

const pendingAccountCleanupIntervalMs = 60 * 60 * 1_000;
const imageUploadCleanupIntervalMs = 60 * 60 * 1_000;
const subscriptionReminderIntervalMs = 60 * 60 * 1_000;
const purchaseIntentExpiryIntervalMs = 5 * 60 * 1_000;
const sessionScheduleIntervalMs = 60 * 60 * 1_000;
const evaluationSlotIntervalMs = 60 * 60 * 1_000;
const evaluationReminderIntervalMs = 60 * 1_000;
const sessionStartCheckIntervalMs = 60 * 1_000;
const retentionSweepIntervalMs = 60 * 60 * 1_000;
const pushReceiptIntervalMs = 5 * 60 * 1_000;

type QueueStatsSnapshot = {
  readyCount: number;
  activeCount: number;
  failedCount: number;
};

export interface WorkerBoss extends StartablePgBoss {
  work: AuthenticationEmailWorkerBoss['work'] &
    FinalizeUploadWorkerBoss['work'] &
    PushDispatchWorkerBoss['work'];
  getQueueStats(
    name: string,
    options: { force: true },
  ): Promise<QueueStatsSnapshot[]>;
  getDb(): SqlExecutor;
  stop(options: { graceful: true }): Promise<void>;
}

type WorkerDependencies = {
  boss: WorkerBoss;
  // Null while production has no email provider (EXT-001): the jobs stay
  // queued until one exists.
  authenticationEmail: AuthenticationEmailProcessorDependencies | null;
  finalizeUpload: FinalizeUploadWorkerDependencies;
  pendingAccountCleanup: {
    execute(): Promise<{ cleaned: number }>;
  };
  imageUploadCleanup: {
    execute(): Promise<{ cleaned: number }>;
  };
  subscriptionReminders: {
    execute(): Promise<{ reminded: number }>;
  };
  purchaseIntentExpiry: {
    execute(): Promise<{ expired: number }>;
  };
  sessionSchedules: {
    execute(): Promise<{ schedules: number; created: number; skipped: number }>;
  };
  evaluationSlots: {
    execute(): Promise<{ blocks: number; created: number; skipped: number }>;
  };
  evaluationReminders: {
    execute(): Promise<{ sent: number }>;
  };
  minimumBookingsChecks: {
    execute(): Promise<{ checked: number; cancelled: number }>;
  };
  windowCloseSnapshots: {
    execute(): Promise<{ recorded: number }>;
  };
  startedSessionWaitlists: {
    execute(): Promise<{ closed: number }>;
  };
  pushDispatch: Pick<PushDispatchWorkerDependencies, 'dispatch'>;
  pushReceipts: {
    execute(): Promise<CheckPushReceiptsResult>;
  };
  retentionSweeps: {
    execute(): Promise<{
      idempotencyRecords: number;
      authenticationSessions: number;
      throttleEvents: number;
      notifications: number;
    }>;
  };
  serviceVersion: string;
  emit(record: unknown): void;
  errorReporter?: ErrorReporter;
  pingHeartbeat?: () => Promise<void>;
};

export const startWorker = async (
  dependencies: WorkerDependencies,
): Promise<() => Promise<void>> => {
  const errorReporter = dependencies.errorReporter ?? noErrorReporting;
  await startInstalledPgBoss(dependencies.boss);
  if (dependencies.authenticationEmail === null) {
    dependencies.emit({
      event: 'authentication_email_disabled',
      serviceVersion: dependencies.serviceVersion,
    });
  } else {
    await registerAuthenticationEmailWorker(
      dependencies.boss,
      dependencies.authenticationEmail,
    );
  }
  await registerFinalizeUploadWorker(dependencies.boss, {
    process: (job) => dependencies.finalizeUpload.process(job),
    reportError: (error, context) => errorReporter.report(error, context),
  });
  await registerPushDispatchWorker(dependencies.boss, {
    dispatch: (job) => dependencies.pushDispatch.dispatch(job),
    reportError: (error, context) => errorReporter.report(error, context),
  });
  const sweeps = await startSweeps(
    [
      {
        intervalMs: pendingAccountCleanupIntervalMs,
        steps: [
          {
            job: 'pending_account_cleanup',
            execute: () => dependencies.pendingAccountCleanup.execute(),
          },
        ],
      },
      {
        intervalMs: imageUploadCleanupIntervalMs,
        steps: [
          {
            job: 'image_upload_cleanup',
            execute: () => dependencies.imageUploadCleanup.execute(),
          },
        ],
      },
      {
        intervalMs: subscriptionReminderIntervalMs,
        steps: [
          {
            job: 'subscription_reminders',
            execute: () => dependencies.subscriptionReminders.execute(),
          },
        ],
      },
      {
        intervalMs: purchaseIntentExpiryIntervalMs,
        steps: [
          {
            job: 'purchase_intent_expiry',
            execute: () => dependencies.purchaseIntentExpiry.execute(),
          },
        ],
      },
      // The Session horizon moves only at Bolivia midnight, so an hourly pass
      // keeps it filled (ADR-0059).
      {
        intervalMs: sessionScheduleIntervalMs,
        steps: [
          {
            job: 'session_materialization',
            execute: () => dependencies.sessionSchedules.execute(),
          },
        ],
      },
      // Block commands materialize synchronously, so an hourly pass is enough
      // (ADR-0059); reminders are swept every minute so each is at most a
      // minute late (ADR-0058).
      {
        intervalMs: evaluationSlotIntervalMs,
        steps: [
          {
            job: 'evaluation_slot_materialization',
            execute: () => dependencies.evaluationSlots.execute(),
          },
        ],
      },
      {
        intervalMs: evaluationReminderIntervalMs,
        steps: [
          {
            job: 'evaluation_reminders',
            execute: () => dependencies.evaluationReminders.execute(),
          },
        ],
      },
      // The one-time empty check and the Session-start Waitlist closure are
      // each swept every minute (ADR-0058). The check runs first so one the
      // worker missed settles before its Session's Waitlist closes.
      {
        intervalMs: sessionStartCheckIntervalMs,
        steps: [
          {
            job: 'minimum_bookings_check',
            execute: () => dependencies.minimumBookingsChecks.execute(),
          },
          {
            job: 'started_waitlist_closure',
            execute: () => dependencies.startedSessionWaitlists.execute(),
          },
        ],
      },
      // Expo keeps receipts for a day and has most within fifteen minutes
      // (NOT-002).
      {
        intervalMs: pushReceiptIntervalMs,
        steps: [
          {
            job: 'push_receipts',
            execute: () => dependencies.pushReceipts.execute(),
          },
        ],
      },
      // Housekeeping for rows past their provisional retention (BE-008);
      // hourly keeps each batch small.
      {
        intervalMs: retentionSweepIntervalMs,
        steps: [
          {
            job: 'retention_sweep',
            execute: () => dependencies.retentionSweeps.execute(),
          },
        ],
      },
    ],
    {
      serviceVersion: dependencies.serviceVersion,
      emit: (record) => dependencies.emit(record),
      reportError: (error, context) => errorReporter.report(error, context),
    },
  );

  const getQueueCounts = async (queue: string) => {
    const snapshots = await dependencies.boss.getQueueStats(queue, {
      force: true,
    });
    const latest = snapshots.at(-1);

    return {
      ready: latest?.readyCount ?? 0,
      active: latest?.activeCount ?? 0,
      failed: latest?.failedCount ?? 0,
    };
  };

  // The authentication email queue fills on purpose while email is disabled.
  const watchedQueues =
    dependencies.authenticationEmail === null
      ? [FINALIZE_UPLOAD_QUEUE, PUSH_DISPATCH_QUEUE]
      : [
          FINALIZE_UPLOAD_QUEUE,
          PUSH_DISPATCH_QUEUE,
          AUTHENTICATION_EMAIL_QUEUE,
        ];

  const stopHeartbeat = startWorkerHeartbeat({
    serviceVersion: dependencies.serviceVersion,
    getAuthenticationEmailCounts: () =>
      getQueueCounts(AUTHENTICATION_EMAIL_QUEUE),
    getFinalizeUploadCounts: () => getQueueCounts(FINALIZE_UPLOAD_QUEUE),
    findStalls: async () =>
      findProgressStalls({
        now: new Date(),
        oldestReadyJobs: await readOldestReadyJobs(
          dependencies.boss.getDb(),
          watchedQueues,
        ),
        sweeps: sweeps.progress(),
      }),
    emit: (record) => dependencies.emit(record),
    ping: dependencies.pingHeartbeat,
  });

  return async () => {
    sweeps.stop();
    stopHeartbeat();
    await dependencies.boss.stop({ graceful: true });
  };
};
