import type { PrismaClient } from '../../../generated/prisma/client';
import type { StaffPhotoGateway } from './staff-photo';

const notImplemented = (): Promise<never> =>
  Promise.reject(new Error('not implemented'));

export const createPrismaStaffPhoto = (
  prisma: PrismaClient,
): StaffPhotoGateway => {
  void prisma;
  return {
    findMember: notImplemented,
    replacePhoto: notImplemented,
    removePhoto: notImplemented,
    readPhotoObject: notImplemented,
  };
};
