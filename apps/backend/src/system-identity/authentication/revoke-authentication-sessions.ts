import type { Prisma } from '../../generated/prisma/client';
import {
  AccountDeviceDeactivationReason,
  AuthenticationSessionRevocationReason,
} from '../../generated/prisma/enums';

const disablingReasons: ReadonlySet<AuthenticationSessionRevocationReason> =
  new Set([
    AuthenticationSessionRevocationReason.ACCOUNT_DISABLED,
    AuthenticationSessionRevocationReason.ACCOUNT_CLOSED,
  ]);

// ADR-0025: a device must not keep receiving an Account's notifications once
// the session that registered it ends. A device another live session of the
// Account still uses stays active.
export const revokeAuthenticationSessions = async (
  transaction: Prisma.TransactionClient,
  where: Prisma.AuthenticationSessionWhereInput,
  input: { revokedAt: Date; reason: AuthenticationSessionRevocationReason },
): Promise<number> => {
  const live = { ...where, revokedAt: null };
  const linked = await transaction.authenticationSession.findMany({
    where: { ...live, accountDeviceId: { not: null } },
    select: { accountDeviceId: true },
  });
  const { count } = await transaction.authenticationSession.updateMany({
    where: live,
    data: { revokedAt: input.revokedAt, revocationReason: input.reason },
  });
  const deviceIds = linked.flatMap(({ accountDeviceId }) =>
    accountDeviceId === null ? [] : [accountDeviceId],
  );

  if (deviceIds.length > 0) {
    await transaction.accountDevice.updateMany({
      where: {
        id: { in: deviceIds },
        deactivatedAt: null,
        sessions: { none: { revokedAt: null } },
      },
      data: {
        deactivatedAt: input.revokedAt,
        deactivationReason: disablingReasons.has(input.reason)
          ? AccountDeviceDeactivationReason.ACCOUNT_DISABLED
          : AccountDeviceDeactivationReason.LOGOUT,
        // A deactivated device holds no push token (account_devices_active_state_check).
        expoPushToken: null,
      },
    });
  }

  return count;
};
