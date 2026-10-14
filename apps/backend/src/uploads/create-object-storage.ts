import { S3Client, type S3ClientConfig } from '@aws-sdk/client-s3';
import type { Environment } from '../config/environment';
import { LocalObjectStorage } from './local-object-storage';
import type { ObjectStorage } from './object-storage';
import { S3ObjectStorage } from './s3-object-storage';

type ObjectStorageSettings = Pick<
  Environment,
  | 'OBJECT_STORAGE'
  | 'UPLOADS_LOCAL_STORAGE_ROOT'
  | 'OBJECT_STORAGE_ENDPOINT'
  | 'OBJECT_STORAGE_REGION'
  | 'OBJECT_STORAGE_BUCKET'
  | 'OBJECT_STORAGE_ACCESS_KEY_ID'
  | 'OBJECT_STORAGE_SECRET_ACCESS_KEY'
>;

const s3Setting = (value: string | null, name: string): string => {
  if (value === null) throw new Error(`${name} is required`);
  return value;
};

// ADR-0088: local disk outside production, R2's S3 API in production. The
// environment schema already refuses an incomplete S3 configuration.
export function createObjectStorage(
  settings: ObjectStorageSettings,
  newClient: (config: S3ClientConfig) => S3Client = (config) =>
    new S3Client(config),
): ObjectStorage {
  if (settings.OBJECT_STORAGE === 'local') {
    return new LocalObjectStorage(settings.UPLOADS_LOCAL_STORAGE_ROOT);
  }

  const client = newClient({
    endpoint: s3Setting(
      settings.OBJECT_STORAGE_ENDPOINT,
      'OBJECT_STORAGE_ENDPOINT',
    ),
    region: settings.OBJECT_STORAGE_REGION,
    credentials: {
      accessKeyId: s3Setting(
        settings.OBJECT_STORAGE_ACCESS_KEY_ID,
        'OBJECT_STORAGE_ACCESS_KEY_ID',
      ),
      secretAccessKey: s3Setting(
        settings.OBJECT_STORAGE_SECRET_ACCESS_KEY,
        'OBJECT_STORAGE_SECRET_ACCESS_KEY',
      ),
    },
    forcePathStyle: true,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });

  return new S3ObjectStorage(
    client,
    s3Setting(settings.OBJECT_STORAGE_BUCKET, 'OBJECT_STORAGE_BUCKET'),
  );
}
