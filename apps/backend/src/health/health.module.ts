import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { BeforeApplicationShutdown, Injectable, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../config/environment';
import { PRISMA_CLIENT } from '../database/database.module';
import type { PrismaClient } from '../generated/prisma/client';
import { HealthController } from './health.controller';
import { checkReadiness } from './readiness';
import {
  ReadinessController,
  readinessCheck,
  releaseIdentifier,
} from './readiness.controller';

const readinessTimeoutMs = 2_000;

// The API runs from the backend package root, beside prisma/migrations.
function readShippedMigrations(): readonly string[] | null {
  try {
    return readdirSync(join(process.cwd(), 'prisma', 'migrations'), {
      withFileTypes: true,
    })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    return null;
  }
}

@Injectable()
class ShutdownState implements BeforeApplicationShutdown {
  shuttingDown = false;

  beforeApplicationShutdown(): void {
    this.shuttingDown = true;
  }
}

@Module({
  controllers: [HealthController, ReadinessController],
  providers: [
    ShutdownState,
    {
      provide: releaseIdentifier,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Environment, true>) =>
        config.getOrThrow<string>('RELEASE_ID'),
    },
    {
      provide: readinessCheck,
      inject: [PRISMA_CLIENT, ShutdownState],
      useFactory: (prisma: PrismaClient, shutdown: ShutdownState) => {
        const expectedMigrations = readShippedMigrations();
        return () =>
          checkReadiness({
            appliedMigrations: async () => {
              const rows = await prisma.$queryRaw<
                { migration_name: string }[]
              >`select migration_name from _prisma_migrations where finished_at is not null and rolled_back_at is null`;
              return rows.map((row) => row.migration_name);
            },
            expectedMigrations,
            shuttingDown: () => shutdown.shuttingDown,
            timeoutMs: readinessTimeoutMs,
          });
      },
    },
  ],
})
export class HealthModule {}
