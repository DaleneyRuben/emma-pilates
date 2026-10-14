export const WORKER_HEARTBEAT_INTERVAL_MS = 30_000;

type QueueCounts = {
  ready: number;
  active: number;
  failed: number;
};

type WorkerHeartbeat = {
  event: 'worker_heartbeat';
  serviceVersion: string;
  timestamp: string;
  queues: { authenticationEmail: QueueCounts; finalizeUpload: QueueCounts };
};

type WorkerHeartbeatFailure = {
  event: 'worker_heartbeat_failed';
  serviceVersion: string;
};

type WorkerProgressRecord =
  | {
      event: 'worker_progress_stalled';
      serviceVersion: string;
      reasons: string[];
    }
  | { event: 'worker_progress_resumed'; serviceVersion: string };

type WorkerHeartbeatDependencies = {
  serviceVersion: string;
  getAuthenticationEmailCounts(): Promise<QueueCounts>;
  getFinalizeUploadCounts(): Promise<QueueCounts>;
  findStalls?: () => Promise<string[]>;
  emit(
    heartbeat: WorkerHeartbeat | WorkerHeartbeatFailure | WorkerProgressRecord,
  ): void;
  ping?: () => Promise<void>;
  now?: () => Date;
};

export const startWorkerHeartbeat = (
  dependencies: WorkerHeartbeatDependencies,
): (() => void) => {
  const now = dependencies.now ?? (() => new Date());
  const interval = setInterval(() => {
    void Promise.all([
      dependencies.getAuthenticationEmailCounts(),
      dependencies.getFinalizeUploadCounts(),
    ]).then(
      ([authenticationEmail, finalizeUpload]) => {
        dependencies.emit({
          event: 'worker_heartbeat',
          serviceVersion: dependencies.serviceVersion,
          timestamp: now().toISOString(),
          queues: { authenticationEmail, finalizeUpload },
        });
        return dependencies.ping?.();
      },
      // ADR-0066: no ping while the queues cannot be read, so the external
      // heartbeat monitor alerts.
      () => {
        dependencies.emit({
          event: 'worker_heartbeat_failed',
          serviceVersion: dependencies.serviceVersion,
        });
      },
    );
  }, WORKER_HEARTBEAT_INTERVAL_MS);

  return () => clearInterval(interval);
};
