export type AuthenticationSurface = 'mobile' | 'admin_web';

export type NewAuthenticationSession = {
  id: string;
  accountId: string;
  surface: AuthenticationSurface;
  credentialDigest: Uint8Array;
  createdAt: Date;
  lastMeaningfulActivityAt: Date;
  idleExpiresAt: Date;
  absoluteExpiresAt: Date;
};

type CreateAuthenticationSessionDependencies = {
  issueCredential(): { secret: string; digest: Uint8Array };
  newId(): string;
  now(): Date;
  storeSession(session: NewAuthenticationSession): Promise<void>;
};

const minuteMilliseconds = 60 * 1_000;
const dayMilliseconds = 24 * 60 * minuteMilliseconds;

// ADR-0030: the admin web exposes payments, staff, and payroll, so its
// sessions idle out after 30 minutes and end 12 hours after login.
export const authenticationSessionLifetimes: Record<
  AuthenticationSurface,
  { idleMilliseconds: number; absoluteMilliseconds: number }
> = {
  mobile: {
    idleMilliseconds: 30 * dayMilliseconds,
    absoluteMilliseconds: 90 * dayMilliseconds,
  },
  admin_web: {
    idleMilliseconds: 30 * minuteMilliseconds,
    absoluteMilliseconds: 12 * 60 * minuteMilliseconds,
  },
};

export const newAuthenticationSession = (
  input: {
    id: string;
    accountId: string;
    surface: AuthenticationSurface;
    credentialDigest: Uint8Array;
  },
  now: Date,
): NewAuthenticationSession => {
  const lifetime = authenticationSessionLifetimes[input.surface];

  return {
    ...input,
    createdAt: now,
    lastMeaningfulActivityAt: now,
    idleExpiresAt: new Date(now.getTime() + lifetime.idleMilliseconds),
    absoluteExpiresAt: new Date(now.getTime() + lifetime.absoluteMilliseconds),
  };
};

export const createAuthenticationSession = async (
  accountId: string,
  surface: AuthenticationSurface,
  dependencies: CreateAuthenticationSessionDependencies,
): Promise<{ credential: string }> => {
  const credential = dependencies.issueCredential();

  await dependencies.storeSession(
    newAuthenticationSession(
      {
        id: dependencies.newId(),
        accountId,
        surface,
        credentialDigest: credential.digest,
      },
      dependencies.now(),
    ),
  );

  return { credential: credential.secret };
};
