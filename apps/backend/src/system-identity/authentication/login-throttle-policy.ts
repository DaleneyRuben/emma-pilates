type LoginThrottleEvents = {
  loginLaneFailures: Date[];
  clientFailures: Date[];
  networkFailures: Date[];
};

export type LoginThrottle = { retryAfterSeconds: number };

export const getLoginThrottle = (
  _now: Date,
  _events: LoginThrottleEvents,
): LoginThrottle | null => null;
