import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import type { EditableStudioSettings, StudioSettings } from './studio-settings';

export type StudioSettingsView = StudioSettings & {
  updatedAt: Date;
  updatedByName: string | null;
};

export type StudioRules = {
  cancellationWindowMinutes: number;
  evaluationPriceCentavos: number;
  plansFromPriceCentavos: number | null;
  startDateLimitDays: number;
  openingDate: string | null;
};

export const readCurrentStudioSettings: (
  client: Prisma.TransactionClient,
) => Promise<StudioSettings> = () =>
  Promise.reject(new Error('Not implemented'));

export const createPrismaStudioSettings = (
  prisma: PrismaClient,
  dependencies: { now: () => Date },
) => ({
  read: (principal: AuthenticatedPrincipal): Promise<StudioSettingsView> =>
    Promise.reject(new Error(`Not implemented ${principal.accountId}`)),
  update: (
    command: { expectedVersion: number; values: EditableStudioSettings },
    principal: AuthenticatedPrincipal,
  ): Promise<StudioSettingsView> =>
    Promise.reject(
      new Error(
        `Not implemented ${command.expectedVersion} ${principal.accountId}`,
      ),
    ),
  rules: (): Promise<StudioRules> =>
    Promise.reject(
      new Error(
        `Not implemented ${String(Boolean(prisma))} ${dependencies.now().toISOString()}`,
      ),
    ),
});

export type StudioSettingsOperations = ReturnType<
  typeof createPrismaStudioSettings
>;
