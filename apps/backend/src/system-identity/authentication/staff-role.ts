/** A Staff Member's Role as the database stores it. */
export type StaffRoleCode =
  'TRAINER' | 'NUTRITIONIST' | 'ASSISTANT' | 'ADMINISTRATOR' | 'COORDINATOR';

// ADR-0084 kept the admin web for Administrators; ADR-0102 opens its
// operational sections to the Coordinator. Everyone else is refused with the
// same neutral failure.
export const opensAdminWebSessions = (
  role: StaffRoleCode | Lowercase<StaffRoleCode> | null | undefined,
): boolean =>
  role === 'ADMINISTRATOR' ||
  role === 'COORDINATOR' ||
  role === 'administrator' ||
  role === 'coordinator';
