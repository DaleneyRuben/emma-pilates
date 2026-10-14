// The narrow storage port every image workflow uses (ADR-0026); the adapter
// is chosen per environment (ADR-0088).
export type ObjectStorage = {
  put(key: string, bytes: Buffer): Promise<void>;
  replace(key: string, bytes: Buffer): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
};

// Keys are server-generated and opaque; anything else never reaches a store.
export const assertStorageKey = (key: string): void => {
  if (!/^[a-z0-9][a-z0-9/_-]*$/.test(key)) {
    throw new Error('storage_key_invalid');
  }
};
