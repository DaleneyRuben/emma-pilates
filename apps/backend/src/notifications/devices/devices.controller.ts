import { Controller, Inject } from '@nestjs/common';
import { authenticatedPrincipalResolver } from '../../system-identity/authentication/authentication.controller';
import type { PrincipalResolver } from '../../system-identity/authentication/bearer-principal';
import type { RegisterCurrentDevice } from './prisma-account-devices';

export const deviceRegistration = Symbol('deviceRegistration');
export const deviceDeactivation = Symbol('deviceDeactivation');

type RegisterHandler = (input: RegisterCurrentDevice) => Promise<void>;
type DeactivateHandler = (input: {
  accountId: string;
  installationId: string;
}) => Promise<void>;

@Controller({ path: 'notifications/devices', version: '1' })
export class DevicesController {
  constructor(
    @Inject(deviceRegistration) private readonly register: RegisterHandler,
    @Inject(deviceDeactivation) private readonly deactivate: DeactivateHandler,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  registerCurrent(
    authorization: string | undefined,
    body: unknown,
  ): Promise<void> {
    return Promise.reject(new Error(`not implemented ${typeof body}`));
  }

  deactivateCurrent(
    authorization: string | undefined,
    body: unknown,
  ): Promise<void> {
    return Promise.reject(new Error(`not implemented ${typeof body}`));
  }
}
