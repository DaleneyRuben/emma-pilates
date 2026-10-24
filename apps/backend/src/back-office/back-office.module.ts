import { Module } from '@nestjs/common';
import { PRISMA_CLIENT } from '../database/database.module';
import { PrismaClient } from '../generated/prisma/client';
import { SystemIdentityModule } from '../system-identity/system-identity.module';
import {
  backOfficeControllers,
  backOfficeOperations,
  type BackOfficeOperations,
} from './back-office.controller';
import { createPrismaCashCloses } from './cash-close/prisma-cash-closes';
import { createPrismaEquipment } from './equipment/prisma-equipment';
import { createPrismaSessionEquipment } from './equipment/prisma-session-equipment';
import { createPrismaExpenses } from './expenses/prisma-expenses';
import { createPrismaFinance } from './finance/prisma-finance';
import { monthFacts } from './finance/month-facts';
import { createPrismaPayStatements } from './payroll/prisma-pay-statements';
import { createPrismaSalaryPayments } from './payroll/prisma-salary-payments';
import { trainerMonthFacts } from './payroll/trainer-pay-facts';
import { createPrismaExpenseReport } from './reports/prisma-expense-report';
import { createPrismaSupplies } from './supplies/prisma-supplies';

// Inventory, payroll, expenses (BKO-002), equipment (BKO-004), and the daily
// Cash Close (BKO-003).
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
          }),
          expenses: createPrismaExpenses(prisma, { now }),
          report: createPrismaExpenseReport(prisma, { now }),
          finance: createPrismaFinance(prisma, {
            ofMonth: (from, until) => monthFacts(prisma, from, until),
          }),
          equipment: createPrismaEquipment(prisma, { now }),
          sessionEquipment: createPrismaSessionEquipment(prisma, { now }),
          cashCloses: createPrismaCashCloses(prisma, { now }),
        };
      },
    },
  ],
})
export class BackOfficeModule {}
