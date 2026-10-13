import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PgBoss } from 'pg-boss';
import type { Environment } from '../config/environment';
import type { PrismaClient } from '../generated/prisma/client';
import { bootsWithoutJobRuntime } from '../jobs/boot-without-job-runtime';
import { startInstalledPgBoss } from '../jobs/pg-boss-runtime';
import { createDatabasePgBoss, createDatabasePrisma } from './database-clients';

// The API's one Prisma client and one pg-boss, shared by every module so the
// process stays within DATABASE_POOL_MAX connections (ADR-0027).
export const PRISMA_CLIENT = Symbol('PRISMA_CLIENT');
export const PG_BOSS = Symbol('PG_BOSS');

const offlinePgBoss: Pick<PgBoss, 'stop'> = {
  stop: () => Promise.resolve(),
};

class DatabaseRuntimeCleanup implements OnApplicationShutdown {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(PG_BOSS) private readonly boss: PgBoss,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    try {
      await this.boss.stop({ graceful: true });
    } finally {
      await this.prisma.$disconnect();
    }
  }
}

@Global()
@Module({
  providers: [
    {
      provide: PRISMA_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Environment, true>) =>
        createDatabasePrisma('api', {
          DATABASE_URL: config.getOrThrow('DATABASE_URL'),
          DATABASE_POOL_MAX: config.getOrThrow('DATABASE_POOL_MAX'),
        }),
    },
    {
      provide: PG_BOSS,
      inject: [ConfigService],
      useFactory: async (config: ConfigService<Environment, true>) => {
        if (bootsWithoutJobRuntime(process.env)) {
          return offlinePgBoss as PgBoss;
        }
        const boss = createDatabasePgBoss('api', {
          DATABASE_URL: config.getOrThrow('DATABASE_URL'),
          DATABASE_POOL_MAX: config.getOrThrow('DATABASE_POOL_MAX'),
        });
        await startInstalledPgBoss(boss);
        return boss;
      },
    },
    DatabaseRuntimeCleanup,
  ],
  exports: [PRISMA_CLIENT, PG_BOSS],
})
export class DatabaseModule {}
