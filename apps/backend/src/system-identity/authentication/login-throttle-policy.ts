type LoginThrottleEvents = {
  loginLaneFailures: Date[];
  clientFailures: Date[];
  networkFailures: Date[];
};

export type LoginThrottle = { retryAfterSeconds: number };

const minuteMilliseconds = 60 * 1_000;
const loginLaneWindowMilliseconds = 60 * minuteMilliseconds;
const originWindowMilliseconds = 15 * minuteMilliseconds;

const progressiveWaitMilliseconds = (failureCount: number): number => {
  if (failureCount < 6) return 0;
  if (failureCount === 6) return 30 * 1_000;
  if (failureCount === 7) return minuteMilliseconds;
  if (failureCount === 8) return 5 * minuteMilliseconds;
  return 15 * minuteMilliseconds;
};

const activeFailures = (failures: Date[], after: number): number[] =>
  failures.map((failure) => failure.getTime()).filter((time) => time > after);

export const getLoginThrottle = (
  now: Date,
  events: LoginThrottleEvents,
): LoginThrottle | null => {
  const nowTime = now.getTime();
  const retryTimes: number[] = [];
  const laneFailures = activeFailures(
    events.loginLaneFailures,
    nowTime - loginLaneWindowMilliseconds,
  );
  const laneWait = progressiveWaitMilliseconds(laneFailures.length);

  if (laneWait > 0) {
    retryTimes.push(Math.max(...laneFailures) + laneWait);
  }

  const addOriginRetry = (failures: Date[], budget: number): void => {
    const recentFailures = activeFailures(
      failures,
      nowTime - originWindowMilliseconds,
    );

    if (recentFailures.length >= budget) {
      retryTimes.push(Math.min(...recentFailures) + originWindowMilliseconds);
    }
  };

  addOriginRetry(events.clientFailures, 20);
  addOriginRetry(events.networkFailures, 100);

  const retryAt = retryTimes.length === 0 ? nowTime : Math.max(...retryTimes);

  if (retryAt <= nowTime) {
    return null;
  }

  return { retryAfterSeconds: Math.ceil((retryAt - nowTime) / 1_000) };
};
