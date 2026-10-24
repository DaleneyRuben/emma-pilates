import type { AuthenticatedPrincipal } from './resolve-authenticated-principal';
import type { StaffRoleCode as StaffRole } from './staff-role';

export type AuditActor = {
  accountId: string;
  role: StaffRole | null;
  /** The Impersonation every audit record written meanwhile points at. */
  impersonationId: string | null;
};

// ADR-0100: while an Administrator sees the app as a Staff Member, the audit
// actor is the Administrator; the Impersonation row names the Staff Member.
export const auditActorOf = (principal: AuthenticatedPrincipal): AuditActor =>
  principal.impersonation === undefined
    ? {
        accountId: principal.accountId,
        role:
          principal.identity.kind === 'staff'
            ? (principal.identity.role.toUpperCase() as StaffRole)
            : null,
        impersonationId: null,
      }
    : {
        accountId: principal.impersonation.administratorAccountId,
        role: 'ADMINISTRATOR',
        impersonationId: principal.impersonation.id,
      };
