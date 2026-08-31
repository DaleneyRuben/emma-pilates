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

export const createMobileAuthenticationSession = async (
  _accountId: string,
  _dependencies: CreateMobileAuthenticationSessionDependencies,
): Promise<{ credential: string }> => {
  throw new Error('Not implemented');
};
