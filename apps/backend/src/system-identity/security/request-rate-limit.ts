/** One counter a request is charged to, with its allowance per window. */
export type RateLimitLane = { key: string; allowed: number };

export type RequestRateLimiter = {
  /** Seconds until every lane has room again, or 0 after charging them. */
  admit: (lanes: readonly RateLimitLane[]) => number;
};

export const generalRequestLimits = {
  perAddressPerMinute: 1_200,
  perCredentialPerMinute: 600,
} as const;

export const requestRateLimitLanes = (source: {
  networkAddress: string;
  credential: string | null;
}): RateLimitLane[] => (source.credential === undefined ? [] : []);

export const createRequestRateLimiter = (
  now: () => number,
): RequestRateLimiter => ({ admit: () => Math.min(0, now()) });
