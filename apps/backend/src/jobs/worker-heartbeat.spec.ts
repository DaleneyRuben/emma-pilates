import {
  startWorkerHeartbeat,
  WORKER_HEARTBEAT_INTERVAL_MS,
} from './worker-heartbeat';

describe('worker heartbeat', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('emits sanitized queue counts at a fixed interval', async () => {
    jest.useFakeTimers();
    const getAuthenticationEmailCounts = jest.fn().mockResolvedValue({
      ready: 2,
      active: 1,
      failed: 3,
    });
    const getFinalizeUploadCounts = jest.fn().mockResolvedValue({
      ready: 5,
      active: 0,
      failed: 1,
    });
    const emit = jest.fn();
    const stop = startWorkerHeartbeat({
      serviceVersion: '1.2.3',
      getAuthenticationEmailCounts,
      getFinalizeUploadCounts,
      emit,
      now: () => new Date('2026-08-30T15:00:00.000Z'),
    });

    await jest.advanceTimersByTimeAsync(WORKER_HEARTBEAT_INTERVAL_MS);

    expect(emit).toHaveBeenCalledWith({
      event: 'worker_heartbeat',
      serviceVersion: '1.2.3',
      timestamp: '2026-08-30T15:00:00.000Z',
      queues: {
        authenticationEmail: { ready: 2, active: 1, failed: 3 },
        finalizeUpload: { ready: 5, active: 0, failed: 1 },
      },
    });

    stop();
    await jest.advanceTimersByTimeAsync(WORKER_HEARTBEAT_INTERVAL_MS);
    expect(emit).toHaveBeenCalledTimes(1);
  });

  it('pings the external heartbeat after each emitted heartbeat', async () => {
    jest.useFakeTimers();
    const counts = { ready: 0, active: 0, failed: 0 };
    const emit = jest.fn();
    const ping = jest.fn().mockResolvedValue(undefined);
    const stop = startWorkerHeartbeat({
      serviceVersion: '1.2.3',
      getAuthenticationEmailCounts: jest.fn().mockResolvedValue(counts),
      getFinalizeUploadCounts: jest.fn().mockResolvedValue(counts),
      emit,
      ping,
    });

    await jest.advanceTimersByTimeAsync(WORKER_HEARTBEAT_INTERVAL_MS * 2);

    expect(ping).toHaveBeenCalledTimes(2);
    stop();
  });

  // ADR-0066: a worker that cannot read its queues is not making progress, so
  // the external heartbeat goes quiet and its monitor alerts.
  it('records a failed heartbeat and skips the ping when queue counts fail', async () => {
    jest.useFakeTimers();
    const emit = jest.fn();
    const ping = jest.fn().mockResolvedValue(undefined);
    const stop = startWorkerHeartbeat({
      serviceVersion: '1.2.3',
      getAuthenticationEmailCounts: jest
        .fn()
        .mockRejectedValue(new Error('connection terminated')),
      getFinalizeUploadCounts: jest
        .fn()
        .mockResolvedValue({ ready: 0, active: 0, failed: 0 }),
      emit,
      ping,
    });

    await jest.advanceTimersByTimeAsync(WORKER_HEARTBEAT_INTERVAL_MS);

    expect(emit).toHaveBeenCalledWith({
      event: 'worker_heartbeat_failed',
      serviceVersion: '1.2.3',
    });
    expect(ping).not.toHaveBeenCalled();
    stop();
  });
});
