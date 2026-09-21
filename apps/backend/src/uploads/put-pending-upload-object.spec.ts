import { UploadAccessDeniedError } from './finalize-upload';
import { putPendingUploadObject } from './put-pending-upload-object';

const pendingTarget = {
  ownerAccountId: 'owner-id',
  pendingObjectKey: 'pending/transfer_receipt/asset-id',
  state: 'pending' as const,
};

describe('putPendingUploadObject', () => {
  it('writes the declared bytes to the pending object key', async () => {
    const bytes = Buffer.from('bytes');
    const writeObject = jest.fn().mockResolvedValue(undefined);

    await putPendingUploadObject(
      { imageAssetId: 'asset-id', bytes },
      {
        ownerAccountId: 'owner-id',
        loadPendingObjectKey: jest.fn().mockResolvedValue(pendingTarget),
        writeObject,
      },
    );

    expect(writeObject).toHaveBeenCalledWith(
      'pending/transfer_receipt/asset-id',
      bytes,
    );
  });

  it('denies writing an object owned by a different Account', async () => {
    await expect(
      putPendingUploadObject(
        { imageAssetId: 'asset-id', bytes: Buffer.from('bytes') },
        {
          ownerAccountId: 'someone-else',
          loadPendingObjectKey: jest.fn().mockResolvedValue(pendingTarget),
          writeObject: jest.fn(),
        },
      ),
    ).rejects.toThrow(UploadAccessDeniedError);
  });

  it('denies writing an object that does not exist', async () => {
    await expect(
      putPendingUploadObject(
        { imageAssetId: 'missing-id', bytes: Buffer.from('bytes') },
        {
          ownerAccountId: 'owner-id',
          loadPendingObjectKey: jest.fn().mockResolvedValue(null),
          writeObject: jest.fn(),
        },
      ),
    ).rejects.toThrow(UploadAccessDeniedError);
  });

  it('rejects writing to an upload that is no longer pending', async () => {
    const writeObject = jest.fn();

    await expect(
      putPendingUploadObject(
        { imageAssetId: 'asset-id', bytes: Buffer.from('bytes') },
        {
          ownerAccountId: 'owner-id',
          loadPendingObjectKey: jest
            .fn()
            .mockResolvedValue({ ...pendingTarget, state: 'processing' }),
          writeObject,
        },
      ),
    ).rejects.toThrow('Upload is not writable');

    expect(writeObject).not.toHaveBeenCalled();
  });
});
