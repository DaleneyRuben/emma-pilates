export type BackupEnvironment = {
  NODE_ENV: 'development' | 'test' | 'production';
  DATABASE_URL: string;
  BACKUP_STORAGE_ENDPOINT: string;
  BACKUP_STORAGE_REGION: string;
  BACKUP_STORAGE_BUCKET: string;
  BACKUP_STORAGE_ACCESS_KEY_ID: string;
  BACKUP_STORAGE_SECRET_ACCESS_KEY: string;
  BACKUP_HEARTBEAT_URL: string | null;
  BACKUP_PG_DUMP_PATH: string;
};

export const validateBackupEnvironment = (
  values: Record<string, unknown>,
): BackupEnvironment => {
  throw new Error(`not implemented: ${Object.keys(values).length}`);
};
