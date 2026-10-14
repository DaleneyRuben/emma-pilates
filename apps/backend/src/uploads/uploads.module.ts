import { Module } from '@nestjs/common';
import { PG_BOSS, PRISMA_CLIENT } from '../database/database.module';
import type { PgBoss } from 'pg-boss';
import { PrismaClient } from '../generated/prisma/client';
import { SystemIdentityModule } from '../system-identity/system-identity.module';
import type { ObjectStorage } from './object-storage';
import { OBJECT_STORAGE } from './object-storage.module';
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
} from './uploads.controller';
import { createReadUploadStatus } from './prisma-upload-commands';

@Module({
  imports: [SystemIdentityModule],
  controllers: [UploadsController],
  providers: [
    {
      provide: readUploadStatusCommand,
      inject: [PRISMA_CLIENT],
      useFactory: (prisma: PrismaClient) => createReadUploadStatus(prisma),
    },
    {
      provide: createPendingUploadCommand,
      inject: [PRISMA_CLIENT, OBJECT_STORAGE, PG_BOSS],
      useFactory: (
        prisma: PrismaClient,
        storage: ObjectStorage,
        boss: PgBoss,
      ) =>
        createPrismaUploadCommands(prisma, storage, () => new Date(), boss)
          .createPendingUpload,
    },
    {
      provide: putPendingUploadObjectCommand,
      inject: [PRISMA_CLIENT, OBJECT_STORAGE, PG_BOSS],
      useFactory: (
        prisma: PrismaClient,
        storage: ObjectStorage,
        boss: PgBoss,
      ) =>
        createPrismaUploadCommands(prisma, storage, () => new Date(), boss)
          .putPendingUploadObject,
    },
    {
      provide: finalizeUploadCommand,
      inject: [PRISMA_CLIENT, OBJECT_STORAGE, PG_BOSS],
      useFactory: (
        prisma: PrismaClient,
        storage: ObjectStorage,
        boss: PgBoss,
      ) =>
        createFinalizeUploadIdempotent(prisma, storage, () => new Date(), boss),
    },
  ],
})
export class UploadsModule {}
