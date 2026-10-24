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
import { createPrismaSalaryPayments } from './payroll/prisma-salary-payments';
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
          expenses: createPrismaExpenses(prisma, { now }),
          report: createPrismaExpenseReport(prisma, { now }),
          equipment: createPrismaEquipment(prisma, { now }),
          sessionEquipment: createPrismaSessionEquipment(prisma, { now }),
          cashCloses: createPrismaCashCloses(prisma, { now }),
        };
      },
    },
  ],
})
export class BackOfficeModule {}
