import type { Provider } from '@nestjs/common';
import type { PrismaClient } from '../../generated/prisma/client';
import {
  acquisitionOperations,
  AdministratorClientAcquisitionController,
  AdministratorTrainerReferralCodeController,
  type AcquisitionOperations,
} from './acquisition.controller';
import {
  correctClientAcquisition,
  readClientAcquisition,
} from './client-acquisition';
import {
  createPrismaClientAcquisitionStore,
  createPrismaTrainerReferralCodeStore,
} from './prisma-acquisition-stores';
import {
  readTrainerReferralCode,
  setTrainerReferralCode,
} from './trainer-referral-code';

// BKM-011, wired here so booking.module.ts, already past the file-size limit,
// gains two lines (the promotions-consent-wiring pattern).
export const acquisitionWiring = {
  controllers: [
    AdministratorClientAcquisitionController,
    AdministratorTrainerReferralCodeController,
  ],
  providers: (prismaToken: symbol): Provider[] => [
    {
      provide: acquisitionOperations,
      inject: [prismaToken],
      useFactory: (prisma: PrismaClient): AcquisitionOperations => {
        const now = () => new Date();
        const clients = {
          store: createPrismaClientAcquisitionStore(prisma),
          now,
        };
        const trainers = {
          store: createPrismaTrainerReferralCodeStore(prisma),
          now,
        };
        return {
          readClient: (command, principal) =>
            readClientAcquisition(command, principal, clients),
          correctClient: (command, principal) =>
            correctClientAcquisition(command, principal, clients),
          readTrainerCode: (command, principal) =>
            readTrainerReferralCode(command, principal, trainers),
          setTrainerCode: (command, principal) =>
            setTrainerReferralCode(command, principal, trainers),
        };
      },
    },
  ],
};
