import { Readable } from 'node:stream';
import {
  CopyObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { S3BackupStore } from './s3-backup-store';

type SentCommand = { constructor: unknown; input: Record<string, unknown> };

const fakeClient = (answers: unknown[] = []) => {
  const sent: SentCommand[] = [];
  return {
    sent,
    client: {
      send: (command: SentCommand) => {
        sent.push(command);
        return Promise.resolve(answers.shift() ?? {});
      },
    },
  };
};

const at = new Date('2026-10-14T07:01:00Z');

describe('S3BackupStore (EXT-009)', () => {
  it('uploads a dump file once, with its length, checksum, and row counts', async () => {
    const { sent, client } = fakeClient();
    const body = Readable.from(['dump']);
    const openFile = jest.fn(() => body);
    const store = new S3BackupStore(client, 'backups', 'emma', openFile);

    await store.upload('daily/emma-20261014T070012Z.dump', '/tmp/x/emma.dump', {
      size: 300_000,
      sha256: 'ab12',
      rowCounts: { 'system.accounts': 3 },
    });

    expect(openFile).toHaveBeenCalledWith('/tmp/x/emma.dump');
    expect(sent).toHaveLength(1);
    expect(sent[0]).toBeInstanceOf(PutObjectCommand);
    expect(sent[0].input).toEqual({
      Bucket: 'backups',
      Key: 'daily/emma-20261014T070012Z.dump',
      Body: body,
      ContentLength: 300_000,
      ContentType: 'application/octet-stream',
      IfNoneMatch: '*',
      Metadata: { sha256: 'ab12', 'row-counts': '{"system.accounts":3}' },
    });
  });

  it('copies the daily dump over the month’s copy inside the bucket', async () => {
    const { sent, client } = fakeClient();
    const store = new S3BackupStore(client, 'backups', 'emma');

    await store.copy(
      'daily/emma-20261014T070012Z.dump',
      'monthly/emma-2026-10.dump',
    );

    expect(sent[0]).toBeInstanceOf(CopyObjectCommand);
    expect(sent[0].input).toEqual({
      Bucket: 'backups',
      Key: 'monthly/emma-2026-10.dump',
      CopySource: 'backups/daily/emma-20261014T070012Z.dump',
    });
  });

  it('finds the newest daily dump of its database across listing pages', async () => {
    const { sent, client } = fakeClient([
      {
        Contents: [
          { Key: 'daily/emma-20261013T070000Z.dump', Size: 280_000 },
          { Key: 'daily/emma-20261012T070000Z.dump', Size: 270_000 },
        ],
        IsTruncated: true,
        NextContinuationToken: 'page-2',
      },
      {
        Contents: [{ Key: 'daily/emma-20261011T070000Z.dump', Size: 260_000 }],
        IsTruncated: false,
      },
    ]);
    const store = new S3BackupStore(client, 'backups', 'emma');

    await expect(store.latestDailySize()).resolves.toBe(280_000);
    expect(sent.map((command) => command.input)).toEqual([
      { Bucket: 'backups', Prefix: 'daily/emma-' },
      { Bucket: 'backups', Prefix: 'daily/emma-', ContinuationToken: 'page-2' },
    ]);
    expect(sent[0]).toBeInstanceOf(ListObjectsV2Command);
  });

  it('has no previous size before the first dump', async () => {
    const { client } = fakeClient([{ IsTruncated: false }]);

    await expect(
      new S3BackupStore(client, 'backups', 'emma').latestDailySize(),
    ).resolves.toBeNull();
  });

  it('lists every object for the weekly check', async () => {
    const { sent, client } = fakeClient([
      {
        Contents: [
          {
            Key: 'monthly/emma-2026-10.dump',
            Size: 300_000,
            LastModified: at,
          },
        ],
        IsTruncated: false,
      },
    ]);

    await expect(
      new S3BackupStore(client, 'backups', 'emma').list(),
    ).resolves.toEqual([
      { key: 'monthly/emma-2026-10.dump', size: 300_000, lastModified: at },
    ]);
    expect(sent[0].input).toEqual({ Bucket: 'backups' });
  });
});
