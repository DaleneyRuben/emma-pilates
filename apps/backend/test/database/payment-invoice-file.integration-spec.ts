import { jest } from '@jest/globals';
import { randomUUID } from 'node:crypto';
import { InvoiceFileError } from '../../src/booking/payments/invoice-file/invoice-file';
import { createPrismaInvoiceFile } from '../../src/booking/payments/invoice-file/prisma-invoice-file';
import { createPrismaAdministratorPayments } from '../../src/booking/payments/prisma-administrator-payments';
import { createPrismaVoidPayment } from '../../src/booking/payments/prisma-void-payment';
import type { NotificationRecorder } from '../../src/notifications/prisma-notification-store';
import type { AuthenticatedPrincipal } from '../../src/system-identity/authentication/resolve-authenticated-principal';
import { toPrismaBytes } from '../../src/database/prisma-bytes';
import { auditActorOf } from '../../src/system-identity/authentication/audit-actor';
import {
  fixtures,
  hour,
  now,
  plan,
  startPaymentWorld,
  type PaymentWorld,
} from './payment-lifecycle-test-support';

const centro = fixtures.branches.find((b) => b.name === 'Centro')!;
const mariana = { taxId: '123456', name: 'Mariana Quiroga' };
const later = new Date(now.getTime() + hour);

const failure = async (work: Promise<unknown>): Promise<string> => {
  try {
    await work;
    return 'resolved';
  } catch (error) {
    return error instanceof InvoiceFileError ? error.code : String(error);
  }
};

// FIX-044 (owner, 2026-11-05): the issued invoice is uploaded on a confirmed
// payment that carries Invoice Data, marks it «Factura emitida», reaches the
// Client in «Mis facturas», and is replaced or removed without deleting it.
describe('Invoice files (PostgreSQL)', () => {
  let world: PaymentWorld;
  let administrator: AuthenticatedPrincipal;
  let coordinator: AuthenticatedPrincipal;
  let assistant: AuthenticatedPrincipal;
  const recordNotification = jest.fn<NotificationRecorder>();
  const invoices = () =>
    createPrismaInvoiceFile(world.prisma, { recordNotification });

  const cash = (
    clientId: string,
    invoiceData: { taxId: string; name: string } | null,
  ) =>
    world
      .commands(now)
      .recordCashPayment(
        { clientId, planId: plan.id, branchId: centro.id, invoiceData },
        assistant,
        randomUUID(),
      );

  const invoiceAsset = async (
    ownerAccountId: string,
    options: {
      state?: 'READY' | 'PROCESSING';
      purpose?: 'INVOICE' | 'TRANSFER_RECEIPT';
      mediaType?: 'PDF' | 'JPEG';
    } = {},
  ) => {
    const id = randomUUID();
    const mediaType = options.mediaType ?? 'PDF';
    await world.prisma.imageAsset.create({
      data: {
        id,
        ownerAccountId,
        purpose: options.purpose ?? 'INVOICE',
        state: options.state ?? 'READY',
        pendingObjectKey: `pending/invoice/${id}`,
        declaredMediaType: mediaType,
        declaredByteSize: 2_048,
        declaredChecksum: toPrismaBytes(Buffer.alloc(32, 2)),
        verifiedMediaType: mediaType,
        verifiedByteSize: 2_048,
        verifiedChecksum: toPrismaBytes(Buffer.alloc(32, 2)),
        verifiedWidth: mediaType === 'PDF' ? 0 : 800,
        verifiedHeight: mediaType === 'PDF' ? 0 : 1_200,
        createdAt: now,
        expiresAt: new Date(now.getTime() + 15 * 60 * 1_000),
        finalizedAt: now,
        deletionDueAt: new Date(now.getTime() + 72 * hour),
      },
    });
    if (mediaType === 'PDF') {
      await world.prisma.imageVariant.create({
        data: {
          imageAssetId: id,
          kind: 'DOCUMENT',
          visibility: 'PRIVATE',
          storageKey: `private/invoice/${id}/document`,
          mediaType: 'PDF',
          byteSize: 2_048,
          width: 0,
          height: 0,
        },
      });
    }
    return id;
  };

  const upload = async (
    paymentId: string,
    principal: AuthenticatedPrincipal,
    at: Date = now,
  ) =>
    invoices().attach({
      paymentId,
      imageAssetId: await invoiceAsset(principal.accountId),
      fileName: 'factura-000123.pdf',
      principal,
      now: at,
    });

  const audits = (paymentId: string) =>
    world.prisma.auditRecord.findMany({
      where: { targetType: 'payment', targetId: paymentId },
      orderBy: { occurredAt: 'asc' },
      select: { actionCode: true, actorAccountId: true, metadata: true },
    });

  beforeAll(async () => {
    world = await startPaymentWorld();
    administrator = await world.staffPrincipal('paola.mendoza@example.com');
    coordinator = await world.staffPrincipal('carolina.rivas@example.com');
    assistant = await world.staffPrincipal('camila.rojas@example.com');
  });

  beforeEach(() => recordNotification.mockReset());

  afterAll(async () => {
    await world?.stop();
  });

  it('uploads the invoice, marks the payment issued, and tells the Client', async () => {
    const buyer = await world.newClient('Mariana Quiroga');
    const payment = await cash(buyer.clientId, mariana);

    const view = await upload(payment.id, assistant);

    expect(view).toMatchObject({
      paymentId: payment.id,
      clientName: 'Mariana Quiroga',
      invoiceData: mariana,
      invoiceIssued: { issuedAt: now, issuedByName: 'Camila Rojas' },
      file: {
        fileName: 'factura-000123.pdf',
        mediaType: 'application/pdf',
        byteSize: 2_048,
        uploadedAt: now,
        uploadedByName: 'Camila Rojas',
      },
    });
    await expect(audits(payment.id)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actionCode: 'payment.invoice_uploaded',
          actorAccountId: assistant.accountId,
        }),
      ]),
    );
    expect(recordNotification).toHaveBeenCalledTimes(1);
    expect(recordNotification.mock.calls[0][1]).toMatchObject({
      accountId: buyer.accountId,
      category: 'subscription_payment',
      type: 'invoice_ready',
      title: 'Tu factura está lista',
      destination: { type: 'invoice', id: payment.id },
    });
    await expect(
      invoices().listForClient(buyer.clientId),
    ).resolves.toMatchObject([
      { paymentId: payment.id, state: 'ready', voided: false },
    ]);
  });

  it('refuses a payment that is not confirmed, has no Invoice Data, or a file that is not a ready invoice', async () => {
    const buyer = await world.newClient('Sin datos');
    const plain = await cash(buyer.clientId, null);
    const invoiced = await cash(
      (await world.newClient('Con datos')).clientId,
      mariana,
    );

    expect(await failure(upload(plain.id, administrator))).toBe(
      'payment_without_invoice_data',
    );
    expect(await failure(upload(randomUUID(), administrator))).toBe(
      'payment_not_found',
    );
    for (const asset of [
      await invoiceAsset(coordinator.accountId),
      await invoiceAsset(administrator.accountId, { state: 'PROCESSING' }),
      await invoiceAsset(administrator.accountId, {
        purpose: 'TRANSFER_RECEIPT',
      }),
    ]) {
      expect(
        await failure(
          invoices().attach({
            paymentId: invoiced.id,
            imageAssetId: asset,
            fileName: 'f.pdf',
            principal: administrator,
            now,
          }),
        ),
      ).toBe('invoice_file_not_attachable');
    }
    expect(recordNotification).not.toHaveBeenCalled();
  });

  it('refuses a voided payment but keeps showing its invoice to the Client', async () => {
    const buyer = await world.newClient('Anulada');
    const payment = await cash(buyer.clientId, mariana);
    await upload(payment.id, coordinator);
    await createPrismaVoidPayment(world.prisma, {
      recordNotification: jest.fn<NotificationRecorder>(),
    }).voidPayment({
      paymentId: payment.id,
      reason: 'Venta duplicada',
      actor: auditActorOf(administrator),
      now: later,
    });

    expect(await failure(upload(payment.id, administrator, later))).toBe(
      'payment_voided',
    );
    expect(
      await failure(
        invoices().remove({
          paymentId: payment.id,
          principal: administrator,
          now: later,
        }),
      ),
    ).toBe('payment_voided');
    await expect(
      invoices().listForClient(buyer.clientId),
    ).resolves.toMatchObject([{ state: 'ready', voided: true }]);
  });

  it('replaces the invoice and keeps the earlier one hidden', async () => {
    const buyer = await world.newClient('Reemplazo');
    const payment = await cash(buyer.clientId, mariana);
    await upload(payment.id, assistant);

    const view = await upload(payment.id, administrator, later);

    expect(view.invoiceIssued).toEqual({
      issuedAt: later,
      issuedByName: 'Paola Mendoza',
    });
    const rows = await world.prisma.paymentInvoice.findMany({
      where: { paymentId: payment.id },
      orderBy: { uploadedAt: 'asc' },
      select: {
        removedAt: true,
        removalReason: true,
        removedByAccountId: true,
        imageAsset: { select: { state: true, deletedAt: true } },
      },
    });
    expect(rows).toEqual([
      {
        removedAt: later,
        removalReason: 'replaced',
        removedByAccountId: administrator.accountId,
        imageAsset: { state: 'ATTACHED', deletedAt: null },
      },
      {
        removedAt: null,
        removalReason: null,
        removedByAccountId: null,
        imageAsset: { state: 'ATTACHED', deletedAt: null },
      },
    ]);
    expect(recordNotification).toHaveBeenCalledTimes(2);
  });

  it('removes the invoice: hidden, the mark cleared, the Client sees it in preparation', async () => {
    const buyer = await world.newClient('Quitada');
    const payment = await cash(buyer.clientId, mariana);
    await upload(payment.id, assistant);

    const view = await invoices().remove({
      paymentId: payment.id,
      principal: coordinator,
      now: later,
    });

    expect(view).toMatchObject({ invoiceIssued: null, file: null });
    await expect(
      world.prisma.paymentInvoice.findFirstOrThrow({
        where: { paymentId: payment.id },
        select: { removalReason: true, removedByAccountId: true },
      }),
    ).resolves.toEqual({
      removalReason: 'removed',
      removedByAccountId: coordinator.accountId,
    });
    await expect(audits(payment.id)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ actionCode: 'payment.invoice_removed' }),
      ]),
    );
    await expect(
      invoices().listForClient(buyer.clientId),
    ).resolves.toMatchObject([{ state: 'preparing', file: null }]);
    expect(
      await failure(
        invoices().remove({
          paymentId: payment.id,
          principal: coordinator,
          now: later,
        }),
      ),
    ).toBe('invoice_not_found');
  });

  it('lists the payments still waiting for their invoice, and the uploaded ones', async () => {
    const waiting = await cash(
      (await world.newClient('Espera factura')).clientId,
      mariana,
    );
    const done = await cash(
      (await world.newClient('Ya tiene factura')).clientId,
      mariana,
    );
    const none = await cash((await world.newClient('No pidió')).clientId, null);
    // A mark set before FIX-044 has no file, so it still waits for one.
    const oldMark = await cash(
      (await world.newClient('Marca antigua')).clientId,
      mariana,
    );
    await world.prisma.payment.update({
      where: { id: oldMark.id },
      data: {
        invoiceIssuedAt: now,
        invoiceIssuedByAccountId: administrator.accountId,
      },
    });
    await upload(done.id, assistant);

    const pending = (await invoices().listForStaff('pending')).map(
      (row) => row.paymentId,
    );
    const uploaded = (await invoices().listForStaff('uploaded')).map(
      (row) => row.paymentId,
    );

    expect(pending).toContain(waiting.id);
    expect(pending).toContain(oldMark.id);
    expect(pending).not.toContain(done.id);
    expect(pending).not.toContain(none.id);
    expect(uploaded).toContain(done.id);
    expect(uploaded).not.toContain(waiting.id);
  });

  it('serves the file to staff and to its own Client only', async () => {
    const buyer = await world.newClient('Descarga');
    const other = await world.newClient('Otra clienta');
    const payment = await cash(buyer.clientId, mariana);
    await upload(payment.id, administrator);

    const staffFile = await invoices().readFileForStaff(payment.id);
    const clientFile = await invoices().readFileForClient({
      paymentId: payment.id,
      clientId: buyer.clientId,
    });

    expect(staffFile).toMatchObject({
      mediaType: 'application/pdf',
      fileName: 'factura-000123.pdf',
    });
    expect(staffFile.objectKey).toMatch(/^private\/invoice\/.+\/document$/);
    expect(clientFile).toEqual(staffFile);
    expect(
      await failure(
        invoices().readFileForClient({
          paymentId: payment.id,
          clientId: other.clientId,
        }),
      ),
    ).toBe('invoice_not_found');
  });

  it('shows the file in the Administrator payment list', async () => {
    const buyer = await world.newClient('Lista de pagos');
    const payment = await cash(buyer.clientId, mariana);
    await upload(payment.id, assistant);

    const page = await createPrismaAdministratorPayments(world.prisma).list({
      page: 1,
      pageSize: 50,
      status: 'all',
      invoice: 'all',
      query: undefined,
      clientId: buyer.clientId,
    });

    expect(page.items[0]).toMatchObject({
      id: payment.id,
      invoiceFile: {
        fileName: 'factura-000123.pdf',
        mediaType: 'application/pdf',
        uploadedByName: 'Camila Rojas',
      },
    });
  });
});
