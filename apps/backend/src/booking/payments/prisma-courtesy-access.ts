import type { PrismaClient } from '../../generated/prisma/client';
import type { NotificationRecorder } from '../../notifications/prisma-notification-store';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import type { PaymentView } from './prisma-payment-commands';

export type CourtesyAccessDependencies = {
  now: () => Date;
  recordNotification?: NotificationRecorder;
};

export const createPrismaCourtesyAccess = (
  prisma: PrismaClient,
  dependencies: CourtesyAccessDependencies,
) => ({
  grant: (
    command: { clientId: string; endsOn: Date },
    principal: AuthenticatedPrincipal,
    idempotencyKey: string,
  ): Promise<PaymentView> =>
    Promise.reject(
      new Error(
        `Not implemented: ${command.clientId} ${principal.accountId} ${idempotencyKey} ${String(prisma !== null)} ${dependencies.now().toISOString()}`,
      ),
    ),
});

export type CourtesyAccess = ReturnType<typeof createPrismaCourtesyAccess>;
