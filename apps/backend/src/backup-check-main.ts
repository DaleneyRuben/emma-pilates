import { S3Client } from '@aws-sdk/client-s3';
import { checkBackups } from './backup/backup-check';
import { S3BackupStore } from './backup/s3-backup-store';
import { s3ClientConfig } from './config/s3-client-config';

// EXT-009's weekly check (runbook «Check the job every week»), run from the
// Mac with the read-only restore token:
// BACKUP_STORAGE_ENDPOINT=… BACKUP_STORAGE_BUCKET=… BACKUP_STORAGE_ACCESS_KEY_ID=…
// BACKUP_STORAGE_SECRET_ACCESS_KEY=… [BACKUP_DATABASE=emma] pnpm backup:check
function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`${name} must be set`);
  }
  return value;
}

async function main(): Promise<void> {
  const database = process.env.BACKUP_DATABASE || 'emma';
  const client = new S3Client(
    s3ClientConfig({
      endpoint: required('BACKUP_STORAGE_ENDPOINT'),
      region: process.env.BACKUP_STORAGE_REGION || 'auto',
      accessKeyId: required('BACKUP_STORAGE_ACCESS_KEY_ID'),
      secretAccessKey: required('BACKUP_STORAGE_SECRET_ACCESS_KEY'),
    }),
  );
  try {
    const store = new S3BackupStore(
      client,
      required('BACKUP_STORAGE_BUCKET'),
      database,
    );
    const report = checkBackups({
      database,
      objects: await store.list(),
      now: new Date(),
    });
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.passed ? 0 : 1;
  } finally {
    client.destroy();
  }
}

void main();
