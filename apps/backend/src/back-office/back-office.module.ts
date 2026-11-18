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
import { createPrismaEquipmentStocks } from './equipment/prisma-equipment-stocks';
import { createPrismaEquipmentTypes } from './equipment/prisma-equipment-types';
import { createPrismaSessionEquipment } from './equipment/prisma-session-equipment';
import { createPrismaExpenses } from './expenses/prisma-expenses';
import { createPrismaVoidExpense } from './expenses/prisma-void-expense';
import { createPrismaFinance } from './finance/prisma-finance';
import { monthFacts } from './finance/month-facts';
import { coordinatorMonthFacts } from './payroll/coordinator-pay-facts';
import { createPayoutQrs } from './payout-qr/payout-qrs';
import { createPrismaPayoutQrs } from './payout-qr/prisma-payout-qrs';
import { createPrismaPayStatements } from './payroll/prisma-pay-statements';
import { createPrismaSalaryPayments } from './payroll/prisma-salary-payments';
import { createPrismaSalaryReceipts } from './payroll/prisma-salary-receipts';
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
          salaryReceipts: createPrismaSalaryReceipts(prisma),
          payStatements: createPrismaPayStatements(prisma, {
            now,
            factsOfMonth: (from, until) =>
              trainerMonthFacts(prisma, from, until),
            coordinatorFactsOfMonth: (from, until) =>
              coordinatorMonthFacts(prisma, from, until),
          }),
          expenses: {
            ...createPrismaExpenses(prisma, { now }),
            ...createPrismaVoidExpense(prisma, { now }),
          },
          report: createPrismaExpenseReport(prisma, { now }),
          finance: createPrismaFinance(prisma, {
            ofMonth: (from, until) => monthFacts(prisma, from, until),
          }),
          equipment: createPrismaEquipment(prisma, { now }),
          equipmentTypes: createPrismaEquipmentTypes(prisma, { now }),
          equipmentStocks: createPrismaEquipmentStocks(prisma, { now }),
          sessionEquipment: createPrismaSessionEquipment(prisma, { now }),
          cashCloses: createPrismaCashCloses(prisma, { now }),
          payoutQrs: createPayoutQrs({
            gateway: createPrismaPayoutQrs(prisma),
            now,
          }),
        };
      },
    },
  ],
})
export class BackOfficeModule {}
