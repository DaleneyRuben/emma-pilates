import { Module } from '@nestjs/common';
import { PRISMA_CLIENT } from '../database/database.module';
import { PrismaClient } from '../generated/prisma/client';
import { SystemIdentityModule } from '../system-identity/system-identity.module';
import { requireStudioAdministrator } from './studio-errors';
import {
  recomputeStudioFacts,
  currentStudioMonth,
} from './prisma-studio-facts';
import {
  studioControllers,
  studioOperations,
  type StudioOperations,
} from './studio.controller';

@Module({
  imports: [SystemIdentityModule],
  controllers: studioControllers,
  providers: [
    {
      provide: studioOperations,
      inject: [PRISMA_CLIENT],
      useFactory: (prisma: PrismaClient): StudioOperations => ({
        recompute: async (input, principal) => {
          requireStudioAdministrator(principal);
          const [year, month] = input.month.split('-').map(Number);
          const result = await recomputeStudioFacts(prisma, {
            month: new Date(Date.UTC(year, month - 1, 1)),
            now: () => new Date(),
          });
          return { month: input.month, ...result };
        },
      }),
    },
  ],
})
export class StudioModule {}

export const recomputeCurrentStudioMonth = (prisma: PrismaClient) =>
  recomputeStudioFacts(prisma, {
    month: currentStudioMonth(new Date()),
    now: () => new Date(),
  });
