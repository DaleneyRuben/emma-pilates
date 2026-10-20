import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { AdministrationError } from '../administration/administration-errors';
import {
  exportPromotionContacts,
  listPromotionContacts,
  withdrawPromotionContact,
  type PromotionContactStore,
} from './promotion-contacts';

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

const now = new Date('2026-10-20T14:00:00.000Z');
const valeria = {
  id: 'contact-id',
  name: 'Valeria Quiroga',
  email: 'valeria@example.com',
  phone: '+591 70011005',
  consentedAt: new Date('2026-10-19T20:00:00.000Z'),
};
const page = { items: [valeria], page: 1, pageSize: 20, totalItems: 1 };

const storeWith = (
  overrides: Partial<PromotionContactStore> = {},
): PromotionContactStore => ({
  list: jest.fn().mockResolvedValue(page),
  listAll: jest.fn().mockResolvedValue([valeria]),
  recordExport: jest.fn().mockResolvedValue(undefined),
  withdraw: jest.fn().mockResolvedValue(true),
  ...overrides,
});

const refusedFor = async (work: () => Promise<unknown>) => {
  await expect(work()).rejects.toEqual(
    new AdministrationError('administration_access_denied'),
  );
};

describe('listPromotionContacts', () => {
  it('passes the trimmed search and paging to the store', async () => {
    const store = storeWith();
    await expect(
      listPromotionContacts(
        { page: 2, pageSize: 10, query: '  vale ' },
        administrator,
        { store, now: () => now },
      ),
    ).resolves.toEqual(page);
    expect(store.list).toHaveBeenCalledWith({
      page: 2,
      pageSize: 10,
      query: 'vale',
    });
  });

  it('drops a blank search', async () => {
    const store = storeWith();
    await listPromotionContacts(
      { page: 1, pageSize: 20, query: '   ' },
      administrator,
      { store, now: () => now },
    );
    expect(store.list).toHaveBeenCalledWith({ page: 1, pageSize: 20 });
  });

  it.each(['assistant', 'trainer', 'nutritionist'] as const)(
    'refuses a %s',
    async (role) => {
      const store = storeWith();
      await refusedFor(() =>
        listPromotionContacts({ page: 1, pageSize: 20 }, staff(role), {
          store,
          now: () => now,
        }),
      );
      expect(store.list).not.toHaveBeenCalled();
    },
  );
});

describe('exportPromotionContacts', () => {
  it('returns every live contact and audits the export', async () => {
    const store = storeWith();
    await expect(
      exportPromotionContacts(administrator, { store, now: () => now }),
    ).resolves.toEqual([valeria]);
    expect(store.recordExport).toHaveBeenCalledWith({
      actor: { accountId: 'staff-account', staffMemberId: 'staff-id' },
      contactCount: 1,
      occurredAt: now,
    });
  });

  it('refuses an Assistant without reading or auditing', async () => {
    const store = storeWith();
    await refusedFor(() =>
      exportPromotionContacts(staff('assistant'), { store, now: () => now }),
    );
    expect(store.listAll).not.toHaveBeenCalled();
    expect(store.recordExport).not.toHaveBeenCalled();
  });
});

describe('withdrawPromotionContact', () => {
  it('withdraws the contact at the current time', async () => {
    const store = storeWith();
    await withdrawPromotionContact({ contactId: 'contact-id' }, administrator, {
      store,
      now: () => now,
    });
    expect(store.withdraw).toHaveBeenCalledWith({
      contactId: 'contact-id',
      actor: { accountId: 'staff-account', staffMemberId: 'staff-id' },
      occurredAt: now,
    });
  });

  it('answers not found for a contact already withdrawn or unknown', async () => {
    const store = storeWith({ withdraw: jest.fn().mockResolvedValue(false) });
    await expect(
      withdrawPromotionContact({ contactId: 'contact-id' }, administrator, {
        store,
        now: () => now,
      }),
    ).rejects.toEqual(new AdministrationError('promotion_contact_not_found'));
  });

  it('refuses a Trainer', async () => {
    const store = storeWith();
    await refusedFor(() =>
      withdrawPromotionContact({ contactId: 'contact-id' }, staff('trainer'), {
        store,
        now: () => now,
      }),
    );
    expect(store.withdraw).not.toHaveBeenCalled();
  });
});
