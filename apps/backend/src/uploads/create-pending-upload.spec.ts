import { createPendingUpload } from './create-pending-upload';

describe('createPendingUpload', () => {
  it('validates the declaration, then records a pending upload with a 15-minute URL and a 3-day cleanup deadline (ADR-0089)', async () => {
    const save = jest.fn().mockResolvedValue({ id: 'asset-id' });

    await expect(
      createPendingUpload(
        {
          ownerAccountId: 'account-id',
          purpose: 'transfer_receipt',
          mediaType: 'image/jpeg',
          byteSize: 1_000,
          checksum: new Uint8Array(32),
        },
        {
          now: () => new Date('2026-09-18T12:00:00Z'),
          generateObjectKey: () => 'pending/transfer_receipt/object-key',
          save,
        },
      ),
    ).resolves.toEqual({
      id: 'asset-id',
      pendingObjectKey: 'pending/transfer_receipt/object-key',
      expiresAt: new Date('2026-09-18T12:15:00Z'),
    });

    expect(save).toHaveBeenCalledWith({
      ownerAccountId: 'account-id',
      purpose: 'transfer_receipt',
      pendingObjectKey: 'pending/transfer_receipt/object-key',
      declaredMediaType: 'image/jpeg',
      declaredByteSize: 1_000,
      declaredChecksum: new Uint8Array(32),
      createdAt: new Date('2026-09-18T12:00:00Z'),
      expiresAt: new Date('2026-09-18T12:15:00Z'),
      deletionDueAt: new Date('2026-09-21T12:00:00Z'),
    });
  });

  it('rejects an invalid declaration before recording anything', async () => {
    const save = jest.fn();

    await expect(
      createPendingUpload(
        {
          ownerAccountId: 'account-id',
          purpose: 'profile_photo',
          mediaType: 'image/jpeg',
          byteSize: 5 * 1024 * 1024 + 1,
          checksum: new Uint8Array(32),
        },
        {
          now: () => new Date('2026-09-18T12:00:00Z'),
          generateObjectKey: () => 'pending/profile_photo/object-key',
          save,
        },
      ),
    ).rejects.toThrow('image_too_large');

    expect(save).not.toHaveBeenCalled();
  });
});
