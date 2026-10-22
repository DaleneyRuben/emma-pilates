import {
  authenticationSessionLifetimes,
  type AuthenticationSurface,
} from './create-authentication-session';

export class AuthenticationRequiredError extends Error {}

type StaffRole = 'TRAINER' | 'NUTRITIONIST' | 'ASSISTANT' | 'ADMINISTRATOR';

type StaffMemberRecord = {
  id: string;
  role: StaffRole;
  branchIds: string[];
};

// FUT-001 / ADR-0100: the session's one active Impersonation, with the acting
// Staff Member's current state so a deactivation or a Role change ends it.
export type ImpersonationPrincipalRecord = {
  id: string;
  expiresAt: Date;
  staffMember: StaffMemberRecord & {
    accountId: string;
    name: string;
    accountDisabledAt: Date | null;
    deletedAt: Date | null;
  };
};

export type AuthenticationSessionPrincipalRecord = {
  id: string;
  accountId: string;
  surface: AuthenticationSurface;
  createdAt: Date;
  idleExpiresAt: Date;
  absoluteExpiresAt: Date;
  revokedAt: Date | null;
  accountDisabledAt: Date | null;
  clientId: string | null;
  staffMember: StaffMemberRecord | null;
  impersonation?: ImpersonationPrincipalRecord | null;
};

export type StaffIdentity = {
  kind: 'staff';
  staffMemberId: string;
  role: Lowercase<StaffRole>;
  branchIds: string[];
};

export type AuthenticatedPrincipal = {
  accountId: string;
  authenticationSessionId: string;
  identity: { kind: 'client'; clientId: string } | StaffIdentity;
  /** Set while an Administrator sees the Staff app as this Staff Member. */
  impersonation?: {
    id: string;
    administratorAccountId: string;
    staffMemberName: string;
    expiresAt: Date;
  };
};

export type ImpersonationEnd = {
  impersonationId: string;
  endedAt: Date;
  reason: 'expired' | 'revoked';
};

type ResolveAuthenticatedPrincipalDependencies = {
  digestCredential(credential: string): Uint8Array;
  findSessionByCredentialDigest(
    digest: Uint8Array,
  ): Promise<AuthenticationSessionPrincipalRecord | null>;
  recordMeaningfulActivity(input: {
    authenticationSessionId: string;
    activityAt: Date;
    idleExpiresAt: Date;
  }): Promise<void>;
  endImpersonation?(input: ImpersonationEnd): Promise<void>;
  now(): Date;
};

const staffIdentity = (staffMember: StaffMemberRecord): StaffIdentity => ({
  kind: 'staff',
  staffMemberId: staffMember.id,
  role: staffMember.role.toLowerCase() as Lowercase<StaffRole>,
  branchIds: staffMember.branchIds,
});

// An Impersonation ends on its own when the 30 minutes pass, or when the
// Staff Member can no longer be seen as (deactivated, removed, promoted).
const impersonationEnd = (
  impersonation: ImpersonationPrincipalRecord,
  now: Date,
): ImpersonationEnd | null => {
  const { staffMember } = impersonation;
  if (impersonation.expiresAt <= now) {
    return {
      impersonationId: impersonation.id,
      endedAt: impersonation.expiresAt,
      reason: 'expired',
    };
  }
  if (
    staffMember.accountDisabledAt !== null ||
    staffMember.deletedAt !== null ||
    staffMember.role === 'ADMINISTRATOR'
  ) {
    return {
      impersonationId: impersonation.id,
      endedAt: now,
      reason: 'revoked',
    };
  }
  return null;
};

export const resolveAuthenticatedPrincipal = async (
  credential: string,
  meaningfulActivity: boolean,
  dependencies: ResolveAuthenticatedPrincipalDependencies,
  surface: AuthenticationSurface = 'mobile',
): Promise<AuthenticatedPrincipal> => {
  const now = dependencies.now();
  const session = await dependencies.findSessionByCredentialDigest(
    dependencies.digestCredential(credential),
  );

  if (
    session === null ||
    session.surface !== surface ||
    session.revokedAt !== null ||
    session.accountDisabledAt !== null ||
    session.idleExpiresAt <= now ||
    session.absoluteExpiresAt <= now
  ) {
    throw new AuthenticationRequiredError();
  }

  if (meaningfulActivity) {
    await dependencies.recordMeaningfulActivity({
      authenticationSessionId: session.id,
      activityAt: now,
      idleExpiresAt: new Date(
        Math.min(
          now.getTime() +
            authenticationSessionLifetimes[surface].idleMilliseconds,
          session.absoluteExpiresAt.getTime(),
        ),
      ),
    });
  }

  if (session.clientId !== null && session.staffMember === null) {
    return {
      accountId: session.accountId,
      authenticationSessionId: session.id,
      identity: { kind: 'client', clientId: session.clientId },
    };
  }

  if (session.clientId === null && session.staffMember !== null) {
    const impersonation = session.impersonation ?? null;
    const end =
      impersonation === null ? null : impersonationEnd(impersonation, now);
    if (end !== null) {
      await dependencies.endImpersonation?.(end);
    }
    if (impersonation !== null && end === null) {
      return {
        accountId: impersonation.staffMember.accountId,
        authenticationSessionId: session.id,
        identity: staffIdentity(impersonation.staffMember),
        impersonation: {
          id: impersonation.id,
          administratorAccountId: session.accountId,
          staffMemberName: impersonation.staffMember.name,
          expiresAt: impersonation.expiresAt,
        },
      };
    }
    return {
      accountId: session.accountId,
      authenticationSessionId: session.id,
      identity: staffIdentity(session.staffMember),
    };
  }

  throw new AuthenticationRequiredError();
};
