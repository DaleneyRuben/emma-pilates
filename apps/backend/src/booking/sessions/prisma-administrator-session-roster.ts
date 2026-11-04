import type { PrismaClient } from '../../generated/prisma/client';
import type { FindAdministratorSessionRoster } from './administrator-session-roster';

export const findAdministratorSessionRoster: (
  prisma: PrismaClient,
) => FindAdministratorSessionRoster = () => () =>
  Promise.reject(new Error('not implemented'));
