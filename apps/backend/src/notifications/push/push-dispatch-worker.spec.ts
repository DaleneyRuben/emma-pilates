import { PUSH_DISPATCH_QUEUE } from '../../jobs/push-dispatch/push-dispatch-job';
import { PermanentPushError, TransientPushError } from './push-provider';
import {
  registerPushDispatchWorker,
  type PushDispatchWorkerBoss,
  type PushDispatchWorkerHandler,
} from './push-dispatch-worker';

const payload = {
  version: 1,
  accountId: '0ae2701e-f8ac-4c8a-8cf0-65182ee0fc1d',
  businessEventKey: 'waitlist-promoted:entry-1',
} as const;

const register = async (
  dispatch: jest.Mock,
  reportError: jest.Mock = jest.fn(),
): Promise<PushDispatchWorkerHandler> => {
  let handler: PushDispatchWorkerHandler | undefined;
  const work = jest.fn(
    (
      _name: string,
      _options: unknown,
      registered: PushDispatchWorkerHandler,
    ) => {
      handler = registered;
      return Promise.resolve('worker-id');
    },
  );
  const boss: PushDispatchWorkerBoss = { work };

  await registerPushDispatchWorker(boss, { dispatch, reportError });

  expect(work).toHaveBeenCalledWith(
    PUSH_DISPATCH_QUEUE,
    { perJobResults: true },
    expect.any(Function),
  );
  if (handler === undefined) throw new Error('No handler registered');
  return handler;
};

describe('push dispatch worker', () => {
  it('completes a dispatched job with its outcome', async () => {
    const dispatch = jest
      .fn()
      .mockResolvedValue({ outcome: 'sent', submitted: 2, failed: 0 });
    const handler = await register(dispatch);

    await expect(handler([{ id: 'job-1', data: payload }])).resolves.toEqual([
      {
        id: 'job-1',
        status: 'completed',
        output: { outcome: 'sent', submitted: 2, failed: 0 },
      },
    ]);
    expect(dispatch).toHaveBeenCalledWith(payload);
  });

  it('dead-letters an invalid payload without dispatching', async () => {
    const dispatch = jest.fn();
    const reportError = jest.fn();
    const handler = await register(dispatch, reportError);

    await expect(
      handler([{ id: 'job-1', data: { ...payload, version: 2 } }]),
    ).resolves.toEqual([
      {
        id: 'job-1',
        status: 'deadletter',
        output: { failureCategory: 'invalid_payload' },
      },
    ]);
    expect(dispatch).not.toHaveBeenCalled();
    expect(reportError).toHaveBeenCalled();
  });

  it('fails a transient failure so pg-boss retries it, without an alert', async () => {
    const reportError = jest.fn();
    const handler = await register(
      jest.fn().mockRejectedValue(new TransientPushError('rate_limited', 60)),
      reportError,
    );

    await expect(handler([{ id: 'job-1', data: payload }])).resolves.toEqual([
      {
        id: 'job-1',
        status: 'failed',
        output: { failureCategory: 'rate_limited' },
      },
    ]);
    expect(reportError).not.toHaveBeenCalled();
  });

  it('dead-letters and reports a permanent failure', async () => {
    const reportError = jest.fn();
    const failure = new PermanentPushError('provider_authentication');
    const handler = await register(
      jest.fn().mockRejectedValue(failure),
      reportError,
    );

    await expect(handler([{ id: 'job-1', data: payload }])).resolves.toEqual([
      {
        id: 'job-1',
        status: 'deadletter',
        output: { failureCategory: 'provider_authentication' },
      },
    ]);
    expect(reportError).toHaveBeenCalledWith(failure, {
      job: PUSH_DISPATCH_QUEUE,
    });
  });

  it('retries and reports an unexpected failure', async () => {
    const reportError = jest.fn();
    const handler = await register(
      jest.fn().mockRejectedValue(new Error('database gone')),
      reportError,
    );

    await expect(handler([{ id: 'job-1', data: payload }])).resolves.toEqual([
      {
        id: 'job-1',
        status: 'failed',
        output: { failureCategory: 'unexpected' },
      },
    ]);
    expect(reportError).toHaveBeenCalled();
  });
});
