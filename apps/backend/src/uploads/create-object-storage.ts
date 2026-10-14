import type { S3Client, S3ClientConfig } from '@aws-sdk/client-s3';
import type { Environment } from '../config/environment';
import type { ObjectStorage } from './object-storage';

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

export function createObjectStorage(
  settings: ObjectStorageSettings,
  newClient?: (config: S3ClientConfig) => S3Client,
): ObjectStorage {
  throw new Error(
    `not implemented ${settings.OBJECT_STORAGE} ${newClient === undefined}`,
  );
}
