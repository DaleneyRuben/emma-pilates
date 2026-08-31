type NewMobileAuthenticationSession = {
  id: string;
  accountId: string;
  surface: 'mobile';
  credentialDigest: Uint8Array;
  createdAt: Date;
  lastMeaningfulActivityAt: Date;
  idleExpiresAt: Date;
  absoluteExpiresAt: Date;
};

type CreateMobileAuthenticationSessionDependencies = {
  issueCredential(): { secret: string; digest: Uint8Array };
  newId(): string;
  now(): Date;
  storeSession(session: NewMobileAuthenticationSession): Promise<void>;
};

const dayMilliseconds = 24 * 60 * 60 * 1_000;

export const createMobileAuthenticationSession = async (
  accountId: string,
  dependencies: CreateMobileAuthenticationSessionDependencies,
): Promise<{ credential: string }> => {
  const now = dependencies.now();
  const credential = dependencies.issueCredential();

  await dependencies.storeSession({
    id: dependencies.newId(),
    accountId,
    surface: 'mobile',
    credentialDigest: credential.digest,
    createdAt: now,
    lastMeaningfulActivityAt: now,
    idleExpiresAt: new Date(now.getTime() + 30 * dayMilliseconds),
    absoluteExpiresAt: new Date(now.getTime() + 90 * dayMilliseconds),
  });

  return { credential: credential.secret };
};
