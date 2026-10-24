import { randomUUID } from 'node:crypto';
import { createPrismaAdministratorPayments } from '../../src/booking/payments/prisma-administrator-payments';
import { InvoiceDataError } from '../../src/booking/payments/invoice-data/invoice-data';
import { createPrismaInvoiceData } from '../../src/booking/payments/invoice-data/prisma-invoice-data';
import type { AuthenticatedPrincipal } from '../../src/system-identity/authentication/resolve-authenticated-principal';
import {
  fixtures,
  hour,
  now,
  plan,
  startPaymentWorld,
  type PaymentWorld,
} from './payment-lifecycle-test-support';

const day = 24 * hour;
const centro = fixtures.branches.find((b) => b.name === 'Centro')!;
const ana = { taxId: '4567891', name: 'Ana Pérez' };
const company = { taxId: '1020304050', name: 'Estudio Ana SRL' };

const issueError = async (work: Promise<unknown>): Promise<string> => {
  try {
    await work;
    return 'resolved';
  } catch (error) {
    return error instanceof InvoiceDataError ? error.code : String(error);
  }
};

// PAY-007 (ADR-0012): Invoice Data travels with the sale, prefills the next
// one, and the Administrator marks the invoice issued outside the system.
describe('Invoice Data (PostgreSQL)', () => {
  let world: PaymentWorld;
  let administrator: AuthenticatedPrincipal;
  let assistant: AuthenticatedPrincipal;
  const invoices = () => createPrismaInvoiceData(world.prisma);

  const transfer = async (
    buyer: AuthenticatedPrincipal,
    invoiceData: { taxId: string; name: string } | null,
    at: Date = now,
  ) => {
    const receipt = await world.readyReceipt(buyer.accountId);
    const intent = await world
      .commands(at)
      .createPurchaseIntent({ planId: plan.id }, buyer, randomUUID());
    await world
      .commands(at)
      .attachReceipt(
        { purchaseIntentId: intent.id, imageAssetId: receipt.id },
        buyer,
        randomUUID(),
      );
    return world
      .commands(at)
      .submitTransfer(
        { purchaseIntentId: intent.id, invoiceData },
        buyer,
        randomUUID(),
      );
  };

  const cash = (
    clientId: string,
    invoiceData: { taxId: string; name: string } | null,
    at: Date = now,
  ) =>
    world
      .commands(at)
      .recordCashPayment(
        { clientId, planId: plan.id, branchId: centro.id, invoiceData },
        assistant,
        randomUUID(),
      );

  const stored = (paymentId: string) =>
    world.prisma.payment.findUniqueOrThrow({
      where: { id: paymentId },
      select: {
        invoiceTaxId: true,
        invoiceName: true,
        invoiceIssuedAt: true,
        invoiceIssuedByAccountId: true,
      },
    });

  beforeAll(async () => {
    world = await startPaymentWorld();
    administrator = await world.staffPrincipal('paola.mendoza@example.com');
    assistant = await world.staffPrincipal('camila.rojas@example.com');
  });

  afterAll(async () => {
    await world?.stop();
  });

  it('keeps the Invoice Data a Client sends with her transfer', async () => {
    const buyer = await world.newClient('Factura por transferencia');

    const payment = await transfer(buyer, ana);

    await expect(stored(payment.id)).resolves.toEqual({
      invoiceTaxId: '4567891',
      invoiceName: 'Ana Pérez',
      invoiceIssuedAt: null,
      invoiceIssuedByAccountId: null,
    });
  });

  it('keeps the Invoice Data the Assistant takes with a cash sale, and none for «Sin factura»', async () => {
    const withInvoice = await world.newClient('Factura en efectivo');
    const without = await world.newClient('Sin factura en efectivo');

    const invoiced = await cash(withInvoice.clientId, company);
    const plain = await cash(without.clientId, null);

    await expect(stored(invoiced.id)).resolves.toMatchObject({
      invoiceTaxId: '1020304050',
      invoiceName: 'Estudio Ana SRL',
    });
    await expect(stored(plain.id)).resolves.toMatchObject({
      invoiceTaxId: null,
      invoiceName: null,
    });
  });

  it('prefills from the latest sale that carried Invoice Data, skipping a later «Sin factura»', async () => {
    const buyer = await world.newClient('Clienta frecuente');
    await expect(invoices().lastFor(buyer.clientId)).resolves.toBeNull();

    await cash(buyer.clientId, ana, now);
    await cash(buyer.clientId, company, new Date(now.getTime() + 40 * day));
    await cash(buyer.clientId, null, new Date(now.getTime() + 80 * day));

    await expect(invoices().lastFor(buyer.clientId)).resolves.toEqual(company);
  });

  it('refuses half the Invoice Data and any rewrite, but lets the closure erase it', async () => {
    const buyer = await world.newClient('Datos protegidos');
    const payment = await cash(buyer.clientId, ana);

    await expect(
      world.prisma
        .$executeRaw`UPDATE booking.payments SET invoice_tax_id = '999' WHERE id = ${payment.id}::uuid`,
    ).rejects.toThrow(/invoice data is immutable/);
    await expect(
      world.prisma
        .$executeRaw`UPDATE booking.payments SET invoice_name = NULL WHERE id = ${payment.id}::uuid`,
    ).rejects.toThrow(/payments_invoice_data_check/);
    await world.prisma
      .$executeRaw`UPDATE booking.payments SET invoice_tax_id = NULL, invoice_name = NULL WHERE id = ${payment.id}::uuid`;
    await expect(stored(payment.id)).resolves.toMatchObject({
      invoiceTaxId: null,
      invoiceName: null,
    });
  });

  it('marks and unmarks «Factura emitida», recording who and when and auditing both', async () => {
    const buyer = await world.newClient('Factura emitida');
    const payment = await cash(buyer.clientId, ana);
    const markedAt = new Date(now.getTime() + 2 * hour);
    const unmarkedAt = new Date(now.getTime() + 3 * hour);

    await expect(
      invoices().setIssued({
        paymentId: payment.id,
        issued: true,
        principal: administrator,
        now: markedAt,
      }),
    ).resolves.toEqual({
      paymentId: payment.id,
      invoiceIssued: { issuedAt: markedAt, issuedByName: 'Paola Mendoza' },
    });
    await expect(stored(payment.id)).resolves.toMatchObject({
      invoiceIssuedAt: markedAt,
      invoiceIssuedByAccountId: administrator.accountId,
    });
    // Marking twice changes nothing and writes no second record.
    await invoices().setIssued({
      paymentId: payment.id,
      issued: true,
      principal: administrator,
      now: unmarkedAt,
    });
    await expect(stored(payment.id)).resolves.toMatchObject({
      invoiceIssuedAt: markedAt,
    });

    await expect(
      invoices().setIssued({
        paymentId: payment.id,
        issued: false,
        principal: administrator,
        now: unmarkedAt,
      }),
    ).resolves.toEqual({ paymentId: payment.id, invoiceIssued: null });
    await expect(stored(payment.id)).resolves.toMatchObject({
      invoiceIssuedAt: null,
      invoiceIssuedByAccountId: null,
    });

    const records = await world.prisma.auditRecord.findMany({
      where: {
        targetId: payment.id,
        actionCode: { startsWith: 'payment.invoice' },
      },
      orderBy: { occurredAt: 'asc' },
    });
    expect(records).toEqual([
      expect.objectContaining({
        actionCode: 'payment.invoice_issued_marked',
        actorAccountId: administrator.accountId,
        actorRole: 'ADMINISTRATOR',
        targetType: 'payment',
        occurredAt: markedAt,
        metadata: { method: 'cash', hasInvoiceData: true },
      }),
      expect.objectContaining({
        actionCode: 'payment.invoice_issued_unmarked',
        actorAccountId: administrator.accountId,
        occurredAt: unmarkedAt,
        metadata: {
          method: 'cash',
          hasInvoiceData: true,
          previousIssuedAt: markedAt.toISOString(),
        },
      }),
    ]);
  });

  it('marks only a confirmed sale that exists', async () => {
    const buyer = await world.newClient('Transferencia por revisar');
    const pending = await transfer(buyer, ana);

    await expect(
      issueError(
        invoices().setIssued({
          paymentId: pending.id,
          issued: true,
          principal: administrator,
          now,
        }),
      ),
    ).resolves.toBe('payment_not_confirmed');
    await expect(
      issueError(
        invoices().setIssued({
          paymentId: randomUUID(),
          issued: true,
          principal: administrator,
          now,
        }),
      ),
    ).resolves.toBe('payment_not_found');
  });

  it('lists cash sales beside transfers with their Invoice Data, and filters the confirmed sales still unbilled', async () => {
    const billed = await world.newClient('Lista facturada');
    const unbilled = await world.newClient('Lista por facturar');
    const noInvoice = await world.newClient('Lista sin factura');
    const billedPayment = await cash(billed.clientId, company);
    const unbilledPayment = await cash(unbilled.clientId, ana);
    await cash(noInvoice.clientId, null);
    await invoices().setIssued({
      paymentId: billedPayment.id,
      issued: true,
      principal: administrator,
      now,
    });
    const ledger = createPrismaAdministratorPayments(world.prisma);

    const unbilledPage = await ledger.list({
      page: 1,
      pageSize: 100,
      status: 'all',
      invoice: 'unissued',
    });
    const all = await ledger.list({
      page: 1,
      pageSize: 100,
      status: 'all',
      invoice: 'all',
    });

    const unbilledIds = unbilledPage.items.map((item) => item.id);
    expect(unbilledIds).toContain(unbilledPayment.id);
    expect(unbilledIds).not.toContain(billedPayment.id);
    expect(
      unbilledPage.items.every(
        (item) =>
          item.state === 'confirmed' &&
          item.invoiceData !== null &&
          item.invoiceIssued === null,
      ),
    ).toBe(true);
    expect(unbilledPage.totalItems).toBe(unbilledPage.items.length);
    expect(
      all.items.find((item) => item.id === billedPayment.id),
    ).toMatchObject({
      clientName: 'Lista facturada',
      method: 'cash',
      state: 'confirmed',
      invoiceData: company,
      invoiceIssued: { issuedAt: now, issuedByName: 'Paola Mendoza' },
    });
    expect(
      all.items.find((item) => item.clientName === 'Lista sin factura'),
    ).toMatchObject({ method: 'cash', invoiceData: null, invoiceIssued: null });
  });
});
