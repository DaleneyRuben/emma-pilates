import { finalizeUpload, UploadAccessDeniedError } from './finalize-upload';

const pendingAsset = {
  id: 'asset-id',
  ownerAccountId: 'owner-id',
  purpose: 'transfer_receipt' as const,
  state: 'pending' as const,
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

describe('finalizeUpload', () => {
  it('moves a pending upload to processing, verifies its bytes, and records the result', async () => {
    const bytes = Buffer.from('bytes');
    const beginProcessing = jest.fn().mockResolvedValue(undefined);
    const readObject = jest.fn().mockResolvedValue(bytes);
    const verifyBytes = jest.fn().mockResolvedValue(verified);
    const markVerified = jest.fn().mockResolvedValue(undefined);
    const markFailed = jest.fn().mockResolvedValue(undefined);

    await finalizeUpload(
      { imageAssetId: pendingAsset.id },
      {
        ownerAccountId: 'owner-id',
        loadImageAsset: jest.fn().mockResolvedValue(pendingAsset),
        beginProcessing,
        readObject,
        verifyBytes,
        markVerified,
        markFailed,
      },
    );

    expect(beginProcessing).toHaveBeenCalledWith('asset-id');
    expect(readObject).toHaveBeenCalledWith('pending/transfer_receipt/asset-id');
    expect(verifyBytes).toHaveBeenCalledWith(
      bytes,
      {
        mediaType: 'image/jpeg',
        byteSize: 1_000,
        checksum: pendingAsset.declaredChecksum,
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

    await finalizeUpload(
      { imageAssetId: pendingAsset.id },
      {
        ownerAccountId: 'owner-id',
        loadImageAsset: jest.fn().mockResolvedValue(pendingAsset),
        beginProcessing: jest.fn().mockResolvedValue(undefined),
        readObject: jest.fn().mockRejectedValue(new Error('not found')),
        verifyBytes,
        markVerified: jest.fn(),
        markFailed,
      },
    );

    expect(markFailed).toHaveBeenCalledWith({
      imageAssetId: 'asset-id',
      failureCode: 'image_object_missing',
    });
    expect(verifyBytes).not.toHaveBeenCalled();
  });

  it('marks the upload failed with the verification error code when bytes do not match', async () => {
    const markFailed = jest.fn().mockResolvedValue(undefined);
    const markVerified = jest.fn();

    await finalizeUpload(
      { imageAssetId: pendingAsset.id },
      {
        ownerAccountId: 'owner-id',
        loadImageAsset: jest.fn().mockResolvedValue(pendingAsset),
        beginProcessing: jest.fn().mockResolvedValue(undefined),
        readObject: jest.fn().mockResolvedValue(Buffer.from('bytes')),
        verifyBytes: jest.fn().mockRejectedValue(new Error('image_checksum_mismatch')),
        markVerified,
        markFailed,
      },
    );

    expect(markFailed).toHaveBeenCalledWith({
      imageAssetId: 'asset-id',
      failureCode: 'image_checksum_mismatch',
    });
    expect(markVerified).not.toHaveBeenCalled();
  });

  it('is idempotent while the upload is already processing', async () => {
    const beginProcessing = jest.fn();
    const readObject = jest.fn();
    const verifyBytes = jest.fn();
    const markVerified = jest.fn();
    const markFailed = jest.fn();

    await finalizeUpload(
      { imageAssetId: pendingAsset.id },
      {
        ownerAccountId: 'owner-id',
        loadImageAsset: jest
          .fn()
          .mockResolvedValue({ ...pendingAsset, state: 'processing' }),
        beginProcessing,
        readObject,
        verifyBytes,
        markVerified,
        markFailed,
      },
    );

    expect(beginProcessing).not.toHaveBeenCalled();
    expect(readObject).not.toHaveBeenCalled();
    expect(verifyBytes).not.toHaveBeenCalled();
    expect(markVerified).not.toHaveBeenCalled();
    expect(markFailed).not.toHaveBeenCalled();
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
          readObject: jest.fn(),
          verifyBytes: jest.fn(),
          markVerified: jest.fn(),
          markFailed: jest.fn(),
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
          readObject: jest.fn(),
          verifyBytes: jest.fn(),
          markVerified: jest.fn(),
          markFailed: jest.fn(),
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
          readObject: jest.fn(),
          verifyBytes: jest.fn(),
          markVerified: jest.fn(),
          markFailed: jest.fn(),
        },
      ),
    ).rejects.toThrow(UploadAccessDeniedError);
  });
});
