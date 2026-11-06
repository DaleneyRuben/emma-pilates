import type { PrismaClient } from '../../../generated/prisma/client';
import type { InvoiceDataGateway } from './invoice-data';

// PAY-007: the Invoice Data adapter, the prefill of the next sale.
export const createPrismaInvoiceData = (
  prisma: PrismaClient,
): InvoiceDataGateway => ({
  lastFor: async (clientId) => {
    const latest = await prisma.payment.findFirst({
      where: { clientId, invoiceTaxId: { not: null } },
      orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }],
      select: { invoiceTaxId: true, invoiceName: true },
    });
    return latest?.invoiceTaxId == null || latest.invoiceName === null
      ? null
      : { taxId: latest.invoiceTaxId, name: latest.invoiceName };
  },
});
