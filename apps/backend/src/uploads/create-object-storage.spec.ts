import { S3Client } from '@aws-sdk/client-s3';
import { createObjectStorage } from './create-object-storage';
import { LocalObjectStorage } from './local-object-storage';
import { S3ObjectStorage } from './s3-object-storage';

const local = {
  OBJECT_STORAGE: 'local' as const,
  UPLOADS_LOCAL_STORAGE_ROOT: '.data/uploads',
  OBJECT_STORAGE_ENDPOINT: null,
  OBJECT_STORAGE_REGION: 'auto',
  OBJECT_STORAGE_BUCKET: null,
  OBJECT_STORAGE_ACCESS_KEY_ID: null,
  OBJECT_STORAGE_SECRET_ACCESS_KEY: null,
};

const s3 = {
  ...local,
  OBJECT_STORAGE: 's3' as const,
  OBJECT_STORAGE_ENDPOINT: 'https://account.r2.cloudflarestorage.com',
  OBJECT_STORAGE_BUCKET: 'emma-pilates-prod-images',
  OBJECT_STORAGE_ACCESS_KEY_ID: 'key-id',
  OBJECT_STORAGE_SECRET_ACCESS_KEY: 'secret',
};

describe('createObjectStorage (ADR-0088)', () => {
  it('stores on local disk when configured for local storage', () => {
    expect(createObjectStorage(local)).toBeInstanceOf(LocalObjectStorage);
  });

  it('stores in the configured S3-compatible bucket', async () => {
    const created: { client?: S3Client } = {};
    const storage = createObjectStorage(s3, (config) => {
      created.client = new S3Client(config);
      return created.client;
    });

    expect(storage).toBeInstanceOf(S3ObjectStorage);
    const config = created.client!.config;
    await expect(config.region()).resolves.toBe('auto');
    await expect(config.credentials()).resolves.toMatchObject({
      accessKeyId: 'key-id',
      secretAccessKey: 'secret',
    });
    const endpoint = await config.endpoint!();
    expect(endpoint.hostname).toBe('account.r2.cloudflarestorage.com');
    expect(config.forcePathStyle).toBe(true);
    // R2 rejects the SDK's newer default integrity checksums on some calls.
    await expect(config.requestChecksumCalculation()).resolves.toBe(
      'WHEN_REQUIRED',
    );
  });
});
