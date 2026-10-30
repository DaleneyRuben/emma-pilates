import { SweepItemsFailed } from './jobs/sweep-each';
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

    const { stop } = await startSweeps(
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

    const { stop } = await startSweeps(
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

  it('does not start a pass while the previous pass of that group is still running', async () => {
    jest.useFakeTimers();
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const execute = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockImplementation(() => gate);

    const { stop } = await startSweeps(
      [
        {
          intervalMs: 60_000,
          steps: [{ job: 'class_reminders', execute }],
        },
      ],
      { serviceVersion: '1.2.3', emit: jest.fn(), reportError: jest.fn() },
    );
    expect(execute).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(60_000);
    await Promise.resolve();
    expect(execute).toHaveBeenCalledTimes(2);

    jest.advanceTimersByTime(60_000);
    await Promise.resolve();
    expect(execute).toHaveBeenCalledTimes(2);

    release();
    stop();
  });

  it('records when each step last succeeded, from the worker start until then', async () => {
    jest.useFakeTimers({ now: new Date('2026-10-14T12:00:00.000Z') });
    const reminders = jest
      .fn()
      .mockRejectedValueOnce(new Error('P1001'))
      .mockResolvedValueOnce({ sent: 0 });

    const sweeps = await startSweeps(
      [
        {
          intervalMs: 60_000,
          steps: [
            { job: 'evaluation_reminders', execute: reminders },
            {
              job: 'minimum_bookings_check',
              execute: jest.fn().mockRejectedValue(new Error('P1001')),
            },
          ],
        },
      ],
      {
        serviceVersion: '1.2.3',
        emit: jest.fn(),
        reportError: jest.fn(),
        now: () => new Date(),
      },
    );
    await jest.advanceTimersByTimeAsync(60_000);

    expect(sweeps.progress()).toEqual([
      {
        job: 'evaluation_reminders',
        intervalMs: 60_000,
        lastSuccessAt: new Date('2026-10-14T12:01:00.000Z'),
      },
      {
        job: 'minimum_bookings_check',
        intervalMs: 60_000,
        lastSuccessAt: new Date('2026-10-14T12:00:00.000Z'),
      },
    ]);
    sweeps.stop();
  });

  it('counts a pass with failed items as finished and reports each item once a day', async () => {
    jest.useFakeTimers();
    const now = jest.fn(() => new Date(Date.now()));
    const failing = () =>
      Promise.reject(
        new SweepItemsFailed('class_reminders', [
          { id: 'booking-1', error: new Error('notice broke') },
        ]),
      );
    const emit = jest.fn();
    const reportError = jest.fn();

    const { stop, progress } = await startSweeps(
      [
        {
          intervalMs: 60_000,
          steps: [{ job: 'class_reminders', execute: failing }],
        },
      ],
      { serviceVersion: '1.2.3', emit, reportError, now },
    );
    await jest.advanceTimersByTimeAsync(10 * 60_000);

    // The pass still ran, so the sweep is not stale.
    expect(progress()[0].lastSuccessAt.getTime()).toBe(Date.now());
    expect(emit).toHaveBeenCalledTimes(11);
    expect(reportError).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(24 * 60 * 60_000);
    expect(reportError).toHaveBeenCalledTimes(2);
    stop();
  });
});
