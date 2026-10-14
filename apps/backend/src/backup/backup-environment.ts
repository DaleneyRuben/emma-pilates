import { z } from 'zod';

// The backup job's own settings (EXT-009). Only DATABASE_URL is shared with
// the API and worker; the bucket credentials and heartbeat live on the
// Northflank job alone, so the API and worker never hold them.
const backupEnvironmentSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    DATABASE_URL: z.url(),
    BACKUP_STORAGE_ENDPOINT: z.url(),
    BACKUP_STORAGE_REGION: z.string().min(1).default('auto'),
    BACKUP_STORAGE_BUCKET: z.string().min(1),
    BACKUP_STORAGE_ACCESS_KEY_ID: z.string().min(1),
    BACKUP_STORAGE_SECRET_ACCESS_KEY: z.string().min(1),
    BACKUP_HEARTBEAT_URL: z
      .url()
      .refine(
        (value) => value.startsWith('https://'),
        'BACKUP_HEARTBEAT_URL must use HTTPS',
      )
      .nullable()
      .default(null),
    BACKUP_PG_DUMP_PATH: z.string().min(1).default('pg_dump'),
  })
  .superRefine((environment, context) => {
    if (environment.NODE_ENV !== 'production') return;
    if (!environment.BACKUP_STORAGE_ENDPOINT.startsWith('https://')) {
      context.addIssue({
        code: 'custom',
        message: 'BACKUP_STORAGE_ENDPOINT must use HTTPS in production',
        path: ['BACKUP_STORAGE_ENDPOINT'],
      });
    }
    if (environment.BACKUP_HEARTBEAT_URL === null) {
      context.addIssue({
        code: 'custom',
        message: 'BACKUP_HEARTBEAT_URL is required in production',
        path: ['BACKUP_HEARTBEAT_URL'],
      });
    }
  });

export type BackupEnvironment = z.infer<typeof backupEnvironmentSchema>;

export const validateBackupEnvironment = (
  values: Record<string, unknown>,
): BackupEnvironment => backupEnvironmentSchema.parse(values);
