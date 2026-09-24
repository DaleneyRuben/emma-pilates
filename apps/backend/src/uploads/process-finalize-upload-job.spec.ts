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

const built = [
  {
    kind: 'readable' as const,
    mediaType: 'image/jpeg' as const,
    bytes: Buffer.from('readable'),
    byteSize: 8,
    width: 800,
    height: 600,
  },
  {
    kind: 'thumbnail' as const,
    mediaType: 'image/jpeg' as const,
    bytes: Buffer.from('thumb'),
    byteSize: 5,
    width: 400,
    height: 300,
  },
];

const rebuild = () => ({
  buildVariants: jest.fn().mockResolvedValue(built),
  storeVariant: jest.fn().mockResolvedValue(undefined),
  deleteObject: jest.fn().mockResolvedValue(undefined),
});

describe('processFinalizeUploadJob', () => {
  it('verifies the stored bytes, stores every variant privately, records them, and deletes the original', async () => {
    const bytes = Buffer.from('bytes');
    const readObject = jest.fn().mockResolvedValue(bytes);
    const verifyBytes = jest.fn().mockResolvedValue(verified);
    const markVerified = jest.fn().mockResolvedValue(undefined);
    const markFailed = jest.fn().mockResolvedValue(undefined);
    const { buildVariants, storeVariant, deleteObject } = rebuild();

    await expect(
      processFinalizeUploadJob(
        { imageAssetId: processingAsset.id },
        {
          loadImageAsset: jest.fn().mockResolvedValue(processingAsset),
          readObject,
          verifyBytes,
          buildVariants,
          storeVariant,
          markVerified,
          markFailed,
          deleteObject,
        },
      ),
    ).resolves.toBe('verified');

    expect(readObject).toHaveBeenCalledWith(
      'pending/transfer_receipt/asset-id',
    );
    expect(verifyBytes).toHaveBeenCalledWith(
      bytes,
      {
        mediaType: 'image/jpeg',
        byteSize: 1_000,
        checksum: processingAsset.declaredChecksum,
      },
      'transfer_receipt',
    );
    expect(buildVariants).toHaveBeenCalledWith(bytes, 'transfer_receipt');
    expect(storeVariant).toHaveBeenNthCalledWith(
      1,
      'private/transfer_receipt/asset-id/readable',
      built[0].bytes,
    );
    expect(storeVariant).toHaveBeenNthCalledWith(
      2,
      'private/transfer_receipt/asset-id/thumbnail',
      built[1].bytes,
    );
    expect(markVerified).toHaveBeenCalledWith({
      imageAssetId: 'asset-id',
      verified,
      variants: [
        {
          kind: 'readable',
          storageKey: 'private/transfer_receipt/asset-id/readable',
          mediaType: 'image/jpeg',
          byteSize: 8,
          width: 800,
          height: 600,
        },
        {
          kind: 'thumbnail',
          storageKey: 'private/transfer_receipt/asset-id/thumbnail',
          mediaType: 'image/jpeg',
          byteSize: 5,
          width: 400,
          height: 300,
        },
      ],
    });
    expect(deleteObject).toHaveBeenCalledWith(
      'pending/transfer_receipt/asset-id',
    );
    expect(markFailed).not.toHaveBeenCalled();
  });

  it('marks the upload failed with the rebuild error code and keeps the original when a variant cannot be built', async () => {
    const markFailed = jest.fn().mockResolvedValue(undefined);
    const markVerified = jest.fn();
    const { storeVariant, deleteObject } = rebuild();

    await expect(
      processFinalizeUploadJob(
        { imageAssetId: processingAsset.id },
        {
          loadImageAsset: jest
            .fn()
            .mockResolvedValue({ ...processingAsset, purpose: 'promotion' }),
          readObject: jest.fn().mockResolvedValue(Buffer.from('bytes')),
          verifyBytes: jest.fn().mockResolvedValue(verified),
          buildVariants: jest
            .fn()
            .mockRejectedValue(new Error('image_dimensions_too_small')),
          storeVariant,
          markVerified,
          markFailed,
          deleteObject,
        },
      ),
    ).resolves.toBe('failed');

    expect(markFailed).toHaveBeenCalledWith({
      imageAssetId: 'asset-id',
      failureCode: 'image_dimensions_too_small',
    });
    expect(storeVariant).not.toHaveBeenCalled();
    expect(markVerified).not.toHaveBeenCalled();
    expect(deleteObject).not.toHaveBeenCalled();
  });

  it('lets a storage failure propagate so the job is retried', async () => {
    const markFailed = jest.fn();
    const markVerified = jest.fn();
    const { buildVariants, deleteObject } = rebuild();

    await expect(
      processFinalizeUploadJob(
        { imageAssetId: processingAsset.id },
        {
          loadImageAsset: jest.fn().mockResolvedValue(processingAsset),
          readObject: jest.fn().mockResolvedValue(Buffer.from('bytes')),
          verifyBytes: jest.fn().mockResolvedValue(verified),
          buildVariants,
          storeVariant: jest.fn().mockRejectedValue(new Error('disk full')),
          markVerified,
          markFailed,
          deleteObject,
        },
      ),
    ).rejects.toThrow('disk full');

    expect(markFailed).not.toHaveBeenCalled();
    expect(markVerified).not.toHaveBeenCalled();
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
          ...rebuild(),
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
          ...rebuild(),
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
          ...rebuild(),
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
          ...rebuild(),
          markVerified: jest.fn(),
          markFailed: jest.fn(),
        },
      ),
    ).resolves.toBe('stale');

    expect(readObject).not.toHaveBeenCalled();
  });
});
