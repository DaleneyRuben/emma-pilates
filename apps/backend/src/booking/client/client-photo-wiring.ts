import type { Provider } from '@nestjs/common';
import type { PrismaClient } from '../../generated/prisma/client';
import { OBJECT_STORAGE } from '../../uploads/object-storage.module';
import {
  readClientPhoto,
  removeClientPhoto,
  setClientPhoto,
} from './client-photo';
import {
  ClientPhotoController,
  clientPhotoObjectStorage,
  clientPhotoOperations,
  type ClientPhotoOperations,
} from './client-photo.controller';
import { createPrismaClientPhoto } from './prisma-client-photo';

// MOB-020's photo slice, wired here so booking.module.ts, already past the
// file-size limit, gains two lines (the promotions-wiring pattern).
export const clientPhotoWiring = {
  controllers: [ClientPhotoController],
  providers: (prismaToken: symbol): Provider[] => [
    {
      provide: clientPhotoObjectStorage,
      useExisting: OBJECT_STORAGE,
    },
    {
      provide: clientPhotoOperations,
      inject: [prismaToken],
      useFactory: (prisma: PrismaClient): ClientPhotoOperations => {
        const gateway = createPrismaClientPhoto(prisma);
        const now = () => new Date();
        return {
          set: (command, principal) =>
            setClientPhoto(command, principal, { gateway, now }),
          remove: (principal) => removeClientPhoto(principal, { gateway, now }),
          read: (query, principal) =>
            readClientPhoto(query, principal, { gateway }),
        };
      },
    },
  ],
};
