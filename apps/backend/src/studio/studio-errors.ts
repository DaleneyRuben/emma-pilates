import type { AuthenticatedPrincipal } from '../system-identity/authentication/resolve-authenticated-principal';

export class StudioError extends Error {
  readonly status = 403;

  constructor(readonly code: 'studio_access_denied') {
    super(code);
    this.name = 'StudioError';
  }
}

export const requireStudioAdministrator = (
  principal: AuthenticatedPrincipal,
): { accountId: string } => {
  if (
    principal.identity.kind !== 'staff' ||
    principal.identity.role !== 'administrator'
  ) {
    throw new StudioError('studio_access_denied');
  }
  return { accountId: principal.accountId };
};

// IDN-009 owns the real Coordinator role. Until that role is on the
// principal type, a cast in the e2e suite is the only way to prove the
// counts-only response. An unknown role is refused, the same as Assistant.
export const studioKpiRole = (
  principal: AuthenticatedPrincipal,
): 'administrator' | 'coordinator' => {
  if (principal.identity.kind !== 'staff') {
    throw new StudioError('studio_access_denied');
  }
  const role = principal.identity.role as string;
  if (role === 'administrator' || role === 'coordinator') return role;
  throw new StudioError('studio_access_denied');
};
