export class AuthenticationRequiredError extends Error {}

type StaffRole = 'TRAINER' | 'NUTRITIONIST' | 'ASSISTANT' | 'ADMINISTRATOR';

export type AuthenticationSessionPrincipalRecord = {
  id: string;
  accountId: string;
  createdAt: Date;
  idleExpiresAt: Date;
  absoluteExpiresAt: Date;
  revokedAt: Date | null;
  accountDisabledAt: Date | null;
  clientId: string | null;
  staffMember: {
    id: string;
    role: StaffRole;
    branchIds: string[];
  } | null;
};

export type AuthenticatedPrincipal = {
  accountId: string;
  authenticationSessionId: string;
  identity:
    | { kind: 'client'; clientId: string }
    | {
        kind: 'staff';
        staffMemberId: string;
        role: Lowercase<StaffRole>;
        branchIds: string[];
      };
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
  now(): Date;
};

const dayMilliseconds = 24 * 60 * 60 * 1_000;

export const resolveAuthenticatedPrincipal = async (
  credential: string,
  meaningfulActivity: boolean,
  dependencies: ResolveAuthenticatedPrincipalDependencies,
): Promise<AuthenticatedPrincipal> => {
  const now = dependencies.now();
  const session = await dependencies.findSessionByCredentialDigest(
    dependencies.digestCredential(credential),
  );

  if (
    session === null ||
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
          now.getTime() + 30 * dayMilliseconds,
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
    return {
      accountId: session.accountId,
      authenticationSessionId: session.id,
      identity: {
        kind: 'staff',
        staffMemberId: session.staffMember.id,
        role: session.staffMember.role.toLowerCase() as Lowercase<StaffRole>,
        branchIds: session.staffMember.branchIds,
      },
    };
  }

  throw new AuthenticationRequiredError();
};
