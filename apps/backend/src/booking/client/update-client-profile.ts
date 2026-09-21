import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { BookingAccessDeniedError } from '../commands/create-booking';
import type { ClientProfile } from './client-profile';

export type ClientProfileChanges = {
  name: string;
  phone: string | null;
};

type UpdateClientProfileDependencies = {
  principal: AuthenticatedPrincipal;
  saveProfile(
    clientId: string,
    changes: ClientProfileChanges,
  ): Promise<ClientProfile>;
};

const normalizePhone = (phone: string | null): string | null => {
  const trimmed = phone?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
};

export const updateClientProfile = async (
  command: { name: string; phone: string | null },
  dependencies: UpdateClientProfileDependencies,
): Promise<ClientProfile> => {
  if (dependencies.principal.identity.kind !== 'client') {
    throw new BookingAccessDeniedError();
  }

  const name = command.name.trim();
  if (name === '') {
    throw new Error('Client name is required');
  }

  return dependencies.saveProfile(dependencies.principal.identity.clientId, {
    name,
    phone: normalizePhone(command.phone),
  });
};
