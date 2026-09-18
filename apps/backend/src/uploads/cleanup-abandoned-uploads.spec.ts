import { cleanupAbandonedUploads } from './cleanup-abandoned-uploads';

describe('cleanupAbandonedUploads', () => {
  it('deletes each due upload object and marks it deleted using one clock reading', async () => {
    const now = new Date('2026-09-18T00:00:00.000Z');
    const due = [
      { id: 'asset-1', pendingObjectKey: 'pending/profile_photo/asset-1' },
      { id: 'asset-2', pendingObjectKey: 'pending/promotion/asset-2' },
    ];
    const markDueForDeletion = jest.fn().mockResolvedValue(due);
    const deleteObject = jest.fn().mockResolvedValue(undefined);
    const markDeleted = jest.fn().mockResolvedValue(undefined);

    await expect(
      cleanupAbandonedUploads({
        now: () => now,
        markDueForDeletion,
        deleteObject,
        markDeleted,
      }),
    ).resolves.toEqual({ cleaned: 2 });

    expect(markDueForDeletion).toHaveBeenCalledWith(now);
    expect(deleteObject).toHaveBeenNthCalledWith(
      1,
      'pending/profile_photo/asset-1',
    );
    expect(deleteObject).toHaveBeenNthCalledWith(
      2,
      'pending/promotion/asset-2',
    );
    expect(markDeleted).toHaveBeenNthCalledWith(1, 'asset-1', now);
    expect(markDeleted).toHaveBeenNthCalledWith(2, 'asset-2', now);
  });

  it('does nothing when no uploads are due', async () => {
    const now = new Date('2026-09-18T00:00:00.000Z');
    const deleteObject = jest.fn();
    const markDeleted = jest.fn();

    await expect(
      cleanupAbandonedUploads({
        now: () => now,
        markDueForDeletion: jest.fn().mockResolvedValue([]),
        deleteObject,
        markDeleted,
      }),
    ).resolves.toEqual({ cleaned: 0 });

    expect(deleteObject).not.toHaveBeenCalled();
    expect(markDeleted).not.toHaveBeenCalled();
  });
});
