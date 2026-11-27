import { HttpException } from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  codeLookupsPerAddressPerMinute,
  createRequestRateLimiter,
  type RateLimitLane,
} from './request-rate-limit';
import { createRequestRateLimitMiddleware } from './request-rate-limit.middleware';

const credential = 'k'.repeat(43);

const request = (path: string, headers: Record<string, string> = {}): Request =>
  ({
    headers,
    originalUrl: path,
    socket: { remoteAddress: '10.0.0.9' },
  }) as unknown as Request;

const response = () => {
  const headers = new Map<string, string>();
  return {
    headers,
    value: {
      setHeader: (name: string, value: string) => headers.set(name, value),
    } as unknown as Response,
  };
};

describe('BE-025 request rate limit middleware', () => {
  it('lets an admitted request through after charging its lanes', () => {
    const charged: RateLimitLane[][] = [];
    const next = jest.fn();
    const middleware = createRequestRateLimitMiddleware({
      admit: (lanes) => {
        charged.push([...lanes]);
        return 0;
      },
    });

    middleware(
      request('/api/v1/sessions', { authorization: `Bearer ${credential}` }),
      response().value,
      next,
    );

    expect(next).toHaveBeenCalledWith();
    expect(charged[0]?.map(({ key }) => key.split(':')[0])).toEqual([
      'network',
      'credential',
    ]);
  });

  it('charges the admin web session like a mobile bearer credential', () => {
    const charged: RateLimitLane[][] = [];
    const middleware = createRequestRateLimitMiddleware({
      admit: (lanes) => {
        charged.push([...lanes]);
        return 0;
      },
    });

    middleware(
      request('/api/v1/administrator/clients', {
        authorization: `AdminSession ${credential}`,
      }),
      response().value,
      jest.fn(),
    );
    middleware(
      request('/api/v1/administrator/clients', {
        authorization: `Bearer ${credential}`,
      }),
      response().value,
      jest.fn(),
    );

    expect(charged[0]).toEqual(charged[1]);
  });

  it('treats a malformed authorization as anonymous', () => {
    const charged: RateLimitLane[][] = [];
    const middleware = createRequestRateLimitMiddleware({
      admit: (lanes) => {
        charged.push([...lanes]);
        return 0;
      },
    });

    middleware(
      request('/api/v1/sessions', { authorization: 'Bearer short' }),
      response().value,
      jest.fn(),
    );

    expect(charged[0]).toHaveLength(1);
  });

  it('answers 429 rate_limit_exceeded with Retry-After when a lane is full', () => {
    const next = jest.fn();
    const answer = response();
    const middleware = createRequestRateLimitMiddleware({ admit: () => 42 });

    let thrown: unknown;
    try {
      middleware(request('/api/v1/sessions'), answer.value, next);
    } catch (error) {
      thrown = error;
    }

    expect(next).not.toHaveBeenCalled();
    expect(answer.headers.get('Retry-After')).toBe('42');
    expect(thrown).toBeInstanceOf(HttpException);
    expect((thrown as HttpException).getStatus()).toBe(429);
    expect((thrown as HttpException).getResponse()).toMatchObject({
      code: 'rate_limit_exceeded',
    });
  });

  it.each([
    '/health/live',
    '/health/ready',
    '/api/v1/email-delivery-events',
    '/api/v1/email-delivery-events?attempt=2',
  ])('never limits %s', (path) => {
    const admit = jest.fn(() => 42);
    const next = jest.fn();
    const middleware = createRequestRateLimitMiddleware({ admit });

    middleware(request(path), response().value, next);

    expect(admit).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith();
  });
});

// Owner (review of the walkthrough PR): the public code lookups name a
// code's holder without a credential, so one address may ask for codes only
// a few times a minute; everything else keeps the general limit.
describe('the code lookups rate limit', () => {
  const limited = (_path: string) =>
    createRequestRateLimitMiddleware(createRequestRateLimiter(() => 0));

  it.each(['/api/v1/referral-codes/lookup?code=LUCIA', '/client/invite/LUCIA'])(
    'turns an address away after its lookups for the minute (%s)',
    (path) => {
      const middleware = limited(path);
      const next = jest.fn();
      for (let index = 0; index < codeLookupsPerAddressPerMinute; index += 1) {
        middleware(request(path), response().value, next);
      }
      expect(next).toHaveBeenCalledTimes(codeLookupsPerAddressPerMinute);

      const refused = response();
      expect(() => middleware(request(path), refused.value, next)).toThrow(
        HttpException,
      );
      expect(refused.headers.get('Retry-After')).toBe('60');
      // Other routes from that address are not held back.
      middleware(request('/api/v1/plans'), response().value, next);
      expect(next).toHaveBeenCalledTimes(codeLookupsPerAddressPerMinute + 1);
    },
  );
});
