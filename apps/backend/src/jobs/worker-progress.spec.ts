import { findProgressStalls } from './worker-progress';

const now = new Date('2026-10-14T12:00:00.000Z');
const minutesAgo = (minutes: number) =>
  new Date(now.getTime() - minutes * 60_000);

describe('worker progress (ADR-0066)', () => {
  it('finds nothing while queues move and sweeps succeed on time', () => {
    expect(
      findProgressStalls({
        now,
        oldestReadyJobs: [{ queue: 'uploads.finalize.v1', readySince: null }],
        sweeps: [
          {
            job: 'evaluation_reminders',
            intervalMs: 60_000,
            lastSuccessAt: minutesAgo(1),
          },
        ],
      }),
    ).toEqual([]);
  });

  it('finds a queue whose oldest ready job has waited five minutes', () => {
    expect(
      findProgressStalls({
        now,
        oldestReadyJobs: [
          { queue: 'uploads.finalize.v1', readySince: minutesAgo(5) },
          {
            queue: 'system.authentication-email.v1',
            readySince: minutesAgo(4),
          },
        ],
        sweeps: [],
      }),
    ).toEqual(['queue_stuck:uploads.finalize.v1']);
  });

  // Twice the interval plus two minutes: 4 minutes for an every-minute sweep,
  // 12 for a five-minute one, 2 hours 2 minutes for an hourly one.
  it.each([
    [60_000, 4],
    [5 * 60_000, 12],
    [60 * 60_000, 122],
  ])(
    'finds a sweep every %i ms stale once %i minutes pass without a success',
    (intervalMs, minutes) => {
      const sweep = (lastSuccessAt: Date) => ({
        now,
        oldestReadyJobs: [],
        sweeps: [{ job: 'retention_sweep', intervalMs, lastSuccessAt }],
      });

      expect(findProgressStalls(sweep(minutesAgo(minutes)))).toEqual([]);
      expect(findProgressStalls(sweep(minutesAgo(minutes + 0.1)))).toEqual([
        'sweep_stale:retention_sweep',
      ]);
    },
  );

  it('lists every stall in a stable order', () => {
    expect(
      findProgressStalls({
        now,
        oldestReadyJobs: [
          { queue: 'uploads.finalize.v1', readySince: minutesAgo(30) },
        ],
        sweeps: [
          {
            job: 'purchase_intent_expiry',
            intervalMs: 5 * 60_000,
            lastSuccessAt: minutesAgo(13),
          },
          {
            job: 'minimum_bookings_check',
            intervalMs: 60_000,
            lastSuccessAt: minutesAgo(5),
          },
        ],
      }),
    ).toEqual([
      'queue_stuck:uploads.finalize.v1',
      'sweep_stale:purchase_intent_expiry',
      'sweep_stale:minimum_bookings_check',
    ]);
  });
});
