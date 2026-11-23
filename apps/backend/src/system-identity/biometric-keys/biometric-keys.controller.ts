import { Controller } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../authentication/resolve-authenticated-principal';
import type {
  exchangeBiometricKey,
  issueBiometricKey,
  revokeBiometricKey,
} from './biometric-keys';

export const biometricKeyOperations = Symbol('biometricKeyOperations');

export type BiometricKeyOperations = {
  issue: (
    principal: AuthenticatedPrincipal,
    command: { clientIdentifier: string | null },
  ) => ReturnType<typeof issueBiometricKey>;
  exchange: (
    command: Parameters<typeof exchangeBiometricKey>[0],
  ) => ReturnType<typeof exchangeBiometricKey>;
  revoke: (
    command: Parameters<typeof revokeBiometricKey>[0],
  ) => ReturnType<typeof revokeBiometricKey>;
};

@Controller({ path: 'biometric-keys', version: '1' })
export class BiometricKeysController {}
