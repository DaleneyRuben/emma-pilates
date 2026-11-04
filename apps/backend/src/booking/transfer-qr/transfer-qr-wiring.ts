import type { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../../config/environment';
import type { PrismaClient } from '../../generated/prisma/client';
import type { ObjectStorage } from '../../uploads/object-storage';
import { OBJECT_STORAGE } from '../../uploads/object-storage.module';
import {
  transferInstructions,
  type TransferInstructions,
} from '../payments/payments.controller';
import { createStudioTransferQr } from './prisma-studio-transfer-qr';
import {
  studioTransferQrControllers,
  studioTransferQrOperations,
} from './studio-transfer-qr.controller';

// WEB-038's slice, wired here so booking.module.ts, already past the
// file-size limit, does not grow (the studio-settings-wiring pattern). The
// apps' QR route reads the same object the Administrator replaces.
export const transferQrWiring = {
  controllers: [...studioTransferQrControllers],
  providers: (prismaToken: symbol): Provider[] => [
    {
      provide: studioTransferQrOperations,
      inject: [prismaToken, OBJECT_STORAGE],
      useFactory: (prisma: PrismaClient, storage: ObjectStorage) =>
        createStudioTransferQr(prisma, storage, { now: () => new Date() }),
    },
    {
      provide: transferInstructions,
      inject: [ConfigService, OBJECT_STORAGE],
      useFactory: (
        config: ConfigService<Environment, true>,
        storage: ObjectStorage,
      ): TransferInstructions => ({
        qrImagePath: config.getOrThrow('TRANSFER_QR_IMAGE_PATH'),
        storage,
      }),
    },
  ],
};
