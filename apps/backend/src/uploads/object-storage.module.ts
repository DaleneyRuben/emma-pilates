import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../config/environment';
import { createObjectStorage } from './create-object-storage';

// The API's one object store, shared by every image workflow (ADR-0088).
export const OBJECT_STORAGE = Symbol('OBJECT_STORAGE');

@Global()
@Module({
  providers: [
    {
      provide: OBJECT_STORAGE,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Environment, true>) =>
        createObjectStorage({
          OBJECT_STORAGE: config.getOrThrow('OBJECT_STORAGE'),
          UPLOADS_LOCAL_STORAGE_ROOT: config.getOrThrow(
            'UPLOADS_LOCAL_STORAGE_ROOT',
          ),
          OBJECT_STORAGE_ENDPOINT: config.get('OBJECT_STORAGE_ENDPOINT', {
            infer: true,
          }),
          OBJECT_STORAGE_REGION: config.getOrThrow('OBJECT_STORAGE_REGION'),
          OBJECT_STORAGE_BUCKET: config.get('OBJECT_STORAGE_BUCKET', {
            infer: true,
          }),
          OBJECT_STORAGE_ACCESS_KEY_ID: config.get(
            'OBJECT_STORAGE_ACCESS_KEY_ID',
            { infer: true },
          ),
          OBJECT_STORAGE_SECRET_ACCESS_KEY: config.get(
            'OBJECT_STORAGE_SECRET_ACCESS_KEY',
            { infer: true },
          ),
        }),
    },
  ],
  exports: [OBJECT_STORAGE],
})
export class ObjectStorageModule {}
