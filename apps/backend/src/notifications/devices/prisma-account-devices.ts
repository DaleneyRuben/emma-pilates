import type { PrismaClient } from '../../generated/prisma/client';

export type DevicePlatform = 'ios' | 'android';

export type RegisterCurrentDevice = {
  accountId: string;
  authenticationSessionId: string;
  installationId: string;
  expoPushToken: string;
  platform: DevicePlatform;
};

export const createPrismaAccountDevices = (
  prisma: PrismaClient,
  now: () => Date = () => new Date(),
) => ({
  registerCurrentDevice: (input: RegisterCurrentDevice): Promise<void> =>
    Promise.reject(
      new Error(
        `not implemented: ${input.platform} ${typeof prisma} ${now().toISOString()}`,
      ),
    ),
  deactivateCurrentDevice: (input: {
    accountId: string;
    installationId: string;
  }): Promise<void> =>
    Promise.reject(new Error(`not implemented: ${input.accountId}`)),
});
