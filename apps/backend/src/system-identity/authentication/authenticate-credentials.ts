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
  command: { email: string; password: string },
  dependencies: AuthenticateCredentialsDependencies,
): Promise<{ accountId: string }> => {
  const account = await dependencies.findAccountByEmail(
    command.email.trim().toLowerCase(),
  );
  const passwordMatches = await dependencies.verifyPassword(
    account?.passwordHash ?? dependencies.dummyPasswordHash,
    command.password,
  );
  const accountCanAuthenticate =
    account !== null &&
    account.passwordHash !== null &&
    account.emailVerifiedAt !== null &&
    account.activatedAt !== null &&
    account.disabledAt === null;

  if (!passwordMatches || !accountCanAuthenticate) {
    throw new AuthenticationFailedError();
  }

  return { accountId: account.id };
};
