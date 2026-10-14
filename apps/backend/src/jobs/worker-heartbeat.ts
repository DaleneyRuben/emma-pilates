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
  const findStalls = dependencies.findStalls ?? (() => Promise.resolve([]));
  let reportedStalls: string | null = null;

  // Logged once per change of reasons, so a long stall is one record.
  const recordProgress = (stalls: string[]) => {
    const key = stalls.join(',');
    if (key === (reportedStalls ?? '')) {
      return;
    }
    if (stalls.length === 0) {
      dependencies.emit({
        event: 'worker_progress_resumed',
        serviceVersion: dependencies.serviceVersion,
      });
      reportedStalls = null;
    } else {
      dependencies.emit({
        event: 'worker_progress_stalled',
        serviceVersion: dependencies.serviceVersion,
        reasons: stalls,
      });
      reportedStalls = key;
    }
  };

  const interval = setInterval(() => {
    void Promise.all([
      dependencies.getAuthenticationEmailCounts(),
      dependencies.getFinalizeUploadCounts(),
      findStalls(),
    ]).then(
      ([authenticationEmail, finalizeUpload, stalls]) => {
        dependencies.emit({
          event: 'worker_heartbeat',
          serviceVersion: dependencies.serviceVersion,
          timestamp: now().toISOString(),
          queues: { authenticationEmail, finalizeUpload },
        });
        recordProgress(stalls);
        // ADR-0066: a stuck queue or a stale sweep silences the ping, so the
        // external heartbeat monitor alerts.
        return stalls.length === 0 ? dependencies.ping?.() : undefined;
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
