import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { S3Client } from '@aws-sdk/client-s3';
import { validateBackupEnvironment } from './backup/backup-environment';
import { describeFile } from './backup/file-digest';
import { createPgDump, spawnProcess } from './backup/pg-dump';
import { countBackupRows } from './backup/postgres-row-counts';
import { runDatabaseBackup } from './backup/run-database-backup';
import { S3BackupStore } from './backup/s3-backup-store';
import { s3ClientConfig } from './config/s3-client-config';
import { createHeartbeatPing } from './monitoring/heartbeat-ping';

// EXT-009: Northflank's scheduled `backup` job runs this once a day.
// DATABASE_URL=… BACKUP_STORAGE_ENDPOINT=… BACKUP_STORAGE_BUCKET=…
// BACKUP_STORAGE_ACCESS_KEY_ID=… BACKUP_STORAGE_SECRET_ACCESS_KEY=…
// [BACKUP_HEARTBEAT_URL=…] [BACKUP_PG_DUMP_PATH=…] pnpm backup:run
async function main(): Promise<void> {
  const environment = validateBackupEnvironment(process.env);
  const database = new URL(environment.DATABASE_URL).pathname.slice(1);
  const log = (record: Record<string, unknown>) =>
    console.log(
      JSON.stringify({
        time: new Date().toISOString(),
        service: 'backup',
        release: process.env.RELEASE_ID ?? 'local',
        ...record,
      }),
    );
  const client = new S3Client(
    s3ClientConfig({
      endpoint: environment.BACKUP_STORAGE_ENDPOINT,
      region: environment.BACKUP_STORAGE_REGION,
      accessKeyId: environment.BACKUP_STORAGE_ACCESS_KEY_ID,
      secretAccessKey: environment.BACKUP_STORAGE_SECRET_ACCESS_KEY,
    }),
  );
  const heartbeat = environment.BACKUP_HEARTBEAT_URL;
  const ping = (url: string | null) =>
    createHeartbeatPing(
      url,
      { fetch: (target, init) => fetch(target, init), emit: log },
      'database_backup_ping_failed',
    );
  const directory = await mkdtemp(join(tmpdir(), 'pilates-backup-'));

  try {
    const result = await runDatabaseBackup({
      database,
      countRows: () => countBackupRows(environment.DATABASE_URL),
      dump: createPgDump({
        pgDumpPath: environment.BACKUP_PG_DUMP_PATH,
        databaseUrl: environment.DATABASE_URL,
        directory,
        path: process.env.PATH ?? '',
        run: spawnProcess,
      }),
      describeFile,
      removeFile: (path) => rm(path, { force: true }),
      store: new S3BackupStore(
        client,
        environment.BACKUP_STORAGE_BUCKET,
        database,
      ),
      // Better Stack opens an incident at once on a ping to `/fail`.
      ping: {
        success: ping(heartbeat),
        failure: ping(heartbeat === null ? null : `${heartbeat}/fail`),
      },
      now: () => new Date(),
      log,
    });
    // A dump that shrank is kept and reported; rerunning would not help.
    process.exitCode = result.outcome === 'failed' ? 1 : 0;
  } finally {
    client.destroy();
    await rm(directory, { recursive: true, force: true });
  }
}

void main();
