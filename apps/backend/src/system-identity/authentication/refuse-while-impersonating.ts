import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedPrincipal } from './resolve-authenticated-principal';

// ADR-0100: account-level self-service stays the Staff Member's own. A request
// made while an Administrator sees the app as them answers 403.
export const refuseWhileImpersonating = (
  principal: AuthenticatedPrincipal,
): void => {
  if (principal.impersonation !== undefined) {
    throw new ForbiddenException({
      code: 'impersonation_forbidden',
      detail: 'Not available while seeing the app as another Staff Member',
    });
  }
};
