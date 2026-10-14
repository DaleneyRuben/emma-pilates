import { createReadStream } from 'node:fs';
import type { Readable } from 'node:stream';
import {
  CopyObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import type { StoredBackup } from './backup-check';
import { parseBackupKey } from './backup-keys';
import type { BackupStore, RowCounts } from './run-database-backup';

type S3Client = { send(command: unknown): Promise<unknown> };

type ListAnswer = {
  Contents?: { Key?: string; Size?: number; LastModified?: Date }[];
  IsTruncated?: boolean;
  NextContinuationToken?: string;
};

// The private backup bucket on R2 (EXT-009). The job never deletes: R2's
// lifecycle rules expire `daily/` and `monthly/` by age.
export class S3BackupStore implements BackupStore {
  constructor(
    private readonly client: S3Client,
    private readonly bucket: string,
    private readonly database: string,
    private readonly openFile: (path: string) => Readable = (path) =>
      createReadStream(path),
  ) {}

  latestDailySize = async (): Promise<number | null> => {
    const dailies = (await this.listAll(`daily/${this.database}-`)).flatMap(
      (object) => {
        const key = parseBackupKey(object.key);
        return key?.kind === 'daily' ? [{ at: key.at, size: object.size }] : [];
      },
    );
    dailies.sort((a, b) => b.at.getTime() - a.at.getTime());
    return dailies[0]?.size ?? null;
  };

  upload = async (
    key: string,
    path: string,
    details: { size: number; sha256: string; rowCounts: RowCounts },
  ): Promise<void> => {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: this.openFile(path),
        ContentLength: details.size,
        ContentType: 'application/octet-stream',
        IfNoneMatch: '*',
        Metadata: {
          sha256: details.sha256,
          'row-counts': JSON.stringify(details.rowCounts),
        },
      }),
    );
  };

  copy = async (from: string, to: string): Promise<void> => {
    await this.client.send(
      new CopyObjectCommand({
        Bucket: this.bucket,
        Key: to,
        CopySource: `${this.bucket}/${from}`,
      }),
    );
  };

  list = (): Promise<StoredBackup[]> => this.listAll();

  private async listAll(prefix?: string): Promise<StoredBackup[]> {
    const objects: StoredBackup[] = [];
    let token: string | undefined;
    do {
      const answer = (await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          ...(prefix === undefined ? {} : { Prefix: prefix }),
          ...(token === undefined ? {} : { ContinuationToken: token }),
        }),
      )) as ListAnswer;
      (answer.Contents ?? []).forEach((object) =>
        objects.push({
          key: object.Key ?? '',
          size: object.Size ?? 0,
          lastModified: object.LastModified ?? new Date(0),
        }),
      );
      token = answer.IsTruncated ? answer.NextContinuationToken : undefined;
    } while (token !== undefined);
    return objects;
  }
}
