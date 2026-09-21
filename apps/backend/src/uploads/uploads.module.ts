import { Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import type { Environment } from '../config/environment';
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
  uploadsNodeEnv,
} from './uploads.controller';

const uploadsPrisma = Symbol('uploadsPrisma');
const uploadsStorage = Symbol('uploadsStorage');

class UploadsRuntimeCleanup implements OnApplicationShutdown {
  constructor(private readonly prisma: PrismaClient) {}

  onApplicationShutdown(): Promise<void> {
    return this.prisma.$disconnect();
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
          adapter: new PrismaPg({
            connectionString: config.getOrThrow('DATABASE_URL'),
          }),
        }),
    },
    {
      provide: uploadsStorage,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Environment, true>) =>
        new LocalObjectStorage(config.getOrThrow('UPLOADS_LOCAL_STORAGE_ROOT')),
    },
    {
      provide: uploadsNodeEnv,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Environment, true>) =>
        config.getOrThrow<string>('NODE_ENV'),
    },
    {
      provide: createPendingUploadCommand,
      inject: [uploadsPrisma, uploadsStorage],
      useFactory: (prisma: PrismaClient, storage: LocalObjectStorage) =>
        createPrismaUploadCommands(prisma, storage, () => new Date())
          .createPendingUpload,
    },
    {
      provide: putPendingUploadObjectCommand,
      inject: [uploadsPrisma, uploadsStorage],
      useFactory: (prisma: PrismaClient, storage: LocalObjectStorage) =>
        createPrismaUploadCommands(prisma, storage, () => new Date())
          .putPendingUploadObject,
    },
    {
      provide: finalizeUploadCommand,
      inject: [uploadsPrisma, uploadsStorage],
      useFactory: (prisma: PrismaClient, storage: LocalObjectStorage) =>
        createFinalizeUploadIdempotent(prisma, storage, () => new Date()),
    },
    {
      provide: UploadsRuntimeCleanup,
      inject: [uploadsPrisma],
      useFactory: (prisma: PrismaClient) => new UploadsRuntimeCleanup(prisma),
    },
  ],
})
export class UploadsModule {}
