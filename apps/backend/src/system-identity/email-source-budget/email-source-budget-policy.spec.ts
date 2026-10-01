import { emailSourceWaitSeconds } from './email-source-budget-policy';

const now = new Date('2026-10-01T15:00:00.000Z');
const minutes = (count: number) => count * 60;
const ago = (seconds: number) => new Date(now.getTime() - seconds * 1_000);
// `count` events, the oldest `oldestSecondsAgo` and the rest one second apart.
const burst = (count: number, oldestSecondsAgo: number) =>
  Array.from({ length: count }, (_, index) => ago(oldestSecondsAgo - index));

describe('emailSourceWaitSeconds (BE-012 client and network lanes)', () => {
  it('lets a request through while both lanes have room', () => {
    expect(
      emailSourceWaitSeconds(
        'verification',
        { client: burst(9, minutes(5)), network: burst(49, minutes(5)) },
        now,
      ),
    ).toBe(0);
  });

  it('allows ten verification requests per client in a rolling 15 minutes', () => {
    expect(
      emailSourceWaitSeconds(
        'verification',
        { client: burst(10, minutes(14)), network: [] },
        now,
      ),
    ).toBe(60);
  });

  it('allows thirty verification requests per client in a rolling day', () => {
    const hourly = Array.from({ length: 30 }, (_, index) =>
      ago(minutes(60 * 23) - index * minutes(30)),
    );

    expect(
      emailSourceWaitSeconds(
        'verification',
        { client: hourly, network: [] },
        now,
      ),
    ).toBe(minutes(60));
  });

  it('allows five recovery requests per client in 15 minutes and ten in a day', () => {
    expect(
      emailSourceWaitSeconds(
        'password_recovery',
        { client: burst(5, minutes(10)), network: [] },
        now,
      ),
    ).toBe(minutes(5));

    const spread = Array.from({ length: 10 }, (_, index) =>
      ago(minutes(60 * 20) - index * minutes(60)),
    );
    expect(
      emailSourceWaitSeconds(
        'password_recovery',
        { client: spread, network: [] },
        now,
      ),
    ).toBe(minutes(60 * 4));
  });

  it('gives the network lane five times the client budget', () => {
    expect(
      emailSourceWaitSeconds(
        'verification',
        { client: [], network: burst(50, minutes(12)) },
        now,
      ),
    ).toBe(minutes(3));
    expect(
      emailSourceWaitSeconds(
        'password_recovery',
        { client: [], network: burst(25, minutes(12)) },
        now,
      ),
    ).toBe(minutes(3));
    expect(
      emailSourceWaitSeconds(
        'password_recovery',
        { client: [], network: burst(24, minutes(12)) },
        now,
      ),
    ).toBe(0);
  });

  it('caps the network lane at 200 verification and 100 recovery requests a day', () => {
    const spread = (count: number) =>
      Array.from({ length: count }, (_, index) =>
        ago(minutes(60 * 22) - index * minutes(6)),
      );

    expect(
      emailSourceWaitSeconds(
        'verification',
        { client: [], network: spread(200) },
        now,
      ),
    ).toBe(minutes(60 * 2));
    expect(
      emailSourceWaitSeconds(
        'password_recovery',
        { client: [], network: spread(100) },
        now,
      ),
    ).toBe(minutes(60 * 2));
  });

  it('checks only the network lane when the request has no client identifier', () => {
    expect(
      emailSourceWaitSeconds(
        'verification',
        { client: null, network: burst(10, minutes(14)) },
        now,
      ),
    ).toBe(0);
  });

  it('waits for the longest of the full lanes', () => {
    expect(
      emailSourceWaitSeconds(
        'verification',
        { client: burst(10, minutes(14)), network: burst(50, minutes(5)) },
        now,
      ),
    ).toBe(minutes(10));
  });
});
