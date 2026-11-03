import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import {
  changeOwnReferralCode,
  checkReferralCodeAvailability,
  readOwnReferralCode,
  type OwnReferralCodeStore,
} from './own-referral-code';

const client: AuthenticatedPrincipal = {
  accountId: 'lucia-account',
  authenticationSessionId: 'session',
  identity: { kind: 'client', clientId: 'lucia-id' },
};
const staff = (
  role: 'trainer' | 'assistant' | 'administrator',
): AuthenticatedPrincipal => ({
  accountId: `${role}-account`,
  authenticationSessionId: 'session',
  identity: {
    kind: 'staff',
    staffMemberId: `${role}-id`,
    role,
    branchIds: [],
  },
});
const now = new Date('2026-11-03T15:00:00.000Z');
const daysAgo = (days: number) =>
  new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

const store = (
  current: { referralCode: string | null; changedAt: Date | null } | null = {
    referralCode: 'LUCIA',
    changedAt: null,
  },
  status: Awaited<ReturnType<OwnReferralCodeStore['status']>> = 'available',
): jest.Mocked<OwnReferralCodeStore> => ({
  find: jest.fn().mockResolvedValue(current),
  status: jest.fn().mockResolvedValue(status),
  change: jest.fn().mockResolvedValue(undefined),
});

const deps = (codes: OwnReferralCodeStore) => ({
  store: codes,
  now: () => now,
});

// BKM-017 (owner 2026-11-02): each Client and Trainer edits her own code.
describe('Her own Referral Code', () => {
  it('reads a Client’s code, editable now when she never changed it', async () => {
    const codes = store();

    await expect(readOwnReferralCode(client, deps(codes))).resolves.toEqual({
      referralCode: 'LUCIA',
      editableFrom: null,
    });
    expect(codes.find).toHaveBeenCalledWith({
      kind: 'client',
      clientId: 'lucia-id',
    });
  });

  it('reads a Trainer’s code and when she may change it again', async () => {
    const codes = store({ referralCode: 'DANIELA', changedAt: daysAgo(10) });

    await expect(
      readOwnReferralCode(staff('trainer'), deps(codes)),
    ).resolves.toEqual({
      referralCode: 'DANIELA',
      editableFrom: new Date(daysAgo(10).getTime() + 30 * 86_400_000),
    });
    expect(codes.find).toHaveBeenCalledWith({
      kind: 'trainer',
      staffMemberId: 'trainer-id',
    });
  });

  it('refuses every other Role', async () => {
    await expect(
      readOwnReferralCode(staff('assistant'), deps(store())),
    ).rejects.toMatchObject({ code: 'acquisition_access_denied' });
    await expect(
      changeOwnReferralCode(
        { referralCode: 'CAMILA' },
        staff('administrator'),
        deps(store()),
      ),
    ).rejects.toMatchObject({ code: 'acquisition_access_denied' });
  });

  it('changes her code, upper case, and stamps the change', async () => {
    const codes = store();

    await expect(
      changeOwnReferralCode(
        { referralCode: ' lu-pilates ' },
        client,
        deps(codes),
      ),
    ).resolves.toEqual({
      referralCode: 'LU-PILATES',
      editableFrom: new Date(now.getTime() + 30 * 86_400_000),
    });
    expect(codes.change).toHaveBeenCalledWith({
      holder: { kind: 'client', clientId: 'lucia-id' },
      referralCode: 'LU-PILATES',
      previousReferralCode: 'LUCIA',
      previousChangedAt: null,
      actorAccountId: 'lucia-account',
      occurredAt: now,
    });
  });

  it('allows one change every 30 days', async () => {
    const recent = store({ referralCode: 'LUCIA', changedAt: daysAgo(29) });
    await expect(
      changeOwnReferralCode({ referralCode: 'LUNA' }, client, deps(recent)),
    ).rejects.toMatchObject({
      code: 'referral_code_change_too_soon',
      status: 409,
    });
    expect(recent.change).not.toHaveBeenCalled();

    const old = store({ referralCode: 'LUCIA', changedAt: daysAgo(30) });
    await expect(
      changeOwnReferralCode({ referralCode: 'LUNA' }, client, deps(old)),
    ).resolves.toMatchObject({ referralCode: 'LUNA' });
  });

  it('keeps the same code without spending the change', async () => {
    const codes = store({ referralCode: 'LUCIA', changedAt: daysAgo(2) });

    await expect(
      changeOwnReferralCode({ referralCode: 'lucia' }, client, deps(codes)),
    ).resolves.toEqual({
      referralCode: 'LUCIA',
      editableFrom: new Date(daysAgo(2).getTime() + 30 * 86_400_000),
    });
    expect(codes.change).not.toHaveBeenCalled();
  });

  it.each([
    ['AB', 'referral_code_malformed', 'available'],
    ['LUCÍA', 'referral_code_malformed', 'available'],
    ['EMMA-VIP', 'referral_code_blocked', 'blocked'],
    ['SOFIA', 'referral_code_in_use', 'in_use'],
  ] as const)('refuses %p with %s', async (typed, code, status) => {
    const codes = store(undefined, status);

    await expect(
      changeOwnReferralCode({ referralCode: typed }, client, deps(codes)),
    ).rejects.toMatchObject({ code });
    expect(codes.change).not.toHaveBeenCalled();
  });

  it('answers whether a typed code is free, for live feedback', async () => {
    const holder = { kind: 'client', clientId: 'lucia-id' };

    await expect(
      checkReferralCodeAvailability({ code: 'luna' }, client, deps(store())),
    ).resolves.toEqual({ code: 'LUNA', status: 'available' });
    await expect(
      checkReferralCodeAvailability({ code: 'x' }, client, deps(store())),
    ).resolves.toEqual({ code: 'X', status: 'malformed' });
    await expect(
      checkReferralCodeAvailability({ code: 'lucia' }, client, deps(store())),
    ).resolves.toEqual({ code: 'LUCIA', status: 'current' });

    const taken = store(undefined, 'in_use');
    await expect(
      checkReferralCodeAvailability({ code: 'sofia' }, client, deps(taken)),
    ).resolves.toEqual({ code: 'SOFIA', status: 'in_use' });
    expect(taken.status).toHaveBeenCalledWith('SOFIA', holder);
  });
});
