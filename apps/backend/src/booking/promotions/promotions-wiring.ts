import type { Provider } from '@nestjs/common';
import type { PrismaClient } from '../../generated/prisma/client';
import type { ObjectStorage } from '../../uploads/object-storage';
import { OBJECT_STORAGE } from '../../uploads/object-storage.module';
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
      useExisting: OBJECT_STORAGE,
    },
    {
      provide: promotionOperations,
      inject: [prismaToken, promotionObjectStorage],
      useFactory: (prisma: PrismaClient, storage: ObjectStorage) =>
        createPrismaPromotionCommands(prisma, storage, {
          now: () => new Date(),
        }),
    },
  ],
};
