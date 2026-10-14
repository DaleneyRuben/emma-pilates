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

type ProcessOutcome = Promise<'verified' | 'failed' | 'stale'>;
type ProcessMock = jest.Mock<ProcessOutcome, [unknown]>;
const processMock = (): ProcessMock => jest.fn<ProcessOutcome, [unknown]>();

const register = async (
  process: ProcessMock,
  reportError: jest.Mock = jest.fn(),
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

  await registerFinalizeUploadWorker(boss, { process, reportError });

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
    const process = processMock().mockResolvedValue('verified');
    const handler = await register(process);

    await expect(handler([{ id: 'job-1', data: payload }])).resolves.toEqual([
      { id: 'job-1', status: 'completed', output: { outcome: 'verified' } },
    ]);
    expect(process).toHaveBeenCalledWith(payload);
  });

  it('completes stale jobs without retrying them', async () => {
    const process = processMock().mockResolvedValue('stale');
    const handler = await register(process);

    await expect(handler([{ id: 'job-2', data: payload }])).resolves.toEqual([
      { id: 'job-2', status: 'completed', output: { outcome: 'stale' } },
    ]);
  });

  it('completes business verification failures without retrying them', async () => {
    const process = processMock().mockResolvedValue('failed');
    const handler = await register(process);

    await expect(handler([{ id: 'job-3', data: payload }])).resolves.toEqual([
      { id: 'job-3', status: 'completed', output: { outcome: 'failed' } },
    ]);
  });

  it('fails jobs that throw unexpectedly for pg-boss to retry', async () => {
    const process = processMock().mockRejectedValue(
      new Error('database unreachable'),
    );
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
    const process = processMock().mockResolvedValue('verified');
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

  // EXT-011: a failed record holds only its category, so the error itself
  // goes to error reporting, tagged with the queue.
  it('reports an unexpected failure with the queue as its job', async () => {
    const failure = new Error('database unreachable');
    const reportError = jest.fn();
    const handler = await register(
      processMock().mockRejectedValue(failure),
      reportError,
    );

    await handler([{ id: 'job-6', data: payload }]);

    expect(reportError).toHaveBeenCalledWith(failure, {
      job: FINALIZE_UPLOAD_QUEUE,
    });
  });

  it('reports a dead-lettered payload with the queue as its job', async () => {
    const reportError = jest.fn();
    const handler = await register(processMock(), reportError);

    await handler([{ id: 'job-7', data: { version: 2 } }]);

    expect(reportError).toHaveBeenCalledWith(expect.any(Error), {
      job: FINALIZE_UPLOAD_QUEUE,
    });
  });

  it('reports nothing for an outcome the upload already decided', async () => {
    const reportError = jest.fn();
    const handler = await register(
      processMock().mockResolvedValue('failed'),
      reportError,
    );

    await handler([{ id: 'job-8', data: payload }]);

    expect(reportError).not.toHaveBeenCalled();
  });
});
