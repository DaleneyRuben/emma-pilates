import {
  startWorkerHeartbeat,
  WORKER_HEARTBEAT_INTERVAL_MS,
} from './worker-heartbeat';

const counts = { ready: 0, active: 0, failed: 0 };

const start = (findStalls: jest.Mock) => {
  const emit = jest.fn();
  const ping = jest.fn().mockResolvedValue(undefined);
  const stop = startWorkerHeartbeat({
    serviceVersion: '1.2.3',
    getAuthenticationEmailCounts: jest.fn().mockResolvedValue(counts),
    getFinalizeUploadCounts: jest.fn().mockResolvedValue(counts),
    findStalls,
    emit,
    ping,
  });
  const progressRecords = () =>
    emit.mock.calls
      .map(([record]) => record as { event: string })
      .filter(({ event }) => event.startsWith('worker_progress_'));

  return { emit, ping, stop, progressRecords };
};

// ADR-0066: the external heartbeat proves progress, so a stuck queue or a
// stale sweep silences it and Better Stack alerts.
describe('worker heartbeat progress gate (EXT-011)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('skips the ping and logs the reasons once while the worker is stalled', async () => {
    const findStalls = jest
      .fn()
      .mockResolvedValue(['queue_stuck:uploads.finalize.v1']);
    const { ping, stop, progressRecords } = start(findStalls);

    await jest.advanceTimersByTimeAsync(WORKER_HEARTBEAT_INTERVAL_MS * 3);

    expect(ping).not.toHaveBeenCalled();
    expect(progressRecords()).toEqual([
      {
        event: 'worker_progress_stalled',
        serviceVersion: '1.2.3',
        reasons: ['queue_stuck:uploads.finalize.v1'],
      },
    ]);
    stop();
  });

  it('logs again when the reasons change, and pings once they clear', async () => {
    const findStalls = jest
      .fn()
      .mockResolvedValueOnce(['sweep_stale:retention_sweep'])
      .mockResolvedValueOnce([
        'queue_stuck:uploads.finalize.v1',
        'sweep_stale:retention_sweep',
      ])
      .mockResolvedValue([]);
    const { ping, stop, progressRecords } = start(findStalls);

    await jest.advanceTimersByTimeAsync(WORKER_HEARTBEAT_INTERVAL_MS * 4);

    expect(progressRecords()).toEqual([
      {
        event: 'worker_progress_stalled',
        serviceVersion: '1.2.3',
        reasons: ['sweep_stale:retention_sweep'],
      },
      {
        event: 'worker_progress_stalled',
        serviceVersion: '1.2.3',
        reasons: [
          'queue_stuck:uploads.finalize.v1',
          'sweep_stale:retention_sweep',
        ],
      },
      { event: 'worker_progress_resumed', serviceVersion: '1.2.3' },
    ]);
    expect(ping).toHaveBeenCalledTimes(2);
    stop();
  });

  it('treats a failed progress read like a failed queue read', async () => {
    const findStalls = jest
      .fn()
      .mockRejectedValue(new Error('connection terminated'));
    const { emit, ping, stop } = start(findStalls);

    await jest.advanceTimersByTimeAsync(WORKER_HEARTBEAT_INTERVAL_MS);

    expect(emit).toHaveBeenCalledWith({
      event: 'worker_heartbeat_failed',
      serviceVersion: '1.2.3',
    });
    expect(ping).not.toHaveBeenCalled();
    stop();
  });
});
