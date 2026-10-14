import { startSweeps } from './worker-sweeps';

describe('worker sweeps', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  // EXT-011: the log line alone never said why a sweep failed.
  it('reports a failed sweep with its job and keeps logging the failure', async () => {
    jest.useFakeTimers();
    const failure = new Error('P2028');
    const emit = jest.fn();
    const reportError = jest.fn();

    const stop = await startSweeps(
      [
        {
          intervalMs: 60_000,
          steps: [
            {
              job: 'retention_sweep',
              execute: jest.fn().mockRejectedValue(failure),
            },
          ],
        },
      ],
      { serviceVersion: '1.2.3', emit, reportError },
    );

    expect(emit).toHaveBeenCalledWith({
      event: 'retention_sweep_failed',
      serviceVersion: '1.2.3',
    });
    expect(reportError).toHaveBeenCalledWith(failure, {
      job: 'retention_sweep',
    });
    stop();
  });

  it('reports a failure on a later pass too', async () => {
    jest.useFakeTimers();
    const failure = new Error('P1001');
    const execute = jest
      .fn()
      .mockResolvedValueOnce({ sent: 0 })
      .mockRejectedValueOnce(failure);
    const reportError = jest.fn();

    const stop = await startSweeps(
      [
        {
          intervalMs: 60_000,
          steps: [{ job: 'evaluation_reminders', execute }],
        },
      ],
      { serviceVersion: '1.2.3', emit: jest.fn(), reportError },
    );
    expect(reportError).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(60_000);

    expect(reportError).toHaveBeenCalledWith(failure, {
      job: 'evaluation_reminders',
    });
    stop();
  });
});
