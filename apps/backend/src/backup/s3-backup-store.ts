import { createReadStream } from 'node:fs';
import type { Readable } from 'node:stream';
import type { StoredBackup } from './backup-check';
import type { BackupStore, RowCounts } from './run-database-backup';

type S3Client = { send(command: unknown): Promise<unknown> };

export class S3BackupStore implements BackupStore {
  constructor(
    private readonly client: S3Client,
    private readonly bucket: string,
    private readonly database: string,
    private readonly openFile: (path: string) => Readable = createReadStream,
  ) {}

  latestDailySize = (): Promise<number | null> =>
    Promise.reject(new Error(`not implemented: ${this.database}`));

  upload = (
    key: string,
    path: string,
    details: { size: number; sha256: string; rowCounts: RowCounts },
  ): Promise<void> =>
    Promise.reject(
      new Error(`not implemented: ${key} ${path} ${details.size}`),
    );

  copy = (from: string, to: string): Promise<void> =>
    Promise.reject(new Error(`not implemented: ${from} ${to}`));

  list = (): Promise<StoredBackup[]> =>
    Promise.reject(new Error(`not implemented: ${this.bucket}`));
}
