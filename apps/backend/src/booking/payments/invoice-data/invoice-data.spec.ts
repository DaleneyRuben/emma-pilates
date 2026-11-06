import type { AuthenticatedPrincipal } from '../../../system-identity/authentication/resolve-authenticated-principal';
import { BookingAccessDeniedError } from '../../commands/create-booking';
import {
  normalizeInvoiceData,
  readAssistantLastInvoiceData,
  readClientLastInvoiceData,
  type InvoiceDataGateway,
} from './invoice-data';

const staff = (
  role: 'assistant' | 'administrator' | 'trainer' | 'nutritionist',
): AuthenticatedPrincipal => ({
  accountId: `${role}-account`,
  authenticationSessionId: 'authentication-session-id',
  identity: {
    kind: 'staff',
    staffMemberId: `${role}-id`,
    role,
    branchIds: role === 'administrator' ? [] : ['branch-centro'],
  },
});
const administrator = staff('administrator');
const clientPrincipal: AuthenticatedPrincipal = {
  accountId: 'client-account',
  authenticationSessionId: 'authentication-session-id',
  identity: { kind: 'client', clientId: 'client-id' },
};

const gateway = (): jest.Mocked<InvoiceDataGateway> => ({
  lastFor: jest.fn().mockResolvedValue({ taxId: '4567891', name: 'Ana Pérez' }),
});

describe('Invoice Data on a sale', () => {
  it('keeps a NIT or CI and a name, trimmed, with the tax identity upper-cased and without spaces', () => {
    expect(
      normalizeInvoiceData({ taxId: ' 4567891 - 1a ', name: '  Ana   Pérez ' }),
    ).toEqual({ taxId: '4567891-1A', name: 'Ana Pérez' });
  });

  it('reads «Sin factura» as no Invoice Data', () => {
    expect(normalizeInvoiceData(null)).toBeNull();
    expect(normalizeInvoiceData(undefined)).toBeNull();
  });

  it.each([
    ['an empty tax identity', { taxId: '  ', name: 'Ana Pérez' }],
    ['an empty name', { taxId: '4567891', name: '   ' }],
    ['a tax identity without digits', { taxId: 'ABC', name: 'Ana Pérez' }],
    ['a tax identity with symbols', { taxId: '45678/91', name: 'Ana Pérez' }],
    [
      'a tax identity over 20 characters',
      { taxId: '1'.repeat(21), name: 'Ana' },
    ],
    ['a name over 120 characters', { taxId: '4567891', name: 'a'.repeat(121) }],
  ])('refuses %s', (_case, value) => {
    expect(normalizeInvoiceData(value)).toBe('invalid');
  });
});

describe('the last Invoice Data a Client used', () => {
  it('prefills the Client’s own purchase from her last sale', async () => {
    const invoices = gateway();

    await expect(
      readClientLastInvoiceData(clientPrincipal, { gateway: invoices }),
    ).resolves.toEqual({ taxId: '4567891', name: 'Ana Pérez' });
    expect(invoices.lastFor).toHaveBeenCalledWith('client-id');
  });

  it('is only the Client’s own', async () => {
    await expect(
      readClientLastInvoiceData(administrator, { gateway: gateway() }),
    ).rejects.toBeInstanceOf(BookingAccessDeniedError);
  });

  it.each([
    ['an Assistant', staff('assistant')],
    ['an Administrator', administrator],
  ])('prefills a cash sale for %s', async (_who, principal) => {
    const invoices = gateway();

    await expect(
      readAssistantLastInvoiceData({ clientId: 'client-id' }, principal, {
        gateway: invoices,
      }),
    ).resolves.toEqual({ taxId: '4567891', name: 'Ana Pérez' });
    expect(invoices.lastFor).toHaveBeenCalledWith('client-id');
  });

  it.each([
    ['a Trainer', staff('trainer')],
    ['the Nutritionist', staff('nutritionist')],
    ['a Client', clientPrincipal],
  ])('refuses %s at the front desk', async (_who, principal) => {
    const invoices = gateway();

    await expect(
      readAssistantLastInvoiceData({ clientId: 'client-id' }, principal, {
        gateway: invoices,
      }),
    ).rejects.toBeInstanceOf(BookingAccessDeniedError);
    expect(invoices.lastFor).not.toHaveBeenCalled();
  });
});
