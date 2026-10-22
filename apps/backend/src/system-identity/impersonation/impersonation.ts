import type { AuthenticationSurface } from '../authentication/create-authentication-session';
import type { AuthenticatedPrincipal } from '../authentication/resolve-authenticated-principal';

// FUT-001 / ADR-0100: an Administrator sees the Staff app as one active
// Trainer, Assistant, or Nutritionist for 30 minutes, on their own session.
export const impersonationLifetimeMilliseconds = 30 * 60 * 1_000;

export type ImpersonationErrorCode =
  | 'staff_access_denied'
  | 'impersonation_surface'
  | 'impersonation_active'
  | 'impersonation_not_active'
  | 'staff_member_not_found'
  | 'staff_member_not_impersonable';

export class ImpersonationError extends Error {
  constructor(readonly code: ImpersonationErrorCode) {
    super(code);
    this.name = 'ImpersonationError';
  }
}

export type ImpersonableRole = 'trainer' | 'assistant' | 'nutritionist';

export type ImpersonationStaffMember = {
  id: string;
  accountId: string;
  name: string;
  role: ImpersonableRole | 'administrator';
  status: 'pending' | 'active' | 'deactivated';
};

export type ImpersonationView = {
  id: string;
  staffMemberId: string;
  staffMemberName: string;
  role: ImpersonableRole;
  expiresAt: Date;
};

export type ImpersonationEndReason =
  'exited' | 'expired' | 'logged_out' | 'revoked';

export type ImpersonationGateway = {
  findStaffMember(
    staffMemberId: string,
  ): Promise<ImpersonationStaffMember | null>;
  /** Rejects with `impersonation_active` when the session already has one. */
  start(input: {
    id: string;
    authenticationSessionId: string;
    administratorAccountId: string;
    staffMember: ImpersonationStaffMember;
    startedAt: Date;
    expiresAt: Date;
  }): Promise<void>;
  /** Resolves false when the row had already ended. */
  end(input: {
    impersonationId: string;
    endedAt: Date;
    reason: ImpersonationEndReason;
    actorAccountId: string | null;
  }): Promise<boolean>;
};

const isImpersonable = (
  member: ImpersonationStaffMember,
): member is ImpersonationStaffMember & { role: ImpersonableRole } =>
  member.role !== 'administrator' && member.status === 'active';

export const startImpersonation = async (
  command: { staffMemberId: string; surface: AuthenticationSurface },
  principal: AuthenticatedPrincipal,
  dependencies: {
    gateway: ImpersonationGateway;
    now(): Date;
    newId(): string;
  },
): Promise<ImpersonationView> => {
  if (
    principal.identity.kind !== 'staff' ||
    principal.identity.role !== 'administrator'
  ) {
    throw new ImpersonationError('staff_access_denied');
  }
  if (command.surface !== 'mobile') {
    throw new ImpersonationError('impersonation_surface');
  }
  if (principal.impersonation !== undefined) {
    throw new ImpersonationError('impersonation_active');
  }

  const member = await dependencies.gateway.findStaffMember(
    command.staffMemberId,
  );
  if (member === null) {
    throw new ImpersonationError('staff_member_not_found');
  }
  if (!isImpersonable(member)) {
    throw new ImpersonationError('staff_member_not_impersonable');
  }

  const startedAt = dependencies.now();
  const expiresAt = new Date(
    startedAt.getTime() + impersonationLifetimeMilliseconds,
  );
  const id = dependencies.newId();
  await dependencies.gateway.start({
    id,
    authenticationSessionId: principal.authenticationSessionId,
    administratorAccountId: principal.accountId,
    staffMember: member,
    startedAt,
    expiresAt,
  });

  return {
    id,
    staffMemberId: member.id,
    staffMemberName: member.name,
    role: member.role,
    expiresAt,
  };
};

// «Salir»: the Administrator ends the Impersonation before its time.
export const endImpersonation = async (
  principal: AuthenticatedPrincipal,
  dependencies: { gateway: ImpersonationGateway; now(): Date },
): Promise<void> => {
  if (principal.impersonation === undefined) {
    throw new ImpersonationError('impersonation_not_active');
  }
  const ended = await dependencies.gateway.end({
    impersonationId: principal.impersonation.id,
    endedAt: dependencies.now(),
    reason: 'exited',
    actorAccountId: principal.impersonation.administratorAccountId,
  });
  if (!ended) {
    throw new ImpersonationError('impersonation_not_active');
  }
};
