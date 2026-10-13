const heartbeatPingTimeoutMs = 10_000;

type HeartbeatPingRecord = {
  event: 'worker_heartbeat_ping_failed';
  status?: number;
};

type HeartbeatPingDependencies = {
  fetch: (
    url: string,
    init: { method: 'GET'; signal: AbortSignal },
  ) => Promise<{ ok: boolean; status: number }>;
  emit(record: HeartbeatPingRecord): void;
};

// ADR-0066: the alert comes from Better Stack when these pings stop, so a
// failed ping is only recorded; the URL itself is a credential and never
// logged.
export const createHeartbeatPing =
  (
    url: string | null,
    dependencies: HeartbeatPingDependencies,
  ): (() => Promise<void>) =>
  async () => {
    if (url === null) {
      return;
    }
    try {
      const response = await dependencies.fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(heartbeatPingTimeoutMs),
      });
      if (!response.ok) {
        dependencies.emit({
          event: 'worker_heartbeat_ping_failed',
          status: response.status,
        });
      }
    } catch {
      dependencies.emit({ event: 'worker_heartbeat_ping_failed' });
    }
  };
