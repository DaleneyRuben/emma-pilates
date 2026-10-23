import { Module } from '@nestjs/common';
import { PRISMA_CLIENT } from '../database/database.module';
import { PrismaClient } from '../generated/prisma/client';
import { SystemIdentityModule } from '../system-identity/system-identity.module';
import {
  backOfficeControllers,
  backOfficeOperations,
  type BackOfficeOperations,
} from './back-office.controller';
import { createPrismaExpenses } from './expenses/prisma-expenses';
import { createPrismaFinance } from './finance/prisma-finance';
import { monthFacts } from './finance/month-facts';
import { coordinatorMonthFacts } from './payroll/coordinator-pay-facts';
import { createPrismaPayStatements } from './payroll/prisma-pay-statements';
import { createPrismaSalaryPayments } from './payroll/prisma-salary-payments';
import { trainerMonthFacts } from './payroll/trainer-pay-facts';
import { createPrismaExpenseReport } from './reports/prisma-expense-report';
import { createPrismaSupplies } from './supplies/prisma-supplies';

// Admin-only inventory, payroll, and expenses (Back Office context, BKO-002).
@Module({
  imports: [SystemIdentityModule],
  controllers: backOfficeControllers,
  providers: [
    {
      provide: backOfficeOperations,
      inject: [PRISMA_CLIENT],
      useFactory: (prisma: PrismaClient): BackOfficeOperations => {
        const now = () => new Date();
        return {
          supplies: createPrismaSupplies(prisma, { now }),
          salaryPayments: createPrismaSalaryPayments(prisma, { now }),
          payStatements: createPrismaPayStatements(prisma, {
            now,
            factsOfMonth: (from, until) =>
              trainerMonthFacts(prisma, from, until),
            coordinatorFactsOfMonth: (from, until) =>
              coordinatorMonthFacts(prisma, from, until),
          }),
          expenses: createPrismaExpenses(prisma, { now }),
          report: createPrismaExpenseReport(prisma, { now }),
          finance: createPrismaFinance(prisma, {
            ofMonth: (from, until) => monthFacts(prisma, from, until),
          }),
        };
      },
    },
  ],
})
export class BackOfficeModule {}
