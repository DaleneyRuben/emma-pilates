import { processFinalizeUploadJob } from './process-finalize-upload-job';

const processingAsset = {
  id: 'asset-id',
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

describe('processFinalizeUploadJob', () => {
  it('verifies the stored bytes and records the result', async () => {
    const bytes = Buffer.from('bytes');
    const readObject = jest.fn().mockResolvedValue(bytes);
    const verifyBytes = jest.fn().mockResolvedValue(verified);
    const markVerified = jest.fn().mockResolvedValue(undefined);
    const markFailed = jest.fn().mockResolvedValue(undefined);

    await expect(
      processFinalizeUploadJob(
        { imageAssetId: processingAsset.id },
        {
          loadImageAsset: jest.fn().mockResolvedValue(processingAsset),
          readObject,
          verifyBytes,
          markVerified,
          markFailed,
        },
      ),
    ).resolves.toBe('verified');

    expect(readObject).toHaveBeenCalledWith('pending/transfer_receipt/asset-id');
    expect(verifyBytes).toHaveBeenCalledWith(
      bytes,
      {
        mediaType: 'image/jpeg',
        byteSize: 1_000,
        checksum: processingAsset.declaredChecksum,
      },
      'transfer_receipt',
    );
    expect(markVerified).toHaveBeenCalledWith({
      imageAssetId: 'asset-id',
      verified,
    });
    expect(markFailed).not.toHaveBeenCalled();
  });

  it('marks the upload failed when the stored object cannot be read', async () => {
    const markFailed = jest.fn().mockResolvedValue(undefined);
    const verifyBytes = jest.fn();

    await expect(
      processFinalizeUploadJob(
        { imageAssetId: processingAsset.id },
        {
          loadImageAsset: jest.fn().mockResolvedValue(processingAsset),
          readObject: jest.fn().mockRejectedValue(new Error('not found')),
          verifyBytes,
          markVerified: jest.fn(),
          markFailed,
        },
      ),
    ).resolves.toBe('failed');

    expect(markFailed).toHaveBeenCalledWith({
      imageAssetId: 'asset-id',
      failureCode: 'image_object_missing',
    });
    expect(verifyBytes).not.toHaveBeenCalled();
  });

  it('marks the upload failed with the verification error code when bytes do not match', async () => {
    const markFailed = jest.fn().mockResolvedValue(undefined);
    const markVerified = jest.fn();

    await expect(
      processFinalizeUploadJob(
        { imageAssetId: processingAsset.id },
        {
          loadImageAsset: jest.fn().mockResolvedValue(processingAsset),
          readObject: jest.fn().mockResolvedValue(Buffer.from('bytes')),
          verifyBytes: jest
            .fn()
            .mockRejectedValue(new Error('image_checksum_mismatch')),
          markVerified,
          markFailed,
        },
      ),
    ).resolves.toBe('failed');

    expect(markFailed).toHaveBeenCalledWith({
      imageAssetId: 'asset-id',
      failureCode: 'image_checksum_mismatch',
    });
    expect(markVerified).not.toHaveBeenCalled();
  });

  it('is a stale no-op when the upload no longer exists', async () => {
    const readObject = jest.fn();
    const markFailed = jest.fn();
    const markVerified = jest.fn();

    await expect(
      processFinalizeUploadJob(
        { imageAssetId: 'missing-id' },
        {
          loadImageAsset: jest.fn().mockResolvedValue(null),
          readObject,
          verifyBytes: jest.fn(),
          markVerified,
          markFailed,
        },
      ),
    ).resolves.toBe('stale');

    expect(readObject).not.toHaveBeenCalled();
    expect(markVerified).not.toHaveBeenCalled();
    expect(markFailed).not.toHaveBeenCalled();
  });

  it('is a stale no-op when the upload already reached a terminal state', async () => {
    const readObject = jest.fn();

    await expect(
      processFinalizeUploadJob(
        { imageAssetId: processingAsset.id },
        {
          loadImageAsset: jest
            .fn()
            .mockResolvedValue({ ...processingAsset, state: 'ready' }),
          readObject,
          verifyBytes: jest.fn(),
          markVerified: jest.fn(),
          markFailed: jest.fn(),
        },
      ),
    ).resolves.toBe('stale');

    expect(readObject).not.toHaveBeenCalled();
  });
});
