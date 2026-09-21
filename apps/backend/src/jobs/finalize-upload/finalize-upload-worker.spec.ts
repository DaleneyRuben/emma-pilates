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

const processingAsset = {
  id: payload.imageAssetId,
  purpose: 'transfer_receipt' as const,
  state: 'processing' as const,
  pendingObjectKey: 'pending/transfer_receipt/asset-id',
  declaredMediaType: 'image/jpeg',
  declaredByteSize: 1_000,
  declaredChecksum: new Uint8Array(32),
};

const verified = {
  mediaType: 'image/jpeg',
  byteSize: 1_000,
  checksum: new Uint8Array(32),
  width: 800,
  height: 600,
};

const dependencies = () => ({
  loadImageAsset: jest.fn().mockResolvedValue(processingAsset),
  readObject: jest.fn().mockResolvedValue(Buffer.from('bytes')),
  verifyBytes: jest.fn().mockResolvedValue(verified),
  markVerified: jest.fn().mockResolvedValue(undefined),
  markFailed: jest.fn().mockResolvedValue(undefined),
});

const register = async (
  workerDependencies: ReturnType<typeof dependencies>,
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

  await registerFinalizeUploadWorker(boss, workerDependencies);

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
    const handler = await register(dependencies());

    await expect(handler([{ id: 'job-1', data: payload }])).resolves.toEqual([
      { id: 'job-1', status: 'completed', output: { outcome: 'verified' } },
    ]);
  });

  it('completes stale jobs without retrying them', async () => {
    const workerDependencies = dependencies();
    workerDependencies.loadImageAsset.mockResolvedValue(null);
    const handler = await register(workerDependencies);

    await expect(handler([{ id: 'job-2', data: payload }])).resolves.toEqual([
      { id: 'job-2', status: 'completed', output: { outcome: 'stale' } },
    ]);
  });

  it('completes business verification failures without retrying them', async () => {
    const workerDependencies = dependencies();
    workerDependencies.verifyBytes.mockRejectedValue(
      new Error('image_checksum_mismatch'),
    );
    const handler = await register(workerDependencies);

    await expect(handler([{ id: 'job-3', data: payload }])).resolves.toEqual([
      { id: 'job-3', status: 'completed', output: { outcome: 'failed' } },
    ]);
  });

  it('fails jobs that throw unexpectedly for pg-boss to retry', async () => {
    const workerDependencies = dependencies();
    workerDependencies.loadImageAsset.mockRejectedValue(
      new Error('database unreachable'),
    );
    const handler = await register(workerDependencies);

    await expect(handler([{ id: 'job-4', data: payload }])).resolves.toEqual([
      {
        id: 'job-4',
        status: 'failed',
        output: { failureCategory: 'unexpected' },
      },
    ]);
  });

  it('dead-letters invalid payloads without exposing their contents', async () => {
    const handler = await register(dependencies());

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
  });
});
