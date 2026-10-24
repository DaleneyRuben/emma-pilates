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
