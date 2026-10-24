import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import {
  readTrainerReferralCode,
  setTrainerReferralCode,
  type TrainerReferralCodeStore,
} from './trainer-referral-code';

const staff = (
  role: 'administrator' | 'assistant' | 'trainer' | 'nutritionist',
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
const administrator = staff('administrator');
const now = new Date('2026-10-23T15:00:00.000Z');

const carla = {
  staffMemberId: 'carla-id',
  role: 'trainer' as const,
  referralCode: null,
};

const store = (
  member: {
    staffMemberId: string;
    role: string;
    referralCode: string | null;
  } | null = carla,
): jest.Mocked<TrainerReferralCodeStore> => ({
  find: jest.fn().mockResolvedValue(member),
  set: jest.fn((input: Parameters<TrainerReferralCodeStore['set']>[0]) =>
    Promise.resolve({
      staffMemberId: input.staffMemberId,
      referralCode: input.referralCode,
    }),
  ),
});

const deps = (codes: TrainerReferralCodeStore) => ({
  store: codes,
  now: () => now,
});

describe('A Trainer’s personal Referral Code (BKM-011)', () => {
  it('lets the Administrator give a Trainer her code, stored upper case', async () => {
    const codes = store();

    await expect(
      setTrainerReferralCode(
        { staffMemberId: 'carla-id', referralCode: ' carla ' },
        administrator,
        deps(codes),
      ),
    ).resolves.toEqual({ staffMemberId: 'carla-id', referralCode: 'CARLA' });
    expect(codes.set).toHaveBeenCalledWith({
      staffMemberId: 'carla-id',
      referralCode: 'CARLA',
      previousReferralCode: null,
      actorAccountId: 'administrator-account',
      occurredAt: now,
    });
  });

  it('lets the Administrator remove the code', async () => {
    const codes = store({ ...carla, referralCode: 'CARLA' });

    await setTrainerReferralCode(
      { staffMemberId: 'carla-id', referralCode: null },
      administrator,
      deps(codes),
    );

    expect(codes.set).toHaveBeenCalledWith(
      expect.objectContaining({
        referralCode: null,
        previousReferralCode: 'CARLA',
      }),
    );
  });

  it('reads the code for the Trainer’s panel', async () => {
    await expect(
      readTrainerReferralCode(
        { staffMemberId: 'carla-id' },
        administrator,
        deps(store({ ...carla, referralCode: 'CARLA' })),
      ),
    ).resolves.toEqual({ staffMemberId: 'carla-id', referralCode: 'CARLA' });
  });

  it('refuses a malformed code or one with the Client prefix', async () => {
    for (const referralCode of ['C', 'REF-CARLA', 'CAR LA']) {
      const codes = store();
      await expect(
        setTrainerReferralCode(
          { staffMemberId: 'carla-id', referralCode },
          administrator,
          deps(codes),
        ),
      ).rejects.toMatchObject({ code: 'referral_code_malformed' });
      expect(codes.set).not.toHaveBeenCalled();
    }
  });

  it('gives a code only to a Trainer', async () => {
    const codes = store({ ...carla, role: 'assistant' });

    await expect(
      setTrainerReferralCode(
        { staffMemberId: 'carla-id', referralCode: 'ANA' },
        administrator,
        deps(codes),
      ),
    ).rejects.toMatchObject({ code: 'staff_member_not_trainer' });
    expect(codes.set).not.toHaveBeenCalled();
  });

  it('reports a Staff Member that does not exist', async () => {
    await expect(
      setTrainerReferralCode(
        { staffMemberId: 'gone', referralCode: 'ANA' },
        administrator,
        deps(store(null)),
      ),
    ).rejects.toMatchObject({ code: 'staff_member_not_found' });
  });

  it.each([staff('assistant'), staff('trainer'), staff('nutritionist')])(
    'denies the code to every other Role (%#)',
    async (principal) => {
      const codes = store();

      await expect(
        setTrainerReferralCode(
          { staffMemberId: 'carla-id', referralCode: 'CARLA' },
          principal,
          deps(codes),
        ),
      ).rejects.toMatchObject({ code: 'acquisition_access_denied' });
      await expect(
        readTrainerReferralCode(
          { staffMemberId: 'carla-id' },
          principal,
          deps(codes),
        ),
      ).rejects.toMatchObject({ code: 'acquisition_access_denied' });
      expect(codes.find).not.toHaveBeenCalled();
    },
  );
});
