import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { AdministrationError } from '../administration/administration-errors';
import {
  isInsideCancellationWindow,
  StudioSettingsError,
  updateStudioSettings,
  type StudioSettings,
} from './studio-settings';

const administrator: AuthenticatedPrincipal = {
  accountId: 'administrator-account',
  authenticationSessionId: 'session',
  identity: {
    kind: 'staff',
    staffMemberId: 'administrator-staff',
    role: 'administrator',
    branchIds: [],
  },
};

const current: StudioSettings = {
  version: 1,
  cancellationWindowMinutes: 150,
  minimumBookings: 2,
  minimumBookingsCheckLeadMinutes: 180,
  startDateLimitDays: 14,
  founderPlaces: 40,
  founderDiscountPercent: 15,
  founderGapDays: 7,
  guestPassesPerClient: 1,
  invitesPerHostPerMonth: 1,
  inviteRewardClasses: 1,
  taxRatePercent: 16,
  evaluationPriceCentavos: 7_000,
  nutritionistFeeCentavos: 5_000,
  renewalTargetMonths1To6Percent: 80,
  renewalTargetMonths7To12Percent: 85,
  renewalTargetFromMonth13Percent: 90,
  openingDate: null,
};

const editable = {
  minimumBookings: 2,
  taxRatePercent: 16,
  renewalTargetMonths1To6Percent: 80,
  renewalTargetMonths7To12Percent: 85,
  renewalTargetFromMonth13Percent: 90,
  openingDate: null,
};

const dependencies = (principal: AuthenticatedPrincipal = administrator) => {
  const saveVersion = jest.fn((next: StudioSettings) => Promise.resolve(next));
  return {
    principal,
    loadCurrent: jest.fn(() => Promise.resolve(current)),
    saveVersion,
  };
};

describe('isInsideCancellationWindow', () => {
  const now = new Date('2026-10-23T12:00:00Z');

  it('is inside at the window boundary and outside a millisecond earlier', () => {
    expect(
      isInsideCancellationWindow(new Date('2026-10-23T14:30:00Z'), now, 150),
    ).toBe(true);
    expect(
      isInsideCancellationWindow(
        new Date('2026-10-23T14:30:00.001Z'),
        now,
        150,
      ),
    ).toBe(false);
  });

  it('follows the configured length', () => {
    const startsAt = new Date('2026-10-23T15:00:00Z');
    expect(isInsideCancellationWindow(startsAt, now, 150)).toBe(false);
    expect(isInsideCancellationWindow(startsAt, now, 240)).toBe(true);
  });
});

describe('updateStudioSettings', () => {
  it('saves the next version with only the changed values for the audit', async () => {
    const deps = dependencies();

    const saved = await updateStudioSettings(
      {
        expectedVersion: 1,
        values: { ...editable, minimumBookings: 3, openingDate: '2026-12-01' },
      },
      deps,
    );

    expect(saved).toEqual({
      ...current,
      version: 2,
      minimumBookings: 3,
      openingDate: '2026-12-01',
    });
    expect(deps.saveVersion).toHaveBeenCalledWith(
      saved,
      {
        previousMinimumBookings: 2,
        minimumBookings: 3,
        previousOpeningDate: null,
        openingDate: '2026-12-01',
      },
      {
        accountId: 'administrator-account',
        staffMemberId: 'administrator-staff',
      },
    );
  });

  it('writes no version when nothing changed', async () => {
    const deps = dependencies();

    await expect(
      updateStudioSettings({ expectedVersion: 1, values: editable }, deps),
    ).resolves.toEqual(current);
    expect(deps.saveVersion).not.toHaveBeenCalled();
  });

  it('refuses a stale version', async () => {
    const deps = dependencies();

    await expect(
      updateStudioSettings({ expectedVersion: 0, values: editable }, deps),
    ).rejects.toEqual(
      new StudioSettingsError('studio_settings_version_conflict'),
    );
    expect(deps.saveVersion).not.toHaveBeenCalled();
  });

  it.each([
    ['minimumBookings', 0],
    ['minimumBookings', 21],
    ['minimumBookings', 2.5],
    ['taxRatePercent', -1],
    ['taxRatePercent', 101],
    ['renewalTargetMonths1To6Percent', 101],
    ['renewalTargetMonths7To12Percent', -5],
    ['renewalTargetFromMonth13Percent', 50.5],
    ['openingDate', '2026-02-30'],
    ['openingDate', '1/12/2026'],
  ])('refuses %s = %p', async (field, value) => {
    const deps = dependencies();

    await expect(
      updateStudioSettings(
        { expectedVersion: 1, values: { ...editable, [field]: value } },
        deps,
      ),
    ).rejects.toEqual(new StudioSettingsError('invalid_studio_setting'));
    expect(deps.saveVersion).not.toHaveBeenCalled();
  });

  it.each([
    ['a Client', { kind: 'client', clientId: 'client' }],
    [
      'an Assistant',
      {
        kind: 'staff',
        staffMemberId: 'assistant',
        role: 'assistant',
        branchIds: ['branch'],
      },
    ],
    [
      'a Trainer',
      {
        kind: 'staff',
        staffMemberId: 'trainer',
        role: 'trainer',
        branchIds: [],
      },
    ],
    [
      'the Nutritionist',
      {
        kind: 'staff',
        staffMemberId: 'nutritionist',
        role: 'nutritionist',
        branchIds: [],
      },
    ],
  ] as const)('denies %s by default', async (_, identity) => {
    const deps = dependencies({
      accountId: 'other',
      authenticationSessionId: 'session',
      identity: identity as AuthenticatedPrincipal['identity'],
    });

    await expect(
      updateStudioSettings(
        { expectedVersion: 1, values: { ...editable, minimumBookings: 3 } },
        deps,
      ),
    ).rejects.toEqual(new AdministrationError('administration_access_denied'));
    expect(deps.loadCurrent).not.toHaveBeenCalled();
    expect(deps.saveVersion).not.toHaveBeenCalled();
  });
});
