import type { Provider } from '@nestjs/common';
import type { PrismaClient } from '../../generated/prisma/client';
import { loadAdministratorSessionRoster } from './administrator-session-roster';
import {
  AdministratorSessionRosterController,
  administratorSessionRoster,
  type AdministratorSessionRosterHandler,
} from './administrator-session-roster.controller';
import { findAdministratorSessionRoster } from './prisma-administrator-session-roster';

// WEB-039's slice, wired here so booking.module.ts, already past the
// file-size limit, gains two lines (the promotions-wiring pattern).
export const administratorSessionRosterWiring = {
  controllers: [AdministratorSessionRosterController],
  providers: (prismaToken: symbol): Provider[] => [
    {
      provide: administratorSessionRoster,
      inject: [prismaToken],
      useFactory: (prisma: PrismaClient): AdministratorSessionRosterHandler => {
        const findRoster = findAdministratorSessionRoster(prisma);
        return (sessionId, principal) =>
          loadAdministratorSessionRoster(sessionId, principal, findRoster);
      },
    },
  ],
};
