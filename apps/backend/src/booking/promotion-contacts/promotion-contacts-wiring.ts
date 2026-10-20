import type { Provider } from '@nestjs/common';
import type { PrismaClient } from '../../generated/prisma/client';
import { createPrismaPromotionContacts } from './prisma-promotion-contacts';
import {
  exportPromotionContacts,
  listPromotionContacts,
  withdrawPromotionContact,
} from './promotion-contacts';
import {
  AdministratorPromotionContactsController,
  promotionContactOperations,
  type PromotionContactOperations,
} from './promotion-contacts.controller';

// BE-022, wired here so booking.module.ts, already past the file-size limit,
// gains two lines (the admin-web-reads pattern).
export const promotionContactsWiring = {
  controllers: [AdministratorPromotionContactsController],
  providers: (prismaToken: symbol): Provider[] => [
    {
      provide: promotionContactOperations,
      inject: [prismaToken],
      useFactory: (prisma: PrismaClient): PromotionContactOperations => {
        const dependencies = {
          store: createPrismaPromotionContacts(prisma),
          now: () => new Date(),
        };
        return {
          list: (query, principal) =>
            listPromotionContacts(query, principal, dependencies),
          export: (principal) =>
            exportPromotionContacts(principal, dependencies),
          withdraw: (command, principal) =>
            withdrawPromotionContact(command, principal, dependencies),
        };
      },
    },
  ],
};
