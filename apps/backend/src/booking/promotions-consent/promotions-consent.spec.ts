import { BookingAccessDeniedError } from '../commands/create-booking';
import {
  readPromotionsConsent,
  setPromotionsConsent,
  type PromotionsConsentStore,
} from './promotions-consent';

const client = {
  accountId: 'account-id',
  authenticationSessionId: 'authentication-session-id',
  identity: { kind: 'client' as const, clientId: 'client-id' },
};
const staff = {
  ...client,
  identity: {
    kind: 'staff' as const,
    staffMemberId: 'staff-id',
    role: 'administrator' as const,
    branchIds: [],
  },
};
const now = new Date('2026-10-20T14:00:00.000Z');
const earlier = new Date('2026-10-01T12:00:00.000Z');

const storeWith = (
  overrides: Partial<PromotionsConsentStore> = {},
): jest.Mocked<PromotionsConsentStore> => ({
  findOpen: jest.fn().mockResolvedValue(null),
  give: jest.fn().mockResolvedValue(now),
  withdraw: jest.fn().mockResolvedValue(undefined),
  ...(overrides as object),
});

describe('readPromotionsConsent', () => {
  it('reads the open consent of the signed-in Client', async () => {
    const store = storeWith({ findOpen: jest.fn().mockResolvedValue(earlier) });
    await expect(
      readPromotionsConsent(client, { store, now: () => now }),
    ).resolves.toEqual({ consented: true, consentedAt: earlier });
    expect(store.findOpen).toHaveBeenCalledWith('client-id');
  });

  it('answers not consented when nothing is open', async () => {
    await expect(
      readPromotionsConsent(client, { store: storeWith(), now: () => now }),
    ).resolves.toEqual({ consented: false, consentedAt: null });
  });

  it('refuses a Staff Member', async () => {
    const store = storeWith();
    await expect(
      readPromotionsConsent(staff, { store, now: () => now }),
    ).rejects.toBeInstanceOf(BookingAccessDeniedError);
    expect(store.findOpen).not.toHaveBeenCalled();
  });
});

describe('setPromotionsConsent', () => {
  it('gives the consent now and answers with its time', async () => {
    const store = storeWith({ give: jest.fn().mockResolvedValue(earlier) });
    await expect(
      setPromotionsConsent({ consented: true }, client, {
        store,
        now: () => now,
      }),
    ).resolves.toEqual({ consented: true, consentedAt: earlier });
    expect(store.give).toHaveBeenCalledWith({
      clientId: 'client-id',
      occurredAt: now,
    });
    expect(store.withdraw).not.toHaveBeenCalled();
  });

  it('withdraws the consent now', async () => {
    const store = storeWith();
    await expect(
      setPromotionsConsent({ consented: false }, client, {
        store,
        now: () => now,
      }),
    ).resolves.toEqual({ consented: false, consentedAt: null });
    expect(store.withdraw).toHaveBeenCalledWith({
      clientId: 'client-id',
      occurredAt: now,
    });
    expect(store.give).not.toHaveBeenCalled();
  });

  it('refuses a Staff Member', async () => {
    const store = storeWith();
    await expect(
      setPromotionsConsent({ consented: true }, staff, {
        store,
        now: () => now,
      }),
    ).rejects.toBeInstanceOf(BookingAccessDeniedError);
    expect(store.give).not.toHaveBeenCalled();
  });
});
