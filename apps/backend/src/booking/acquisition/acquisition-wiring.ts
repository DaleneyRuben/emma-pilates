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
  changeOwnReferralCode,
  checkReferralCodeAvailability,
  readOwnReferralCode,
} from './own-referral-code';
import {
  OwnReferralCodeController,
  ownReferralCodeOperations,
  type OwnReferralCodeOperations,
} from './own-referral-code.controller';
import { createPrismaOwnReferralCodeStore } from './prisma-own-referral-code-store';
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
    OwnReferralCodeController,
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
    {
      provide: ownReferralCodeOperations,
      inject: [prismaToken],
      useFactory: (prisma: PrismaClient): OwnReferralCodeOperations => {
        const dependencies = {
          store: createPrismaOwnReferralCodeStore(prisma),
          now: () => new Date(),
        };
        return {
          read: (principal) => readOwnReferralCode(principal, dependencies),
          change: (command, principal) =>
            changeOwnReferralCode(command, principal, dependencies),
          checkAvailability: (command, principal) =>
            checkReferralCodeAvailability(command, principal, dependencies),
        };
      },
    },
  ],
};
