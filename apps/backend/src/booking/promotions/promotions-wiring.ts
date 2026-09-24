import type { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../../config/environment';
import type { PrismaClient } from '../../generated/prisma/client';
import { LocalObjectStorage } from '../../uploads/local-object-storage';
import { createPrismaPromotionCommands } from './prisma-promotion-commands';
import {
  promotionControllers,
  promotionObjectStorage,
  promotionOperations,
} from './promotions.controller';

// UPL-002's Promotion slice, wired here so booking.module.ts, already past
// the file-size limit, gains two lines (the admin-web-reads pattern).
export const promotionsWiring = {
  controllers: [...promotionControllers],
  providers: (prismaToken: symbol): Provider[] => [
    {
      provide: promotionObjectStorage,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Environment, true>) =>
        new LocalObjectStorage(config.getOrThrow('UPLOADS_LOCAL_STORAGE_ROOT')),
    },
    {
      provide: promotionOperations,
      inject: [prismaToken, promotionObjectStorage],
      useFactory: (prisma: PrismaClient, storage: LocalObjectStorage) =>
        createPrismaPromotionCommands(prisma, storage, {
          now: () => new Date(),
        }),
    },
  ],
};
