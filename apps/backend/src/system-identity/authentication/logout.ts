type LogoutDependencies = {
  now(): Date;
  revokeSession(input: {
    authenticationSessionId: string;
    revokedAt: Date;
    reason: 'logout';
  }): Promise<void>;
};

export const logout = async (
  authenticationSessionId: string,
  dependencies: LogoutDependencies,
): Promise<void> => {
  await dependencies.revokeSession({
    authenticationSessionId,
    revokedAt: dependencies.now(),
    reason: 'logout',
  });
};
