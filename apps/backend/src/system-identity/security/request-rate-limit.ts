import { createHash } from 'node:crypto';

/** One counter a request is charged to, with its allowance per window. */
export type RateLimitLane = { key: string; allowed: number };

export type RequestRateLimiter = {
  /** Seconds until every lane has room again, or 0 after charging them. */
  admit: (lanes: readonly RateLimitLane[]) => number;
};

// ADR-0099: well above anything a person, the studio's shared Wi-Fi, or the
// browser and simulator suites send in a minute.
export const generalRequestLimits = {
  perAddressPerMinute: 1_200,
  perCredentialPerMinute: 600,
} as const;

/**
 * Owner (review of the walkthrough PR): a referral code's lookup and its
 * invite page name the holder without a credential, so an address may ask
 * for codes 30 times a minute, far more than a person typing one code.
 */
export const codeLookupsPerAddressPerMinute = 30;
const codeLookupPaths = ['/api/v1/referral-codes/lookup', '/client/invite/'];

const windowMilliseconds = 60_000;

/**
 * Every request counts against its network address, so a made-up credential
 * cannot escape the address lane; a credential, which belongs to one
 * Account's session, also has its own tighter lane.
 */
export const requestRateLimitLanes = (source: {
  networkAddress: string;
  credential: string | null;
  /** The request's path without its query, for the code lookups' lane. */
  path?: string;
}): RateLimitLane[] => {
  const network = {
    key: `network:${source.networkAddress}`,
    allowed: generalRequestLimits.perAddressPerMinute,
  };
  const path = source.path ?? '';
  const lookups = codeLookupPaths.some((prefix) => path.startsWith(prefix))
    ? [
        {
          key: `code-lookups:${source.networkAddress}`,
          allowed: codeLookupsPerAddressPerMinute,
        },
      ]
    : [];
  if (source.credential === null) {
    return [network, ...lookups];
  }
  const digest = createHash('sha256').update(source.credential).digest('hex');
  return [
    network,
    {
      key: `credential:${digest}`,
      allowed: generalRequestLimits.perCredentialPerMinute,
    },
    ...lookups,
  ];
};

/**
 * Fixed minute windows held in this process's memory; every counter is
 * dropped together when the next window starts.
 */
export const createRequestRateLimiter = (
  now: () => number,
): RequestRateLimiter => {
  let window = -1;
  const counts = new Map<string, number>();

  return {
    admit: (lanes) => {
      const time = now();
      const current = Math.floor(time / windowMilliseconds);
      if (current !== window) {
        window = current;
        counts.clear();
      }

      if (lanes.some(({ key, allowed }) => (counts.get(key) ?? 0) >= allowed)) {
        return Math.ceil(((current + 1) * windowMilliseconds - time) / 1_000);
      }
      lanes.forEach(({ key }) => counts.set(key, (counts.get(key) ?? 0) + 1));
      return 0;
    },
  };
};
