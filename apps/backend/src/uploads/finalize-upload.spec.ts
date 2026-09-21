import { finalizeUpload, UploadAccessDeniedError } from './finalize-upload';

const pendingAsset = {
  id: 'asset-id',
  ownerAccountId: 'owner-id',
  state: 'pending' as const,
};

describe('finalizeUpload', () => {
  it('moves a pending upload to processing and enqueues its verification', async () => {
    const beginProcessing = jest.fn().mockResolvedValue(undefined);
    const enqueueFinalization = jest.fn().mockResolvedValue(undefined);

    await finalizeUpload(
      { imageAssetId: pendingAsset.id },
      {
        ownerAccountId: 'owner-id',
        loadImageAsset: jest.fn().mockResolvedValue(pendingAsset),
        beginProcessing,
        enqueueFinalization,
      },
    );

    expect(beginProcessing).toHaveBeenCalledWith('asset-id');
    expect(enqueueFinalization).toHaveBeenCalledWith('asset-id');
  });

  it('is idempotent while the upload is already processing', async () => {
    const beginProcessing = jest.fn();
    const enqueueFinalization = jest.fn();

    await finalizeUpload(
      { imageAssetId: pendingAsset.id },
      {
        ownerAccountId: 'owner-id',
        loadImageAsset: jest
          .fn()
          .mockResolvedValue({ ...pendingAsset, state: 'processing' }),
        beginProcessing,
        enqueueFinalization,
      },
    );

    expect(beginProcessing).not.toHaveBeenCalled();
    expect(enqueueFinalization).not.toHaveBeenCalled();
  });

  it('rejects finalizing an upload that is not pending or processing', async () => {
    await expect(
      finalizeUpload(
        { imageAssetId: pendingAsset.id },
        {
          ownerAccountId: 'owner-id',
          loadImageAsset: jest
            .fn()
            .mockResolvedValue({ ...pendingAsset, state: 'ready' }),
          beginProcessing: jest.fn(),
          enqueueFinalization: jest.fn(),
        },
      ),
    ).rejects.toThrow('Upload is not finalizable');
  });

  it('denies finalizing an upload owned by a different Account', async () => {
    await expect(
      finalizeUpload(
        { imageAssetId: pendingAsset.id },
        {
          ownerAccountId: 'someone-else',
          loadImageAsset: jest.fn().mockResolvedValue(pendingAsset),
          beginProcessing: jest.fn(),
          enqueueFinalization: jest.fn(),
        },
      ),
    ).rejects.toThrow(UploadAccessDeniedError);
  });

  it('denies finalizing an upload that does not exist', async () => {
    await expect(
      finalizeUpload(
        { imageAssetId: 'missing-id' },
        {
          ownerAccountId: 'owner-id',
          loadImageAsset: jest.fn().mockResolvedValue(null),
          beginProcessing: jest.fn(),
          enqueueFinalization: jest.fn(),
        },
      ),
    ).rejects.toThrow(UploadAccessDeniedError);
  });
});
