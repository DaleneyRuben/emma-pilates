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

type QueueStatsSnapshot = {
  readyCount: number;
  activeCount: number;
  failedCount: number;
};

export interface WorkerBoss extends StartablePgBoss {
  work: AuthenticationEmailWorkerBoss['work'] & FinalizeUploadWorkerBoss['work'];
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
    stopHeartbeat();
    await dependencies.boss.stop({ graceful: true });
  };
};
