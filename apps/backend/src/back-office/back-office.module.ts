import { Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../config/environment';
import { createPrismaAdapter } from '../database/prisma-adapter';
import { PrismaClient } from '../generated/prisma/client';
import { SystemIdentityModule } from '../system-identity/system-identity.module';
import {
  backOfficeControllers,
  backOfficeOperations,
  type BackOfficeOperations,
} from './back-office.controller';
import { createPrismaExpenses } from './expenses/prisma-expenses';
import { createPrismaSalaryPayments } from './payroll/prisma-salary-payments';
import { createPrismaExpenseReport } from './reports/prisma-expense-report';
import { createPrismaSupplies } from './supplies/prisma-supplies';

const backOfficePrisma = Symbol('backOfficePrisma');

class BackOfficeRuntimeCleanup implements OnApplicationShutdown {
  constructor(private readonly prisma: PrismaClient) {}

  onApplicationShutdown(): Promise<void> {
    return this.prisma.$disconnect();
  }
}

// Admin-only inventory, payroll, and expenses (Back Office context, BKO-002).
@Module({
  imports: [SystemIdentityModule],
  controllers: backOfficeControllers,
  providers: [
    {
      provide: backOfficePrisma,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Environment, true>) =>
        new PrismaClient({
          adapter: createPrismaAdapter(config.getOrThrow('DATABASE_URL')),
        }),
    },
    {
      provide: backOfficeOperations,
      inject: [backOfficePrisma],
      useFactory: (prisma: PrismaClient): BackOfficeOperations => {
        const now = () => new Date();
        return {
          supplies: createPrismaSupplies(prisma, { now }),
          salaryPayments: createPrismaSalaryPayments(prisma, { now }),
          expenses: createPrismaExpenses(prisma, { now }),
          report: createPrismaExpenseReport(prisma, { now }),
        };
      },
    },
    {
      provide: BackOfficeRuntimeCleanup,
      inject: [backOfficePrisma],
      useFactory: (prisma: PrismaClient) =>
        new BackOfficeRuntimeCleanup(prisma),
    },
  ],
})
export class BackOfficeModule {}
