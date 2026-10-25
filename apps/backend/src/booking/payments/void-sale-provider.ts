import type { Provider } from '@nestjs/common';
import type { PrismaClient } from '../../generated/prisma/client';
import { createPrismaVoidPayment } from './prisma-void-payment';
import { voidSale } from './void-sale';
import { voidSaleCommand, type VoidSaleCommand } from './void-sale.controller';

export const voidSaleProvider = (prismaToken: symbol): Provider => ({
  provide: voidSaleCommand,
  inject: [prismaToken],
  useFactory: (prisma: PrismaClient): VoidSaleCommand => {
    const voids = createPrismaVoidPayment(prisma);
    return (command, principal) =>
      voidSale(command, {
        principal,
        now: new Date(),
        voidPayment: (input) => voids.voidPayment(input),
      });
  },
});
