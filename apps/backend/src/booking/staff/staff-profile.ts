import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { BookingAccessDeniedError } from '../commands/create-booking';

export type StaffProfile = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: 'trainer' | 'nutritionist' | 'assistant' | 'administrator';
  branches: { id: string; name: string }[];
};

type LoadStaffProfileDependencies = {
  principal: AuthenticatedPrincipal;
  findProfile(staffMemberId: string): Promise<StaffProfile | null>;
};

export const loadStaffProfile = async (
  dependencies: LoadStaffProfileDependencies,
): Promise<StaffProfile> => {
  if (dependencies.principal.identity.kind !== 'staff') {
    throw new BookingAccessDeniedError();
  }

  const profile = await dependencies.findProfile(
    dependencies.principal.identity.staffMemberId,
  );

  if (profile === null) {
    throw new BookingAccessDeniedError();
  }

  return profile;
};
