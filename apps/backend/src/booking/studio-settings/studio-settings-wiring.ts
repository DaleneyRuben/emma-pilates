import type { Provider } from '@nestjs/common';
import type { PrismaClient } from '../../generated/prisma/client';
import { createPrismaStudioSettings } from './prisma-studio-settings';
import {
  studioSettingsControllers,
  studioSettingsOperations,
} from './studio-settings.controller';

// BKM-004's slice, wired here so booking.module.ts, already past the
// file-size limit, gains two lines (the promotions-wiring pattern).
export const studioSettingsWiring = {
  controllers: [...studioSettingsControllers],
  providers: (prismaToken: symbol): Provider[] => [
    {
      provide: studioSettingsOperations,
      inject: [prismaToken],
      useFactory: (prisma: PrismaClient) =>
        createPrismaStudioSettings(prisma, { now: () => new Date() }),
    },
  ],
};
