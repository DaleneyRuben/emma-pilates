export type AbandonedUpload = {
  id: string;
  pendingObjectKey: string;
  variantObjectKeys: string[];
};

export type DetachedVariant = { id: string; storageKey: string };

export type CleanupAbandonedUploadsDependencies = {
  now(): Date;
  markDueForDeletion(now: Date): Promise<AbandonedUpload[]>;
  // Variants whose deletion was requested while their asset stays: replaced
  // or unpublished copies (ADR-0076, ADR-0077).
  listDetachedVariants(): Promise<DetachedVariant[]>;
  deleteObject(objectKey: string): Promise<void>;
  markDeleted(imageAssetId: string, deletedAt: Date): Promise<void>;
  markVariantsDeleted(variantIds: string[], deletedAt: Date): Promise<void>;
};

export const cleanupAbandonedUploads = async (
  dependencies: CleanupAbandonedUploadsDependencies,
): Promise<{ cleaned: number; variantsCleaned: number }> => {
  const now = dependencies.now();
  const due = await dependencies.markDueForDeletion(now);

  for (const upload of due) {
    await dependencies.deleteObject(upload.pendingObjectKey);
    for (const key of upload.variantObjectKeys) {
      await dependencies.deleteObject(key);
    }
    await dependencies.markDeleted(upload.id, now);
  }

  const detached = await dependencies.listDetachedVariants();
  for (const variant of detached) {
    await dependencies.deleteObject(variant.storageKey);
  }
  if (detached.length > 0) {
    await dependencies.markVariantsDeleted(
      detached.map((variant) => variant.id),
      now,
    );
  }

  return { cleaned: due.length, variantsCleaned: detached.length };
};
