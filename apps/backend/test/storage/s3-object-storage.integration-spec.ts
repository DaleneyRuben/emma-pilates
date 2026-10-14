import { randomBytes, randomUUID } from 'node:crypto';
import {
  CreateBucketCommand,
  HeadBucketCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { createObjectStorage } from '../../src/uploads/create-object-storage';
import type { ObjectStorage } from '../../src/uploads/object-storage';

// ADR-0088: the production adapter against a real S3-compatible server
// (MinIO locally, S3Mock in CI). Set OBJECT_STORAGE_TEST_ENDPOINT,
// OBJECT_STORAGE_TEST_ACCESS_KEY_ID, and OBJECT_STORAGE_TEST_SECRET_ACCESS_KEY
// to run it; the testing guide shows how to start MinIO.
const endpoint = process.env.OBJECT_STORAGE_TEST_ENDPOINT;
const bucket = process.env.OBJECT_STORAGE_TEST_BUCKET ?? 'pilates-test';
const describeWithServer = endpoint === undefined ? describe.skip : describe;

describeWithServer('S3ObjectStorage against an S3-compatible server', () => {
  let storage: ObjectStorage;
  const prefix = `test/${randomUUID()}`;

  beforeAll(async () => {
    const settings = {
      OBJECT_STORAGE: 's3' as const,
      UPLOADS_LOCAL_STORAGE_ROOT: '.data/uploads',
      OBJECT_STORAGE_ENDPOINT: endpoint ?? null,
      OBJECT_STORAGE_REGION: 'auto',
      OBJECT_STORAGE_BUCKET: bucket,
      OBJECT_STORAGE_ACCESS_KEY_ID:
        process.env.OBJECT_STORAGE_TEST_ACCESS_KEY_ID ?? 'unused',
      OBJECT_STORAGE_SECRET_ACCESS_KEY:
        process.env.OBJECT_STORAGE_TEST_SECRET_ACCESS_KEY ?? 'unused',
    };
    let client: S3Client | undefined;
    storage = createObjectStorage(settings, (config) => {
      client = new S3Client(config);
      return client;
    });
    try {
      await client!.send(new HeadBucketCommand({ Bucket: bucket }));
    } catch {
      await client!.send(new CreateBucketCommand({ Bucket: bucket }));
    }
  });

  it('stores and reads back the exact bytes of an image-sized object', async () => {
    const bytes = randomBytes(1024 * 1024);

    await storage.put(`${prefix}/pending/original`, bytes);

    await expect(storage.get(`${prefix}/pending/original`)).resolves.toEqual(
      bytes,
    );
  });

  it('refuses to overwrite through put but replaces through replace', async () => {
    const key = `${prefix}/private/readable`;
    await storage.put(key, Buffer.from('one'));

    await expect(storage.put(key, Buffer.from('two'))).rejects.toThrow();
    await expect(storage.get(key)).resolves.toEqual(Buffer.from('one'));

    await storage.replace(key, Buffer.from('two'));
    await expect(storage.get(key)).resolves.toEqual(Buffer.from('two'));
  });

  it('deletes an object, and deleting a missing one succeeds', async () => {
    const key = `${prefix}/private/thumbnail`;
    await storage.replace(key, Buffer.from('thumb'));

    await storage.delete(key);
    await storage.delete(key);

    await expect(storage.get(key)).rejects.toThrow();
  });
});
