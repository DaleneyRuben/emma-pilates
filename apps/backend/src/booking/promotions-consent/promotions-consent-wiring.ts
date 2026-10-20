import type { Provider } from '@nestjs/common';
import type { PrismaClient } from '../../generated/prisma/client';
import { createPrismaPromotionsConsent } from './prisma-promotions-consent';
import {
  readPromotionsConsent,
  setPromotionsConsent,
} from './promotions-consent';
import {
  PromotionsConsentController,
  promotionsConsentOperations,
  type PromotionsConsentOperations,
} from './promotions-consent.controller';

// BE-023, wired here so booking.module.ts, already past the file-size limit,
// gains two lines (the promotion-contacts-wiring pattern).
export const promotionsConsentWiring = {
  controllers: [PromotionsConsentController],
  providers: (prismaToken: symbol): Provider[] => [
    {
      provide: promotionsConsentOperations,
      inject: [prismaToken],
      useFactory: (prisma: PrismaClient): PromotionsConsentOperations => {
        const dependencies = {
          store: createPrismaPromotionsConsent(prisma),
          now: () => new Date(),
        };
        return {
          read: (principal) => readPromotionsConsent(principal, dependencies),
          set: (command, principal) =>
            setPromotionsConsent(command, principal, dependencies),
        };
      },
    },
  ],
};
