// Whether a storage read failed because the object is not there, as opposed
// to the store being unreachable or refusing the call. Callers that fall back
// on a missing object must let every other failure propagate.
export const isStorageObjectMissing = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  if (error.message === 'storage_object_missing') return true;
  const details = error as Error & {
    code?: unknown;
    $metadata?: { httpStatusCode?: unknown };
  };
  return (
    details.code === 'ENOENT' ||
    error.name === 'NoSuchKey' ||
    details.$metadata?.httpStatusCode === 404
  );
};
