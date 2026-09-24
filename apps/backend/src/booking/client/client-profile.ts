import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { BookingAccessDeniedError } from '../commands/create-booking';

export type ClientProfile = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  referralCode: string;
  // The attached `profile_photo` asset, or null while the initials stand in.
  photo: { imageAssetId: string } | null;
};

type LoadClientProfileDependencies = {
  principal: AuthenticatedPrincipal;
  findProfile(clientId: string): Promise<ClientProfile | null>;
};

export const loadClientProfile = async (
  dependencies: LoadClientProfileDependencies,
): Promise<ClientProfile> => {
  if (dependencies.principal.identity.kind !== 'client') {
    throw new BookingAccessDeniedError();
  }

  const profile = await dependencies.findProfile(
    dependencies.principal.identity.clientId,
  );

  if (profile === null) {
    throw new BookingAccessDeniedError();
  }

  return profile;
};
