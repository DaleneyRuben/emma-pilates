import { FINALIZE_UPLOAD_QUEUE } from './finalize-upload-job';
import {
  registerFinalizeUploadWorker,
  type FinalizeUploadWorkerBoss,
  type FinalizeUploadWorkerHandler,
} from './finalize-upload-worker';

const payload = {
  version: 1,
  imageAssetId: '0ae2701e-f8ac-4c8a-8cf0-65182ee0fc1d',
} as const;

const register = async (
  process: jest.Mock<Promise<'verified' | 'failed' | 'stale'>, [unknown]>,
): Promise<FinalizeUploadWorkerHandler> => {
  let handler: FinalizeUploadWorkerHandler | undefined;
  const work = jest.fn<
    Promise<string>,
    Parameters<FinalizeUploadWorkerBoss['work']>
  >((_name, _options, registeredHandler) => {
    handler = registeredHandler;
    return Promise.resolve('worker-id');
  });
  const boss: FinalizeUploadWorkerBoss = { work };

  await registerFinalizeUploadWorker(boss, { process });

  expect(work).toHaveBeenCalledWith(
    FINALIZE_UPLOAD_QUEUE,
    { perJobResults: true },
    expect.any(Function),
  );

  if (handler === undefined) {
    throw new Error('Worker handler was not registered');
  }

  return handler;
};

describe('finalize upload worker', () => {
  it('completes verified jobs', async () => {
    const process = jest.fn().mockResolvedValue('verified');
    const handler = await register(process);

    await expect(handler([{ id: 'job-1', data: payload }])).resolves.toEqual([
      { id: 'job-1', status: 'completed', output: { outcome: 'verified' } },
    ]);
    expect(process).toHaveBeenCalledWith(payload);
  });

  it('completes stale jobs without retrying them', async () => {
    const process = jest.fn().mockResolvedValue('stale');
    const handler = await register(process);

    await expect(handler([{ id: 'job-2', data: payload }])).resolves.toEqual([
      { id: 'job-2', status: 'completed', output: { outcome: 'stale' } },
    ]);
  });

  it('completes business verification failures without retrying them', async () => {
    const process = jest.fn().mockResolvedValue('failed');
    const handler = await register(process);

    await expect(handler([{ id: 'job-3', data: payload }])).resolves.toEqual([
      { id: 'job-3', status: 'completed', output: { outcome: 'failed' } },
    ]);
  });

  it('fails jobs that throw unexpectedly for pg-boss to retry', async () => {
    const process = jest
      .fn()
      .mockRejectedValue(new Error('database unreachable'));
    const handler = await register(process);

    await expect(handler([{ id: 'job-4', data: payload }])).resolves.toEqual([
      {
        id: 'job-4',
        status: 'failed',
        output: { failureCategory: 'unexpected' },
      },
    ]);
  });

  it('dead-letters invalid payloads without exposing their contents', async () => {
    const process = jest.fn().mockResolvedValue('verified');
    const handler = await register(process);

    await expect(
      handler([
        { id: 'job-5', data: { ...payload, pendingObjectKey: 'secret/key' } },
      ]),
    ).resolves.toEqual([
      {
        id: 'job-5',
        status: 'deadletter',
        output: { failureCategory: 'invalid_payload' },
      },
    ]);
    expect(process).not.toHaveBeenCalled();
  });
});
