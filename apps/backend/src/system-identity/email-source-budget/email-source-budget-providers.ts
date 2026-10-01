import type { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../../config/environment';
import type { PrismaClient } from '../../generated/prisma/client';
import { authenticationDigest } from '../security/authentication-digest';
import { admitEmailRequest } from './admit-email-request';
import { emailSourceAdmission } from './email-source-budget.guard';
import { PrismaEmailSourceBudgetGateway } from './prisma-email-source-budget-gateway';

export const emailSourceBudgetProviders = (prisma: symbol): Provider[] => [
  {
    provide: emailSourceAdmission,
    inject: [prisma, ConfigService],
    useFactory: (
      client: PrismaClient,
      config: ConfigService<Environment, true>,
    ) => {
      const dependencies = {
        gateway: new PrismaEmailSourceBudgetGateway(client),
        digestSignal: authenticationDigest(config),
        now: () => new Date(),
      };

      return (command: Parameters<typeof admitEmailRequest>[0]) =>
        admitEmailRequest(command, dependencies);
    },
  },
];
