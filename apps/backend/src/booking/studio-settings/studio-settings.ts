import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import {
  requireAdministrator,
  type AdministratorActor,
} from '../administration/administration-errors';

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

// Inside the window a Booking can no longer be cancelled, only rescheduled,
// and the Waitlist neither takes nor promotes anyone (booking glossary).
export const isInsideCancellationWindow = (
  startsAt: Date,
  now: Date,
  cancellationWindowMinutes: number,
): boolean =>
  startsAt.getTime() - now.getTime() <= cancellationWindowMinutes * 60_000;

const editableFields = [
  'minimumBookings',
  'taxRatePercent',
  'renewalTargetMonths1To6Percent',
  'renewalTargetMonths7To12Percent',
  'renewalTargetFromMonth13Percent',
  'openingDate',
] as const satisfies readonly (keyof EditableStudioSettings)[];

const percentFields = [
  'taxRatePercent',
  'renewalTargetMonths1To6Percent',
  'renewalTargetMonths7To12Percent',
  'renewalTargetFromMonth13Percent',
] as const;

const isCivilDate = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

const isIntegerBetween = (value: number, low: number, high: number) =>
  Number.isInteger(value) && value >= low && value <= high;

const isValid = (values: EditableStudioSettings): boolean =>
  isIntegerBetween(values.minimumBookings, 1, 20) &&
  percentFields.every((field) => isIntegerBetween(values[field], 0, 100)) &&
  (values.openingDate === null || isCivilDate(values.openingDate));

// Previous and new values of the fields that changed, for the audit record.
const changes = (
  previous: StudioSettings,
  next: StudioSettings,
): Record<string, string | number | null> =>
  Object.fromEntries(
    editableFields
      .filter((field) => previous[field] !== next[field])
      .flatMap((field) => [
        [`previous${field[0].toUpperCase()}${field.slice(1)}`, previous[field]],
        [field, next[field]],
      ]),
  );

// Only the Administrator edits the configurable subset; each change is a new
// version, and a form saved over a newer version is refused.
export const updateStudioSettings = async (
  command: { expectedVersion: number; values: EditableStudioSettings },
  dependencies: UpdateStudioSettingsDependencies,
): Promise<StudioSettings> => {
  const actor = requireAdministrator(dependencies.principal);
  if (!isValid(command.values)) {
    throw new StudioSettingsError('invalid_studio_setting');
  }

  const current = await dependencies.loadCurrent();
  if (current.version !== command.expectedVersion) {
    throw new StudioSettingsError('studio_settings_version_conflict');
  }

  const next: StudioSettings = {
    ...current,
    ...command.values,
    version: current.version + 1,
  };
  const changed = changes(current, next);
  if (Object.keys(changed).length === 0) return current;

  return dependencies.saveVersion(next, changed, actor);
};
