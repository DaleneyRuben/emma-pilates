import type { Provider } from '@nestjs/common';
import type { PrismaClient } from '../../generated/prisma/client';
import { admitStaffEmailRequest } from './admit-staff-email-request';
import { PrismaStaffEmailBudgetGateway } from './prisma-staff-email-budget-gateway';
import { staffEmailAdmission } from './staff-email-budget.guard';

export const staffEmailBudgetProviders = (prisma: symbol): Provider[] => [
  {
    provide: staffEmailAdmission,
    inject: [prisma],
    useFactory: (client: PrismaClient) => {
      const dependencies = {
        gateway: new PrismaStaffEmailBudgetGateway(client),
        now: () => new Date(),
      };

      return (command: Parameters<typeof admitStaffEmailRequest>[0]) =>
        admitStaffEmailRequest(command, dependencies);
    },
  },
];
