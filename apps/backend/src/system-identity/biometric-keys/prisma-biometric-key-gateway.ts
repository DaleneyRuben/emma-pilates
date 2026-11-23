import type { PrismaClient } from '../../generated/prisma/client';
import type { BiometricKeyGateway } from './biometric-keys';

export type PrismaBiometricKeyGateway = Omit<
  BiometricKeyGateway,
  'readThrottleEvents' | 'recordFailedCredentialCheck'
>;

const notImplemented = (...inputs: unknown[]): Promise<never> =>
  Promise.reject(new Error(`Not implemented (${inputs.length})`));

export const createPrismaBiometricKeyGateway = (
  prisma: PrismaClient,
): PrismaBiometricKeyGateway => ({
  issue: (input) => notImplemented(prisma, input),
  findByKeyDigest: (digest) => notImplemented(digest),
  rotate: (input) => notImplemented(input),
  revokeInstallation: (input) => notImplemented(input),
});
