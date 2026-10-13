import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../config/environment';
import { PG_BOSS, PRISMA_CLIENT } from '../database/database.module';
import type { PgBoss } from 'pg-boss';
import { PrismaClient } from '../generated/prisma/client';
import { SystemIdentityModule } from '../system-identity/system-identity.module';
import { LocalObjectStorage } from './local-object-storage';
import {
  createFinalizeUploadIdempotent,
  createPrismaUploadCommands,
} from './prisma-upload-commands';
import {
  createPendingUploadCommand,
  finalizeUploadCommand,
  putPendingUploadObjectCommand,
  UploadsController,
  readUploadStatusCommand,
  uploadsNodeEnv,
} from './uploads.controller';
import { createReadUploadStatus } from './prisma-upload-commands';

const uploadsPrisma = Symbol('uploadsPrisma');
const uploadsStorage = Symbol('uploadsStorage');
const uploadsPgBoss = Symbol('uploadsPgBoss');

@Module({
  imports: [SystemIdentityModule],
  controllers: [UploadsController],
  providers: [
    { provide: uploadsPrisma, useExisting: PRISMA_CLIENT },
    {
      provide: uploadsStorage,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Environment, true>) =>
        new LocalObjectStorage(config.getOrThrow('UPLOADS_LOCAL_STORAGE_ROOT')),
    },
    {
      provide: readUploadStatusCommand,
      inject: [uploadsPrisma],
      useFactory: (prisma: PrismaClient) => createReadUploadStatus(prisma),
    },
    {
      provide: uploadsNodeEnv,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Environment, true>) =>
        config.getOrThrow<string>('NODE_ENV'),
    },
    { provide: uploadsPgBoss, useExisting: PG_BOSS },
    {
      provide: createPendingUploadCommand,
      inject: [uploadsPrisma, uploadsStorage, uploadsPgBoss],
      useFactory: (
        prisma: PrismaClient,
        storage: LocalObjectStorage,
        boss: PgBoss,
      ) =>
        createPrismaUploadCommands(prisma, storage, () => new Date(), boss)
          .createPendingUpload,
    },
    {
      provide: putPendingUploadObjectCommand,
      inject: [uploadsPrisma, uploadsStorage, uploadsPgBoss],
      useFactory: (
        prisma: PrismaClient,
        storage: LocalObjectStorage,
        boss: PgBoss,
      ) =>
        createPrismaUploadCommands(prisma, storage, () => new Date(), boss)
          .putPendingUploadObject,
    },
    {
      provide: finalizeUploadCommand,
      inject: [uploadsPrisma, uploadsStorage, uploadsPgBoss],
      useFactory: (
        prisma: PrismaClient,
        storage: LocalObjectStorage,
        boss: PgBoss,
      ) =>
        createFinalizeUploadIdempotent(prisma, storage, () => new Date(), boss),
    },
  ],
})
export class UploadsModule {}
