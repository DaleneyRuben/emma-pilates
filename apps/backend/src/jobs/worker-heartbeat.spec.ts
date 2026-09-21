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
});
