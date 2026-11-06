import type { Provider } from '@nestjs/common';
import type { PrismaClient } from '../../../generated/prisma/client';
import { OBJECT_STORAGE } from '../../../uploads/object-storage.module';
import { createPrismaStaffPhoto } from './prisma-staff-photo';
import {
  readStaffPhoto,
  removeOwnStaffPhoto,
  removeStaffMemberPhoto,
  setOwnStaffPhoto,
  setStaffMemberPhoto,
} from './staff-photo';
import {
  StaffPhotoController,
  staffPhotoObjectStorage,
  staffPhotoOperations,
  type StaffPhotoOperations,
} from './staff-photo.controller';

// FIX-041's photo slice, wired like the Client photo so booking.module.ts,
// already past the file-size limit, gains two lines.
export const staffPhotoWiring = {
  controllers: [StaffPhotoController],
  providers: (prismaToken: symbol): Provider[] => [
    { provide: staffPhotoObjectStorage, useExisting: OBJECT_STORAGE },
    {
      provide: staffPhotoOperations,
      inject: [prismaToken],
      useFactory: (prisma: PrismaClient): StaffPhotoOperations => {
        const gateway = createPrismaStaffPhoto(prisma);
        const dependencies = { gateway, now: () => new Date() };
        return {
          setOwn: (command, principal) =>
            setOwnStaffPhoto(command, principal, dependencies),
          removeOwn: (principal) =>
            removeOwnStaffPhoto(principal, dependencies),
          setMember: (command, principal) =>
            setStaffMemberPhoto(command, principal, dependencies),
          removeMember: (command, principal) =>
            removeStaffMemberPhoto(command, principal, dependencies),
          read: (query, principal) =>
            readStaffPhoto(query, principal, { gateway }),
        };
      },
    },
  ],
};
