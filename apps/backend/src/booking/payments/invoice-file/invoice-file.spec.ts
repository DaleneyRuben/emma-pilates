import type { AuthenticatedPrincipal } from '../../../system-identity/authentication/resolve-authenticated-principal';
import { BookingAccessDeniedError } from '../../commands/create-booking';
import {
  attachPaymentInvoice,
  invoiceFileNameMaxLength,
  listClientInvoices,
  listStaffInvoices,
  normalizeInvoiceFileName,
  removePaymentInvoice,
  type InvoiceFileGateway,
} from './invoice-file';

const now = new Date('2026-11-05T14:42:00.000Z');

const staff = (
  role:
    'administrator' | 'coordinator' | 'assistant' | 'trainer' | 'nutritionist',
): AuthenticatedPrincipal => ({
  accountId: `account-${role}`,
  authenticationSessionId: 'session-1',
  identity: {
    kind: 'staff',
    staffMemberId: `staff-${role}`,
    role,
    branchIds: [],
  },
});

const client: AuthenticatedPrincipal = {
  accountId: 'account-client',
  authenticationSessionId: 'session-2',
  identity: { kind: 'client', clientId: 'client-1' },
};

const gatewayStub = (): jest.Mocked<InvoiceFileGateway> => ({
  attach: jest.fn().mockResolvedValue({ paymentId: 'payment-1' }),
  remove: jest.fn().mockResolvedValue({ paymentId: 'payment-1' }),
  read: jest.fn(),
  listForStaff: jest.fn().mockResolvedValue([]),
  listForClient: jest.fn().mockResolvedValue([]),
  readFileForStaff: jest.fn(),
  readFileForClient: jest.fn(),
});

describe('who handles invoice files', () => {
  it.each(['administrator', 'coordinator', 'assistant'] as const)(
    'lets the %s upload, remove and list invoices',
    async (role) => {
      const gateway = gatewayStub();
      const principal = staff(role);

      await attachPaymentInvoice(
        { paymentId: 'payment-1', imageAssetId: 'asset-1', fileName: 'f.pdf' },
        principal,
        { gateway, now: () => now },
      );
      await removePaymentInvoice({ paymentId: 'payment-1' }, principal, {
        gateway,
        now: () => now,
      });
      await listStaffInvoices({ filter: 'pending' }, principal, { gateway });

      expect(gateway.attach).toHaveBeenCalledWith({
        paymentId: 'payment-1',
        imageAssetId: 'asset-1',
        fileName: 'f.pdf',
        principal,
        now,
      });
      expect(gateway.remove).toHaveBeenCalledWith({
        paymentId: 'payment-1',
        principal,
        now,
      });
      expect(gateway.listForStaff).toHaveBeenCalledWith('pending');
    },
  );

  it.each([staff('trainer'), staff('nutritionist'), client])(
    'refuses anyone else',
    async (principal) => {
      const gateway = gatewayStub();

      await expect(
        attachPaymentInvoice(
          {
            paymentId: 'payment-1',
            imageAssetId: 'asset-1',
            fileName: 'f.pdf',
          },
          principal,
          { gateway, now: () => now },
        ),
      ).rejects.toBeInstanceOf(BookingAccessDeniedError);
      await expect(
        removePaymentInvoice({ paymentId: 'payment-1' }, principal, {
          gateway,
          now: () => now,
        }),
      ).rejects.toBeInstanceOf(BookingAccessDeniedError);
      await expect(
        listStaffInvoices({ filter: 'uploaded' }, principal, { gateway }),
      ).rejects.toBeInstanceOf(BookingAccessDeniedError);
      expect(gateway.attach).not.toHaveBeenCalled();
      expect(gateway.remove).not.toHaveBeenCalled();
    },
  );

  it('shows a Client only her own invoices', async () => {
    const gateway = gatewayStub();

    await listClientInvoices(client, { gateway });

    expect(gateway.listForClient).toHaveBeenCalledWith('client-1');
    await expect(
      listClientInvoices(staff('administrator'), { gateway }),
    ).rejects.toBeInstanceOf(BookingAccessDeniedError);
  });
});

describe('normalizeInvoiceFileName', () => {
  it('keeps a plain file name', () => {
    expect(
      normalizeInvoiceFileName('factura-000123.pdf', 'application/pdf'),
    ).toBe('factura-000123.pdf');
  });

  it('drops folders, control characters and surrounding spaces', () => {
    expect(
      normalizeInvoiceFileName(
        '  /var/mobile/tmp/Factura\u0000 Mariana.PDF ',
        'application/pdf',
      ),
    ).toBe('Factura Mariana.PDF');
    expect(normalizeInvoiceFileName('C:\\fotos\\IMG_1.jpg', 'image/jpeg')).toBe(
      'IMG_1.jpg',
    );
  });

  it('names an unnamed file after its kind', () => {
    expect(normalizeInvoiceFileName(undefined, 'application/pdf')).toBe(
      'factura.pdf',
    );
    expect(normalizeInvoiceFileName('   ', 'image/png')).toBe('factura.png');
    expect(normalizeInvoiceFileName('', 'image/jpeg')).toBe('factura.jpg');
  });

  it('shortens a long name and keeps its extension', () => {
    const name = normalizeInvoiceFileName(
      `${'a'.repeat(300)}.pdf`,
      'application/pdf',
    );

    expect(name).toHaveLength(invoiceFileNameMaxLength);
    expect(name.endsWith('.pdf')).toBe(true);
  });
});
