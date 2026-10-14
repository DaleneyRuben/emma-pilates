import { randomBytes } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { dailyBackupKey } from '../../src/backup/backup-keys';
import { S3BackupStore } from '../../src/backup/s3-backup-store';
import { s3ClientConfig } from '../../src/config/s3-client-config';

// EXT-009: the backup store against a real S3-compatible server (MinIO
// locally, S3Mock in CI), with the same settings as S3ObjectStorage's spec.
const endpoint = process.env.OBJECT_STORAGE_TEST_ENDPOINT;
const bucket = process.env.OBJECT_STORAGE_TEST_BUCKET ?? 'pilates-test';
const describeWithServer = endpoint === undefined ? describe.skip : describe;

describeWithServer('S3BackupStore against an S3-compatible server', () => {
  const database = `test_${randomBytes(4).toString('hex')}`;
  const client = new S3Client(
    s3ClientConfig({
      endpoint: endpoint ?? '',
      region: 'auto',
      accessKeyId: process.env.OBJECT_STORAGE_TEST_ACCESS_KEY_ID ?? 'unused',
      secretAccessKey:
        process.env.OBJECT_STORAGE_TEST_SECRET_ACCESS_KEY ?? 'unused',
    }),
  );
  const store = new S3BackupStore(client, bucket, database);
  let directory: string;

  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), 'pilates-backup-store-'));
    try {
      await client.send(new HeadBucketCommand({ Bucket: bucket }));
    } catch {
      await client.send(new CreateBucketCommand({ Bucket: bucket }));
    }
  });

  afterAll(async () => {
    await rm(directory, { recursive: true, force: true });
    client.destroy();
  });

  const writeDump = async (name: string, size: number) => {
    const path = join(directory, name);
    const bytes = randomBytes(size);
    await writeFile(path, bytes);
    return { path, bytes };
  };

  it('streams a dump up once, copies it to the month, and finds it again', async () => {
    await expect(store.latestDailySize()).resolves.toBeNull();
    const older = dailyBackupKey(database, new Date('2026-10-13T07:00:00Z'));
    const newer = dailyBackupKey(database, new Date('2026-10-14T07:00:00Z'));
    const first = await writeDump('older.dump', 1_000);
    const second = await writeDump('newer.dump', 3 * 1024 * 1024);
    const details = { sha256: 'ab12', rowCounts: { 'system.accounts': 3 } };

    await store.upload(older, first.path, { ...details, size: 1_000 });
    await store.upload(newer, second.path, {
      ...details,
      size: second.bytes.length,
    });
    await store.copy(newer, `monthly/${database}-2026-10.dump`);

    await expect(store.latestDailySize()).resolves.toBe(second.bytes.length);
    const copied = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: `monthly/${database}-2026-10.dump`,
      }),
    );
    expect(Buffer.from(await copied.Body!.transformToByteArray())).toEqual(
      second.bytes,
    );
    const head = await client.send(
      new HeadObjectCommand({ Bucket: bucket, Key: newer }),
    );
    expect(head.Metadata).toEqual({
      sha256: 'ab12',
      'row-counts': '{"system.accounts":3}',
    });
    const keys = (await store.list()).map((object) => object.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        older,
        newer,
        `monthly/${database}-2026-10.dump`,
      ]),
    );
  });

  it('refuses to overwrite a daily dump', async () => {
    const key = dailyBackupKey(database, new Date('2026-10-15T07:00:00Z'));
    const dump = await writeDump('again.dump', 100);
    const upload = () =>
      store.upload(key, dump.path, { size: 100, sha256: 'x', rowCounts: {} });

    await upload();
    await expect(upload()).rejects.toThrow();
  });
});
