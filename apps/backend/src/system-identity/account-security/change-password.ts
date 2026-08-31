export class CurrentPasswordIncorrectError extends Error {}

export type PasswordChangeGateway = {
  findPasswordHash(accountId: string): Promise<string | null>;
  completePasswordChange(input: {
    accountId: string;
    authenticationSessionId: string;
    passwordHash: string;
    changedAt: Date;
    auditRecordId: string;
  }): Promise<void>;
};

type ChangePasswordDependencies = {
  gateway: PasswordChangeGateway;
  verifyPassword(passwordHash: string, password: string): Promise<boolean>;
  hashPassword(password: string): Promise<string>;
  now(): Date;
  newAuditRecordId(): string;
};

export const changePassword = async (
  command: {
    accountId: string;
    authenticationSessionId: string;
    currentPassword: string;
    newPassword: string;
  },
  dependencies: ChangePasswordDependencies,
): Promise<void> => {
  const currentHash = await dependencies.gateway.findPasswordHash(
    command.accountId,
  );
  const currentPasswordMatches =
    currentHash !== null &&
    (await dependencies.verifyPassword(currentHash, command.currentPassword));

  if (!currentPasswordMatches) {
    throw new CurrentPasswordIncorrectError();
  }

  await dependencies.gateway.completePasswordChange({
    accountId: command.accountId,
    authenticationSessionId: command.authenticationSessionId,
    passwordHash: await dependencies.hashPassword(command.newPassword),
    changedAt: dependencies.now(),
    auditRecordId: dependencies.newAuditRecordId(),
  });
};
