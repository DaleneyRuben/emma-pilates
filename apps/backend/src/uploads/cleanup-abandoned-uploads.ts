export type AbandonedUpload = {
  id: string;
  pendingObjectKey: string;
};

export type CleanupAbandonedUploadsDependencies = {
  now(): Date;
  markDueForDeletion(now: Date): Promise<AbandonedUpload[]>;
  deleteObject(objectKey: string): Promise<void>;
  markDeleted(imageAssetId: string, deletedAt: Date): Promise<void>;
};

export const cleanupAbandonedUploads = async (
  dependencies: CleanupAbandonedUploadsDependencies,
): Promise<{ cleaned: number }> => {
  const now = dependencies.now();
  const due = await dependencies.markDueForDeletion(now);

  for (const upload of due) {
    await dependencies.deleteObject(upload.pendingObjectKey);
    await dependencies.markDeleted(upload.id, now);
  }

  return { cleaned: due.length };
};
