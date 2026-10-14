import { validateBackupEnvironment } from './backup-environment';

const local = {
  DATABASE_URL: 'postgresql://rubendaleney@localhost:5433/pilates_dev_sim',
  BACKUP_STORAGE_ENDPOINT: 'http://127.0.0.1:9000',
  BACKUP_STORAGE_BUCKET: 'pilates-backups',
  BACKUP_STORAGE_ACCESS_KEY_ID: 'minioadmin',
  BACKUP_STORAGE_SECRET_ACCESS_KEY: 'minioadmin',
};

const production = {
  ...local,
  NODE_ENV: 'production',
  DATABASE_URL:
    'postgresql://avnadmin:secret@db.example.aivencloud.com:20680/emma?sslmode=verify-full',
  BACKUP_STORAGE_ENDPOINT: 'https://account.r2.cloudflarestorage.com',
  BACKUP_STORAGE_BUCKET: 'emma-pilates-prod-backups',
  BACKUP_HEARTBEAT_URL: 'https://uptime.betterstack.com/api/v1/heartbeat/abc',
  BACKUP_PG_DUMP_PATH: '/usr/lib/postgresql/18/bin/pg_dump',
};

describe('backup environment (EXT-009)', () => {
  it('fills the defaults for a local run', () => {
    expect(validateBackupEnvironment(local)).toEqual({
      ...local,
      NODE_ENV: 'development',
      BACKUP_STORAGE_REGION: 'auto',
      BACKUP_HEARTBEAT_URL: null,
      BACKUP_PG_DUMP_PATH: 'pg_dump',
    });
  });

  it('requires the bucket and its credentials', () => {
    expect(() =>
      validateBackupEnvironment({ DATABASE_URL: local.DATABASE_URL }),
    ).toThrow(/BACKUP_STORAGE_BUCKET/);
  });

  it('accepts a production configuration', () => {
    expect(validateBackupEnvironment(production)).toMatchObject({
      NODE_ENV: 'production',
      BACKUP_HEARTBEAT_URL: production.BACKUP_HEARTBEAT_URL,
    });
  });

  // An unwatched backup is worse than none: nobody hears that it stopped.
  it('requires HTTPS storage and a heartbeat in production', () => {
    expect(() =>
      validateBackupEnvironment({
        ...production,
        BACKUP_STORAGE_ENDPOINT: 'http://127.0.0.1:9000',
      }),
    ).toThrow('BACKUP_STORAGE_ENDPOINT must use HTTPS in production');
    expect(() =>
      validateBackupEnvironment({
        ...production,
        BACKUP_HEARTBEAT_URL: undefined,
      }),
    ).toThrow('BACKUP_HEARTBEAT_URL is required in production');
  });
});
