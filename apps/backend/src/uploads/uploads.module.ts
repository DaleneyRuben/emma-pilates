import { Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPrismaAdapter } from '../database/prisma-adapter';
import type { PgBoss } from 'pg-boss';
import type { Environment } from '../config/environment';
import { PrismaClient } from '../generated/prisma/client';
import { createPgBoss, startInstalledPgBoss } from '../jobs/pg-boss-runtime';
import { bootsWithoutJobRuntime } from '../jobs/boot-without-job-runtime';
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

const offlinePgBoss: Pick<PgBoss, 'stop'> = {
  stop: () => Promise.resolve(),
};

class UploadsRuntimeCleanup implements OnApplicationShutdown {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly boss: PgBoss,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    try {
      await this.boss.stop({ graceful: true });
    } finally {
      await this.prisma.$disconnect();
    }
  }
}

@Module({
  imports: [SystemIdentityModule],
  controllers: [UploadsController],
  providers: [
    {
      provide: uploadsPrisma,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Environment, true>) =>
        new PrismaClient({
          adapter: createPrismaAdapter(
            config.getOrThrow('DATABASE_URL'),
            config.getOrThrow('DATABASE_POOL_MAX'),
          ),
        }),
    },
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
    {
      provide: uploadsPgBoss,
      inject: [ConfigService],
      useFactory: async (config: ConfigService<Environment, true>) => {
        if (bootsWithoutJobRuntime(process.env)) {
          return offlinePgBoss as PgBoss;
        }
        const boss = createPgBoss(config.getOrThrow('DATABASE_URL'), {
          poolMax: config.getOrThrow('DATABASE_POOL_MAX'),
        });
        await startInstalledPgBoss(boss);
        return boss;
      },
    },
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
    {
      provide: UploadsRuntimeCleanup,
      inject: [uploadsPrisma, uploadsPgBoss],
      useFactory: (prisma: PrismaClient, boss: PgBoss) =>
        new UploadsRuntimeCleanup(prisma, boss),
    },
  ],
})
export class UploadsModule {}
