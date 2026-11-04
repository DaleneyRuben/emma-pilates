type StorageFailure = {
  message?: unknown;
  name?: unknown;
  code?: unknown;
  $metadata?: { httpStatusCode?: unknown };
};

// Whether a storage read failed because the object is not there, as opposed
// to the store being unreachable or refusing the call. Callers that fall back
// on a missing object must let every other failure propagate. Node's file
// errors can come from another realm, so this reads fields, not `instanceof`.
export const isStorageObjectMissing = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) return false;
  const failure = error as StorageFailure;
  return (
    failure.message === 'storage_object_missing' ||
    failure.code === 'ENOENT' ||
    failure.name === 'NoSuchKey' ||
    failure.$metadata?.httpStatusCode === 404
  );
};
