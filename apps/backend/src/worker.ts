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
import {
  startInstalledPgBoss,
  type StartablePgBoss,
} from './jobs/pg-boss-runtime';
import { startWorkerHeartbeat } from './jobs/worker-heartbeat';

const pendingAccountCleanupIntervalMs = 60 * 60 * 1_000;
const imageUploadCleanupIntervalMs = 60 * 60 * 1_000;
const subscriptionReminderIntervalMs = 60 * 60 * 1_000;
const purchaseIntentExpiryIntervalMs = 5 * 60 * 1_000;
const sessionScheduleIntervalMs = 60 * 60 * 1_000;
const evaluationSlotIntervalMs = 60 * 60 * 1_000;
const evaluationReminderIntervalMs = 60 * 1_000;
const sessionStartCheckIntervalMs = 60 * 1_000;

type QueueStatsSnapshot = {
  readyCount: number;
  activeCount: number;
  failedCount: number;
};

export interface WorkerBoss extends StartablePgBoss {
  work: AuthenticationEmailWorkerBoss['work'] &
    FinalizeUploadWorkerBoss['work'];
  getQueueStats(
    name: string,
    options: { force: true },
  ): Promise<QueueStatsSnapshot[]>;
  stop(options: { graceful: true }): Promise<void>;
}

type WorkerDependencies = {
  boss: WorkerBoss;
  authenticationEmail: AuthenticationEmailProcessorDependencies;
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
  emptySessionChecks: {
    execute(): Promise<{ checked: number; cancelled: number }>;
  };
  startedSessionWaitlists: {
    execute(): Promise<{ closed: number }>;
  };
  serviceVersion: string;
  emit(record: unknown): void;
};

export const startWorker = async (
  dependencies: WorkerDependencies,
): Promise<() => Promise<void>> => {
  await startInstalledPgBoss(dependencies.boss);
  await registerAuthenticationEmailWorker(
    dependencies.boss,
    dependencies.authenticationEmail,
  );
  await registerFinalizeUploadWorker(
    dependencies.boss,
    dependencies.finalizeUpload,
  );
  await dependencies.pendingAccountCleanup.execute();
  const pendingAccountCleanupTimer = setInterval(() => {
    void dependencies.pendingAccountCleanup.execute().catch(() => {
      dependencies.emit({
        event: 'pending_account_cleanup_failed',
        serviceVersion: dependencies.serviceVersion,
      });
    });
  }, pendingAccountCleanupIntervalMs);

  await dependencies.imageUploadCleanup.execute();
  const imageUploadCleanupTimer = setInterval(() => {
    void dependencies.imageUploadCleanup.execute().catch(() => {
      dependencies.emit({
        event: 'image_upload_cleanup_failed',
        serviceVersion: dependencies.serviceVersion,
      });
    });
  }, imageUploadCleanupIntervalMs);

  await dependencies.subscriptionReminders.execute();
  const subscriptionReminderTimer = setInterval(() => {
    void dependencies.subscriptionReminders.execute().catch(() => {
      dependencies.emit({
        event: 'subscription_reminders_failed',
        serviceVersion: dependencies.serviceVersion,
      });
    });
  }, subscriptionReminderIntervalMs);

  await dependencies.purchaseIntentExpiry.execute();
  const purchaseIntentExpiryTimer = setInterval(() => {
    void dependencies.purchaseIntentExpiry.execute().catch(() => {
      dependencies.emit({
        event: 'purchase_intent_expiry_failed',
        serviceVersion: dependencies.serviceVersion,
      });
    });
  }, purchaseIntentExpiryIntervalMs);

  // The Session horizon moves only at Bolivia midnight, so an hourly pass
  // keeps it filled (ADR-0059).
  const runSessionSchedules = () =>
    dependencies.sessionSchedules.execute().catch(() => {
      dependencies.emit({
        event: 'session_materialization_failed',
        serviceVersion: dependencies.serviceVersion,
      });
    });
  await runSessionSchedules();
  const sessionScheduleTimer = setInterval(() => {
    void runSessionSchedules();
  }, sessionScheduleIntervalMs);

  // The horizon moves only at Bolivia midnight and block commands materialize
  // synchronously, so an hourly pass is enough (ADR-0059); reminders are swept
  // every minute so each is at most a minute late (ADR-0058).
  const runEvaluationSlots = () =>
    dependencies.evaluationSlots.execute().catch(() => {
      dependencies.emit({
        event: 'evaluation_slot_materialization_failed',
        serviceVersion: dependencies.serviceVersion,
      });
    });
  const runEvaluationReminders = () =>
    dependencies.evaluationReminders.execute().catch(() => {
      dependencies.emit({
        event: 'evaluation_reminders_failed',
        serviceVersion: dependencies.serviceVersion,
      });
    });
  await runEvaluationSlots();
  const evaluationSlotTimer = setInterval(() => {
    void runEvaluationSlots();
  }, evaluationSlotIntervalMs);
  await runEvaluationReminders();
  const evaluationReminderTimer = setInterval(() => {
    void runEvaluationReminders();
  }, evaluationReminderIntervalMs);

  // The one-time empty check and the Session-start Waitlist closure are each
  // swept every minute, so neither is more than a minute late (ADR-0058). The
  // check runs first so one the worker missed settles before its Session's
  // Waitlist closes.
  const runEmptySessionChecks = () =>
    dependencies.emptySessionChecks.execute().catch(() => {
      dependencies.emit({
        event: 'empty_session_check_failed',
        serviceVersion: dependencies.serviceVersion,
      });
    });
  const runStartedSessionWaitlists = () =>
    dependencies.startedSessionWaitlists.execute().catch(() => {
      dependencies.emit({
        event: 'started_waitlist_closure_failed',
        serviceVersion: dependencies.serviceVersion,
      });
    });
  await runEmptySessionChecks();
  await runStartedSessionWaitlists();
  const sessionStartCheckTimer = setInterval(() => {
    void runEmptySessionChecks().then(runStartedSessionWaitlists);
  }, sessionStartCheckIntervalMs);

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

  const stopHeartbeat = startWorkerHeartbeat({
    serviceVersion: dependencies.serviceVersion,
    getAuthenticationEmailCounts: () =>
      getQueueCounts(AUTHENTICATION_EMAIL_QUEUE),
    getFinalizeUploadCounts: () => getQueueCounts(FINALIZE_UPLOAD_QUEUE),
    emit: (record) => dependencies.emit(record),
  });

  return async () => {
    clearInterval(pendingAccountCleanupTimer);
    clearInterval(imageUploadCleanupTimer);
    clearInterval(subscriptionReminderTimer);
    clearInterval(purchaseIntentExpiryTimer);
    clearInterval(sessionScheduleTimer);
    clearInterval(evaluationSlotTimer);
    clearInterval(evaluationReminderTimer);
    clearInterval(sessionStartCheckTimer);
    stopHeartbeat();
    await dependencies.boss.stop({ graceful: true });
  };
};
