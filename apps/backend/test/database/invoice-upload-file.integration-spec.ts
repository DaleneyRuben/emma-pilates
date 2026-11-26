import { jest } from '@jest/globals';
import { InvoiceFileError } from '../../src/booking/payments/invoice-file/invoice-file';
import { createPrismaInvoiceFile } from '../../src/booking/payments/invoice-file/prisma-invoice-file';
import type { NotificationRecorder } from '../../src/notifications/prisma-notification-store';
import type { AuthenticatedPrincipal } from '../../src/system-identity/authentication/resolve-authenticated-principal';
import {
  createInvoiceAsset,
  type InvoiceAssetOptions,
} from './invoice-asset-test-support';
import {
  now,
  startPaymentWorld,
  type PaymentWorld,
} from './payment-lifecycle-test-support';

const failure = async (work: Promise<unknown>): Promise<string> => {
  try {
    await work;
    return 'resolved';
  } catch (error) {
    return error instanceof InvoiceFileError ? error.code : String(error);
  }
};

// Walkthrough n.º 24 (E-D29): the PDF she chose is uploaded at once and read
// back, page by page, before «Subir factura» attaches it. Only the Staff
// Member who uploaded it reads it, and only until it is attached.
describe('An invoice file before it is attached (PostgreSQL)', () => {
  let world: PaymentWorld;
  let administrator: AuthenticatedPrincipal;
  let assistant: AuthenticatedPrincipal;
  const invoices = () =>
    createPrismaInvoiceFile(world.prisma, {
      recordNotification: jest.fn<NotificationRecorder>(),
    });
  const asset = (
    owner: AuthenticatedPrincipal,
    options?: InvoiceAssetOptions,
  ) => createInvoiceAsset(world.prisma, owner.accountId, options);

  beforeAll(async () => {
    world = await startPaymentWorld();
    administrator = await world.staffPrincipal('paola.mendoza@example.com');
    assistant = await world.staffPrincipal('camila.rojas@example.com');
  });

  afterAll(async () => {
    await world?.stop();
  });

  it('reads the uploader her own ready PDF', async () => {
    const id = await asset(assistant);

    await expect(
      invoices().readUploadedFile({
        imageAssetId: id,
        accountId: assistant.accountId,
      }),
    ).resolves.toEqual({
      objectKey: `private/invoice/${id}/document`,
      mediaType: 'application/pdf',
      fileName: 'factura.pdf',
    });
  });

  it('never reads another Account’s file, an attached one, or a removed one', async () => {
    const cases: [AuthenticatedPrincipal, InvoiceAssetOptions][] = [
      [administrator, {}],
      [assistant, { state: 'ATTACHED' }],
      [assistant, { state: 'PROCESSING' }],
      [assistant, { purpose: 'TRANSFER_RECEIPT' }],
      [assistant, { deletedAt: now }],
    ];
    for (const [owner, options] of cases) {
      const id = await asset(owner, options);
      expect(
        await failure(
          invoices().readUploadedFile({
            imageAssetId: id,
            accountId: assistant.accountId,
          }),
        ),
      ).toBe('invoice_not_found');
    }
  });
});
