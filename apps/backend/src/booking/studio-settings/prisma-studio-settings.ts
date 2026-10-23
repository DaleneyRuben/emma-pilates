import { retrySerializable } from '../../database/retry-serializable';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { recordAdministratorAudit } from '../administration/administration-audit';
import { requireAdministrator } from '../administration/administration-errors';
import {
  updateStudioSettings,
  type EditableStudioSettings,
  type StudioSettings,
} from './studio-settings';

export type StudioSettingsView = StudioSettings & {
  updatedAt: Date;
  updatedByName: string | null;
};

// The rules the apps show their Clients (GET /studio-rules, ADR-0101).
export type StudioRules = {
  cancellationWindowMinutes: number;
  evaluationPriceCentavos: number;
  plansFromPriceCentavos: number | null;
  startDateLimitDays: number;
  openingDate: string | null;
};

type Client = Prisma.TransactionClient | PrismaClient;

const versionSelect = {
  id: true,
  version: true,
  cancellationWindowMinutes: true,
  minimumBookings: true,
  minimumBookingsCheckLeadMinutes: true,
  startDateLimitDays: true,
  founderPlaces: true,
  founderDiscountPercent: true,
  founderGapDays: true,
  guestPassesPerClient: true,
  invitesPerHostPerMonth: true,
  inviteRewardClasses: true,
  taxRatePercent: true,
  evaluationPriceCentavos: true,
  nutritionistFeeCentavos: true,
  renewalTargetMonths1To6Percent: true,
  renewalTargetMonths7To12Percent: true,
  renewalTargetFromMonth13Percent: true,
  openingDate: true,
  createdAt: true,
  createdByAccount: { select: { staffMember: { select: { name: true } } } },
} as const;

type VersionRow = Prisma.StudioSettingsVersionGetPayload<{
  select: typeof versionSelect;
}>;

const civil = (date: Date): string => date.toISOString().slice(0, 10);

const toSettings = (row: VersionRow): StudioSettings => ({
  version: row.version,
  cancellationWindowMinutes: row.cancellationWindowMinutes,
  minimumBookings: row.minimumBookings,
  minimumBookingsCheckLeadMinutes: row.minimumBookingsCheckLeadMinutes,
  startDateLimitDays: row.startDateLimitDays,
  founderPlaces: row.founderPlaces,
  founderDiscountPercent: row.founderDiscountPercent,
  founderGapDays: row.founderGapDays,
  guestPassesPerClient: row.guestPassesPerClient,
  invitesPerHostPerMonth: row.invitesPerHostPerMonth,
  inviteRewardClasses: row.inviteRewardClasses,
  taxRatePercent: row.taxRatePercent,
  evaluationPriceCentavos: row.evaluationPriceCentavos,
  nutritionistFeeCentavos: row.nutritionistFeeCentavos,
  renewalTargetMonths1To6Percent: row.renewalTargetMonths1To6Percent,
  renewalTargetMonths7To12Percent: row.renewalTargetMonths7To12Percent,
  renewalTargetFromMonth13Percent: row.renewalTargetFromMonth13Percent,
  openingDate: row.openingDate === null ? null : civil(row.openingDate),
});

const toView = (row: VersionRow): StudioSettingsView => ({
  ...toSettings(row),
  updatedAt: row.createdAt,
  updatedByName: row.createdByAccount?.staffMember?.name ?? null,
});

const currentRow = async (client: Client): Promise<VersionRow> => {
  const row = await client.studioSettingsVersion.findFirst({
    orderBy: { version: 'desc' },
    select: versionSelect,
  });
  // The migration seeds version 1, so a missing row is a broken database.
  if (row === null) throw new Error('Studio Settings have no version');
  return row;
};

// The rules in force, read inside the caller's transaction when it has one.
export const readCurrentStudioSettings = async (
  client: Client,
): Promise<StudioSettings> => toSettings(await currentRow(client));

const serializable = { isolationLevel: 'Serializable' } as const;

export const createPrismaStudioSettings = (
  prisma: PrismaClient,
  dependencies: { now: () => Date },
) => ({
  read: async (principal: AuthenticatedPrincipal) => {
    requireAdministrator(principal);
    return toView(await currentRow(prisma));
  },

  update: (
    command: { expectedVersion: number; values: EditableStudioSettings },
    principal: AuthenticatedPrincipal,
  ): Promise<StudioSettingsView> =>
    retrySerializable(() =>
      prisma.$transaction(async (transaction) => {
        let saved: VersionRow | null = null;
        await updateStudioSettings(command, {
          principal,
          loadCurrent: () => readCurrentStudioSettings(transaction),
          saveVersion: async (next, changes, actor) => {
            const occurredAt = dependencies.now();
            saved = await transaction.studioSettingsVersion.create({
              data: {
                ...next,
                openingDate:
                  next.openingDate === null
                    ? null
                    : new Date(`${next.openingDate}T00:00:00.000Z`),
                createdByAccountId: actor.accountId,
                createdAt: occurredAt,
              },
              select: versionSelect,
            });
            await recordAdministratorAudit(transaction, actor, {
              actionCode: 'studio_settings.updated',
              targetType: 'studio_settings',
              targetId: saved.id,
              metadata: { ...changes, version: next.version },
              occurredAt,
            });
            return next;
          },
        });
        return toView(saved ?? (await currentRow(transaction)));
      }, serializable),
    ),

  rules: async (): Promise<StudioRules> => {
    const [settings, cheapest] = await Promise.all([
      readCurrentStudioSettings(prisma),
      prisma.plan.aggregate({
        where: { hiddenAt: null },
        _min: { priceCentavos: true },
      }),
    ]);
    return {
      cancellationWindowMinutes: settings.cancellationWindowMinutes,
      evaluationPriceCentavos: settings.evaluationPriceCentavos,
      plansFromPriceCentavos: cheapest._min.priceCentavos,
      startDateLimitDays: settings.startDateLimitDays,
      openingDate: settings.openingDate,
    };
  },
});

export type StudioSettingsOperations = ReturnType<
  typeof createPrismaStudioSettings
>;
