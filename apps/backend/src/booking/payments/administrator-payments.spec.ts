import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { AdministrationError } from '../administration/administration-errors';
import {
  listAdministratorPayments,
  type AdministratorPaymentLedger,
} from './administrator-payments';

const staff = (
  role: 'assistant' | 'administrator' | 'trainer' | 'nutritionist',
): AuthenticatedPrincipal => ({
  accountId: 'staff-account',
  authenticationSessionId: 'authentication-session-id',
  identity: {
    kind: 'staff',
    staffMemberId: 'staff-id',
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

const emptyPage = {
  items: [],
  page: 1,
  pageSize: 20,
  totalItems: 0,
  pendingCount: 0,
};

const ledger = (): AdministratorPaymentLedger => ({
  list: jest.fn().mockResolvedValue(emptyPage),
});

describe('Administrator Payment list', () => {
  it('pages the studio’s transfer Payments for an Administrator with a trimmed search', async () => {
    const payments = ledger();

    await expect(
      listAdministratorPayments(
        { page: 2, pageSize: 10, status: 'pending', query: '  sofía  ' },
        administrator,
        { ledger: payments },
      ),
    ).resolves.toEqual(emptyPage);
    expect(payments.list).toHaveBeenCalledWith({
      page: 2,
      pageSize: 10,
      status: 'pending',
      query: 'sofía',
    });
  });

  it('drops a blank search instead of matching every name', async () => {
    const payments = ledger();

    await listAdministratorPayments(
      { page: 1, pageSize: 20, status: 'all', query: '   ' },
      administrator,
      { ledger: payments },
    );

    expect(payments.list).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      status: 'all',
    });
  });

  it.each([
    ['an Assistant', staff('assistant')],
    ['a Trainer', staff('trainer')],
    ['the Nutritionist', staff('nutritionist')],
    ['a Client', clientPrincipal],
  ])(
    'refuses %s, because Payment and receipt data is for Administrators only',
    async (_who, principal) => {
      const payments = ledger();

      await expect(
        listAdministratorPayments(
          { page: 1, pageSize: 20, status: 'all' },
          principal,
          { ledger: payments },
        ),
      ).rejects.toEqual(new AdministrationError('administration_access_denied'));
      expect(payments.list).not.toHaveBeenCalled();
    },
  );
});
