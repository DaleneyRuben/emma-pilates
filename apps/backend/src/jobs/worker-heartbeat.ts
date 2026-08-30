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
  queues: { authenticationEmail: QueueCounts };
};

type WorkerHeartbeatDependencies = {
  serviceVersion: string;
  getAuthenticationEmailCounts(): Promise<QueueCounts>;
  emit(heartbeat: WorkerHeartbeat): void;
  now?: () => Date;
};

export const startWorkerHeartbeat = (
  dependencies: WorkerHeartbeatDependencies,
): (() => void) => {
  const now = dependencies.now ?? (() => new Date());
  const interval = setInterval(() => {
    void dependencies.getAuthenticationEmailCounts().then((counts) => {
      dependencies.emit({
        event: 'worker_heartbeat',
        serviceVersion: dependencies.serviceVersion,
        timestamp: now().toISOString(),
        queues: { authenticationEmail: counts },
      });
    });
  }, WORKER_HEARTBEAT_INTERVAL_MS);

  return () => clearInterval(interval);
};
