import { cleanupAbandonedUploads } from './cleanup-abandoned-uploads';

const now = new Date('2026-09-18T00:00:00.000Z');

describe('cleanupAbandonedUploads', () => {
  it('deletes each due upload with every variant object and marks it deleted using one clock reading', async () => {
    const due = [
      {
        id: 'asset-1',
        pendingObjectKey: 'pending/profile_photo/asset-1',
        variantObjectKeys: [
          'private/profile_photo/asset-1/display',
          'private/profile_photo/asset-1/thumbnail',
        ],
      },
      {
        id: 'asset-2',
        pendingObjectKey: 'pending/promotion/asset-2',
        variantObjectKeys: [],
      },
    ];
    const markDueForDeletion = jest.fn().mockResolvedValue(due);
    const deleteObject = jest
      .fn<Promise<void>, [string]>()
      .mockResolvedValue(undefined);
    const markDeleted = jest.fn().mockResolvedValue(undefined);
    const markVariantsDeleted = jest.fn().mockResolvedValue(undefined);

    await expect(
      cleanupAbandonedUploads({
        now: () => now,
        markDueForDeletion,
        listDetachedVariants: jest.fn().mockResolvedValue([]),
        deleteObject,
        markDeleted,
        markVariantsDeleted,
      }),
    ).resolves.toEqual({ cleaned: 2, variantsCleaned: 0 });

    expect(markDueForDeletion).toHaveBeenCalledWith(now);
    expect(deleteObject.mock.calls.map(([key]) => key)).toEqual([
      'pending/profile_photo/asset-1',
      'private/profile_photo/asset-1/display',
      'private/profile_photo/asset-1/thumbnail',
      'pending/promotion/asset-2',
    ]);
    expect(markDeleted).toHaveBeenNthCalledWith(1, 'asset-1', now);
    expect(markDeleted).toHaveBeenNthCalledWith(2, 'asset-2', now);
  });

  // ADR-0076 and ADR-0077: unpublished or replaced variants go on their own,
  // while the asset and its other variants stay.
  it('deletes variants whose deletion was requested without touching their asset', async () => {
    const deleteObject = jest
      .fn<Promise<void>, [string]>()
      .mockResolvedValue(undefined);
    const markDeleted = jest.fn();
    const markVariantsDeleted = jest.fn().mockResolvedValue(undefined);

    await expect(
      cleanupAbandonedUploads({
        now: () => now,
        markDueForDeletion: jest.fn().mockResolvedValue([]),
        listDetachedVariants: jest.fn().mockResolvedValue([
          {
            id: 'variant-1',
            storageKey: 'public/promotion/asset-3/promotion_480-v1',
          },
          {
            id: 'variant-2',
            storageKey: 'public/promotion/asset-3/promotion_960-v1',
          },
        ]),
        deleteObject,
        markDeleted,
        markVariantsDeleted,
      }),
    ).resolves.toEqual({ cleaned: 0, variantsCleaned: 2 });

    expect(deleteObject.mock.calls.map(([key]) => key)).toEqual([
      'public/promotion/asset-3/promotion_480-v1',
      'public/promotion/asset-3/promotion_960-v1',
    ]);
    expect(markVariantsDeleted).toHaveBeenCalledWith(
      ['variant-1', 'variant-2'],
      now,
    );
    expect(markDeleted).not.toHaveBeenCalled();
  });

  it('does nothing when no uploads are due', async () => {
    const deleteObject = jest.fn();
    const markDeleted = jest.fn();
    const markVariantsDeleted = jest.fn();

    await expect(
      cleanupAbandonedUploads({
        now: () => now,
        markDueForDeletion: jest.fn().mockResolvedValue([]),
        listDetachedVariants: jest.fn().mockResolvedValue([]),
        deleteObject,
        markDeleted,
        markVariantsDeleted,
      }),
    ).resolves.toEqual({ cleaned: 0, variantsCleaned: 0 });

    expect(deleteObject).not.toHaveBeenCalled();
    expect(markDeleted).not.toHaveBeenCalled();
    expect(markVariantsDeleted).not.toHaveBeenCalled();
  });
});
