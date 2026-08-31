export class AuthenticationFailedError extends Error {}

type AccountCredentials = {
  id: string;
  passwordHash: string | null;
  emailVerifiedAt: Date | null;
  activatedAt: Date | null;
  disabledAt: Date | null;
};

type AuthenticateCredentialsDependencies = {
  findAccountByEmail(email: string): Promise<AccountCredentials | null>;
  verifyPassword(passwordHash: string, password: string): Promise<boolean>;
  dummyPasswordHash: string;
};

export const authenticateCredentials = async (
  _command: { email: string; password: string },
  _dependencies: AuthenticateCredentialsDependencies,
): Promise<{ accountId: string }> => {
  throw new AuthenticationFailedError();
};
