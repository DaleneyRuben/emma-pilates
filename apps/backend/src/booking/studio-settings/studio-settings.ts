import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import type { AdministratorActor } from '../administration/administration-errors';

// The studio's configurable rules, one versioned record (ADR-0101).
export type StudioSettings = {
  version: number;
  cancellationWindowMinutes: number;
  minimumBookings: number;
  minimumBookingsCheckLeadMinutes: number;
  startDateLimitDays: number;
  founderPlaces: number;
  founderDiscountPercent: number;
  founderGapDays: number;
  guestPassesPerClient: number;
  invitesPerHostPerMonth: number;
  inviteRewardClasses: number;
  taxRatePercent: number;
  evaluationPriceCentavos: number;
  nutritionistFeeCentavos: number;
  renewalTargetMonths1To6Percent: number;
  renewalTargetMonths7To12Percent: number;
  renewalTargetFromMonth13Percent: number;
  openingDate: string | null;
};

export type EditableStudioSettings = Pick<
  StudioSettings,
  | 'minimumBookings'
  | 'taxRatePercent'
  | 'renewalTargetMonths1To6Percent'
  | 'renewalTargetMonths7To12Percent'
  | 'renewalTargetFromMonth13Percent'
  | 'openingDate'
>;

export type StudioSettingsErrorCode =
  'studio_settings_version_conflict' | 'invalid_studio_setting';

export class StudioSettingsError extends Error {
  constructor(readonly code: StudioSettingsErrorCode) {
    super(code);
    this.name = 'StudioSettingsError';
  }
}

type UpdateStudioSettingsDependencies = {
  principal: AuthenticatedPrincipal;
  loadCurrent(): Promise<StudioSettings>;
  saveVersion(
    next: StudioSettings,
    changes: Record<string, string | number | null>,
    actor: AdministratorActor,
  ): Promise<StudioSettings>;
};

export const isInsideCancellationWindow: (
  startsAt: Date,
  now: Date,
  cancellationWindowMinutes: number,
) => boolean = () => {
  throw new Error('Not implemented');
};

export const updateStudioSettings: (
  command: { expectedVersion: number; values: EditableStudioSettings },
  dependencies: UpdateStudioSettingsDependencies,
) => Promise<StudioSettings> = () =>
  Promise.reject(new Error('Not implemented'));
