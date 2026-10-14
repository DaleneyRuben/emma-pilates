import {
  PUSH_DISPATCH_FAILED_QUEUE,
  PUSH_DISPATCH_QUEUE,
  parsePushDispatchJob,
  pushDispatchFailedQueueOptions,
  pushDispatchQueueOptions,
} from './push-dispatch-job';

describe('push dispatch job contract', () => {
  const payload = {
    version: 1,
    accountId: '63b83bb4-65b8-4e24-bbb3-b42c59d1e261',
    businessEventKey: 'waitlist_promoted:5d0e0b8c',
  } as const;

  it('accepts the minimal versioned payload', () => {
    expect(parsePushDispatchJob(payload)).toEqual(payload);
  });

  it('rejects unexpected fields', () => {
    expect(() =>
      parsePushDispatchJob({ ...payload, title: 'Clase cancelada' }),
    ).toThrow();
  });

  it('rejects an empty business event key', () => {
    expect(() =>
      parsePushDispatchJob({ ...payload, businessEventKey: '' }),
    ).toThrow();
  });

  it('uses the approved queues and the external-delivery retry preset', () => {
    expect(PUSH_DISPATCH_QUEUE).toBe('notifications.push-dispatch.v1');
    expect(PUSH_DISPATCH_FAILED_QUEUE).toBe(
      'notifications.push-dispatch.failed.v1',
    );
    expect(pushDispatchQueueOptions).toEqual({
      retryLimit: 5,
      retryDelay: 30,
      retryBackoff: true,
      retryDelayMax: 900,
      expireInSeconds: 60,
      retentionSeconds: 691_200,
      deleteAfterSeconds: 604_800,
      deadLetter: 'notifications.push-dispatch.failed.v1',
    });
  });

  it('keeps failed dispatches for thirty days without retrying them', () => {
    expect(pushDispatchFailedQueueOptions).toEqual({
      retryLimit: 0,
      retentionSeconds: 2_592_000,
      deleteAfterSeconds: 2_592_000,
    });
  });
});
