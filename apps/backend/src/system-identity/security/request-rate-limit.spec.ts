import {
  createRequestRateLimiter,
  generalRequestLimits,
  requestRateLimitLanes,
} from './request-rate-limit';

const minute = 60_000;
const credential = 'c'.repeat(43);

const clockAt = (start: number) => {
  let time = start;
  return {
    now: () => time,
    set: (next: number) => {
      time = next;
    },
  };
};

describe('BE-025 general request rate limit', () => {
  it('charges an anonymous request to its network address only', () => {
    expect(
      requestRateLimitLanes({
        networkAddress: '203.0.113.7',
        credential: null,
      }),
    ).toEqual([
      {
        key: 'network:203.0.113.7',
        allowed: generalRequestLimits.perAddressPerMinute,
      },
    ]);
  });

  it('charges a credentialed request to its credential and its address', () => {
    const lanes = requestRateLimitLanes({
      networkAddress: '203.0.113.7',
      credential,
    });

    expect(lanes).toHaveLength(2);
    expect(lanes[0]).toEqual({
      key: 'network:203.0.113.7',
      allowed: generalRequestLimits.perAddressPerMinute,
    });
    expect(lanes[1]?.allowed).toBe(generalRequestLimits.perCredentialPerMinute);
  });

  it('never keeps the raw credential as a counter key', () => {
    const [, credentialLane] = requestRateLimitLanes({
      networkAddress: '203.0.113.7',
      credential,
    });

    expect(credentialLane?.key).toMatch(/^credential:[0-9a-f]{64}$/);
    expect(credentialLane?.key).not.toContain(credential);
  });

  it('admits a lane up to its allowance, then waits for the next minute', () => {
    const clock = clockAt(10 * minute + 15_000);
    const limiter = createRequestRateLimiter(clock.now);
    const lanes = [{ key: 'network:a', allowed: 3 }];

    expect([1, 2, 3].map(() => limiter.admit(lanes))).toEqual([0, 0, 0]);
    expect(limiter.admit(lanes)).toBe(45);

    clock.set(10 * minute + 59_500);
    expect(limiter.admit(lanes)).toBe(1);

    clock.set(11 * minute);
    expect(limiter.admit(lanes)).toBe(0);
  });

  it('rejects when any lane is full and charges none of them', () => {
    const clock = clockAt(0);
    const limiter = createRequestRateLimiter(clock.now);
    const network = { key: 'network:a', allowed: 3 };
    const first = { key: 'credential:1', allowed: 1 };
    const second = { key: 'credential:2', allowed: 5 };

    expect(limiter.admit([network, first])).toBe(0);
    expect(limiter.admit([network, first])).toBe(60);
    expect(limiter.admit([network, second])).toBe(0);
    expect(limiter.admit([network, second])).toBe(0);
    expect(limiter.admit([network, second])).toBe(60);
  });

  it('keeps separate keys apart', () => {
    const limiter = createRequestRateLimiter(() => 0);

    expect(limiter.admit([{ key: 'network:a', allowed: 1 }])).toBe(0);
    expect(limiter.admit([{ key: 'network:b', allowed: 1 }])).toBe(0);
  });
});
