export type AuthenticationLinkPurpose = 'activation' | 'password_recovery';
// `removed`: an activation link whose invitation the 30-day cleanup removed.
export type AuthenticationLinkState = 'current' | 'expired' | 'removed';

export type AuthenticationLinkGateway = {
  inspectLink(input: { tokenDigest: Uint8Array; inspectedAt: Date }): Promise<{
    purpose: AuthenticationLinkPurpose;
    state: AuthenticationLinkState;
  } | null>;
  activateAccount(input: {
    tokenDigest: Uint8Array;
    passwordHash: string;
    completedAt: Date;
  }): Promise<void>;
};

type AuthenticationLinkDependencies = {
  gateway: AuthenticationLinkGateway;
  digestToken(secret: string): Uint8Array;
  hashPassword(password: string): Promise<string>;
  now(): Date;
};

export type AuthenticationLinkInspection =
  | { status: 'invalid' }
  | {
      status: AuthenticationLinkState;
      purpose: AuthenticationLinkPurpose;
    };

export const inspectAuthenticationLink = async (
  secret: string,
  dependencies: AuthenticationLinkDependencies,
): Promise<AuthenticationLinkInspection> => {
  const link = await dependencies.gateway.inspectLink({
    tokenDigest: dependencies.digestToken(secret),
    inspectedAt: dependencies.now(),
  });

  return link === null
    ? { status: 'invalid' }
    : { status: link.state, purpose: link.purpose };
};

export const activateAccount = async (
  command: { token: string; password: string },
  dependencies: AuthenticationLinkDependencies,
): Promise<{ status: 'activated' | 'expired' | 'invalid' }> => {
  const inspectedAt = dependencies.now();
  const tokenDigest = dependencies.digestToken(command.token);
  const link = await dependencies.gateway.inspectLink({
    tokenDigest,
    inspectedAt,
  });

  if (link === null || link.purpose !== 'activation') {
    return { status: 'invalid' };
  }

  if (link.state !== 'current') {
    return { status: 'expired' };
  }

  const passwordHash = await dependencies.hashPassword(command.password);
  await dependencies.gateway.activateAccount({
    tokenDigest,
    passwordHash,
    completedAt: inspectedAt,
  });

  return { status: 'activated' };
};
