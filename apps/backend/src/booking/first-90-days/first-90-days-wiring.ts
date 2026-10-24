import type { Provider } from '@nestjs/common';
import { boliviaDate } from '../../time/bolivia-time';
import type { PrismaClient } from '../../generated/prisma/client';
import {
  ContactAlertsController,
  contactAlertOperations,
  type ContactAlertOperations,
} from './first-90-days.controller';
import { listContactAlerts } from './list-contact-alerts';
import { markClientContacted } from './mark-contacted';
import { createPrismaContactAlerts } from './prisma-contact-alerts';

export const first90DaysWiring = {
  controllers: [ContactAlertsController],
  providers: (prismaToken: symbol): Provider[] => [
    {
      provide: contactAlertOperations,
      inject: [prismaToken],
      useFactory: (prisma: PrismaClient): ContactAlertOperations => {
        const store = createPrismaContactAlerts(prisma);
        const now = () => new Date();
        return {
          list: (principal) =>
            listContactAlerts(principal, {
              now,
              today: boliviaDate,
              findOpen: store.findOpen,
            }),
          mark: (command, principal) =>
            markClientContacted(command, principal, { now, store }),
        };
      },
    },
  ],
};
