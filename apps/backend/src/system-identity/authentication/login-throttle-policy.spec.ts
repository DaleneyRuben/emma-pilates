import { getLoginThrottle } from './login-throttle-policy';

describe('getLoginThrottle', () => {
  const now = new Date('2026-08-31T12:00:00.000Z');
  const secondsAgo = (seconds: number): Date =>
    new Date(now.getTime() - seconds * 1_000);

  it('allows the first five failed checks in a Login lane without delay', () => {
    expect(
      getLoginThrottle(now, {
        loginLaneFailures: [1, 2, 3, 4, 5].map(secondsAgo),
        clientFailures: [],
        networkFailures: [],
      }),
    ).toBeNull();
  });

  it.each([
    [6, 30],
    [7, 60],
    [8, 300],
    [9, 900],
    [20, 900],
  ])(
    'applies the approved wait after %i Login-lane failures',
    (failureCount, waitSeconds) => {
      const failures = Array.from({ length: failureCount }, () =>
        secondsAgo(10),
      );

      expect(
        getLoginThrottle(now, {
          loginLaneFailures: failures,
          clientFailures: [],
          networkFailures: [],
        }),
      ).toEqual({ retryAfterSeconds: waitSeconds - 10 });
    },
  );

  it('resets a Login lane after one hour without a failed check', () => {
    expect(
      getLoginThrottle(now, {
        loginLaneFailures: Array.from({ length: 9 }, () => secondsAgo(3_601)),
        clientFailures: [],
        networkFailures: [],
      }),
    ).toBeNull();
  });

  it('stops a client after 20 failures in its rolling 15-minute window', () => {
    expect(
      getLoginThrottle(now, {
        loginLaneFailures: [],
        clientFailures: Array.from({ length: 20 }, () => secondsAgo(600)),
        networkFailures: [],
      }),
    ).toEqual({ retryAfterSeconds: 300 });
  });

  it('stops a network after 100 failures in its rolling 15-minute window', () => {
    expect(
      getLoginThrottle(now, {
        loginLaneFailures: [],
        clientFailures: [],
        networkFailures: Array.from({ length: 100 }, () => secondsAgo(899)),
      }),
    ).toEqual({ retryAfterSeconds: 1 });
  });
});
