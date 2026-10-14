import { createHash } from 'node:crypto';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import {
  AccountDeviceDeactivationReason,
  AccountDevicePlatform,
} from '../../generated/prisma/enums';
import { toPrismaBytes } from '../../database/prisma-bytes';
import { retrySerializable } from '../../database/retry-serializable';

export type DevicePlatform = 'ios' | 'android';

export type RegisterCurrentDevice = {
  accountId: string;
  authenticationSessionId: string;
  installationId: string;
  expoPushToken: string;
  platform: DevicePlatform;
};

const platforms: Record<DevicePlatform, AccountDevicePlatform> = {
  ios: AccountDevicePlatform.IOS,
  android: AccountDevicePlatform.ANDROID,
};

// Only the digest is stored, so the raw installation id never reaches the
// database.
export const digestInstallationId = (
  installationId: string,
): Uint8Array<ArrayBuffer> =>
  toPrismaBytes(createHash('sha256').update(installationId).digest());

const deactivation = (
  at: Date,
  reason: AccountDeviceDeactivationReason,
): Prisma.AccountDeviceUpdateManyMutationInput => ({
  deactivatedAt: at,
  deactivationReason: reason,
  // A deactivated device holds no push token (account_devices_active_state_check).
  expoPushToken: null,
});

const isUniqueViolation = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  error.code === 'P2002';

const register = async (
  transaction: Prisma.TransactionClient,
  input: RegisterCurrentDevice,
  at: Date,
): Promise<void> => {
  const installationIdDigest = digestInstallationId(input.installationId);
  const current = await transaction.accountDevice.findFirst({
    where: { installationIdDigest, deactivatedAt: null },
  });
  const own = current?.accountId === input.accountId ? current : null;

  if (current !== null && own === null) {
    await transaction.accountDevice.updateMany({
      where: { id: current.id, deactivatedAt: null },
      data: deactivation(at, AccountDeviceDeactivationReason.ACCOUNT_CHANGED),
    });
  }
  await transaction.accountDevice.updateMany({
    where: {
      expoPushToken: input.expoPushToken,
      deactivatedAt: null,
      ...(own === null ? {} : { id: { not: own.id } }),
    },
    data: deactivation(at, AccountDeviceDeactivationReason.TOKEN_REPLACED),
  });

  const device =
    own === null
      ? await transaction.accountDevice.create({
          data: {
            accountId: input.accountId,
            installationIdDigest,
            expoPushToken: input.expoPushToken,
            platform: platforms[input.platform],
            registeredAt: at,
            tokenUpdatedAt: at,
            lastSeenAt: at,
          },
        })
      : await transaction.accountDevice.update({
          where: { id: own.id },
          data: {
            expoPushToken: input.expoPushToken,
            platform: platforms[input.platform],
            lastSeenAt: at,
            ...(own.expoPushToken === input.expoPushToken
              ? {}
              : { tokenUpdatedAt: at }),
          },
        });

  await transaction.authenticationSession.updateMany({
    where: {
      id: input.authenticationSessionId,
      accountId: input.accountId,
      revokedAt: null,
    },
    data: { accountDeviceId: device.id },
  });
};

export const createPrismaAccountDevices = (
  prisma: PrismaClient,
  now: () => Date = () => new Date(),
) => ({
  registerCurrentDevice: (input: RegisterCurrentDevice): Promise<void> =>
    retrySerializable(async () => {
      try {
        await prisma.$transaction(
          (transaction) => register(transaction, input, now()),
          { isolationLevel: 'Serializable' },
        );
      } catch (error) {
        // Two registrations of one installation can both pass the read above;
        // the loser hits a partial unique index and retries as a conflict.
        if (isUniqueViolation(error)) {
          throw Object.assign(new Error('Device registration raced'), {
            code: 'P2034',
          });
        }
        throw error;
      }
    }),

  deactivateCurrentDevice: async (input: {
    accountId: string;
    installationId: string;
  }): Promise<void> => {
    await prisma.accountDevice.updateMany({
      where: {
        accountId: input.accountId,
        installationIdDigest: digestInstallationId(input.installationId),
        deactivatedAt: null,
      },
      data: deactivation(
        now(),
        AccountDeviceDeactivationReason.PERMISSION_REVOKED,
      ),
    });
  },
});
