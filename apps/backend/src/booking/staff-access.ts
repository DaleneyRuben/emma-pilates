import type {
  AuthenticatedPrincipal,
  StaffIdentity,
} from '../system-identity/authentication/resolve-authenticated-principal';

/**
 * Administrators and the Coordinator hold every Branch implicitly and carry
 * no Branch rows (glossary «Staff Member», ADR-0102).
 */
export const holdsEveryBranch = (identity: StaffIdentity): boolean =>
  identity.role === 'administrator' || identity.role === 'coordinator';

export const worksAtBranch = (
  identity: StaffIdentity,
  branchId: string,
): boolean =>
  holdsEveryBranch(identity) || identity.branchIds.includes(branchId);

/**
 * Front-desk Booking work on a Client's behalf: the Assistant at her assigned
 * Branches and the Coordinator at every Branch (ADR-0102).
 */
export const actsForClientsAt = (
  principal: AuthenticatedPrincipal,
  branchId: string,
): boolean =>
  principal.identity.kind === 'staff' &&
  (principal.identity.role === 'assistant' ||
    principal.identity.role === 'coordinator') &&
  worksAtBranch(principal.identity, branchId);

/**
 * The studio's operation without money: the schedule, Sessions, Client
 * profiles, and Staff details, for the Administrator and the Coordinator
 * (ADR-0102).
 */
export const runsOperations = (principal: AuthenticatedPrincipal): boolean =>
  principal.identity.kind === 'staff' &&
  (principal.identity.role === 'administrator' ||
    principal.identity.role === 'coordinator');
