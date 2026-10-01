import {
  authenticateCredentials,
  type AccountCredentials,
  AuthenticationFailedError,
} from './authenticate-credentials';
import {
  type AuthenticationSurface,
  createAuthenticationSession,
  type NewAuthenticationSession,
} from './create-authentication-session';
import { sourceDigests } from '../security/request-source';
import { getLoginThrottle } from './login-throttle-policy';

export class LoginThrottledError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super('Login temporarily unavailable');
  }
}

export type LoginCommand = {
  email: string;
  password: string;
  clientIdentifier: string | null;
  networkAddress: string;
  surface?: AuthenticationSurface;
};

// ADR-0053/ADR-0084: only an Administrator may open an admin-web session;
// everyone else receives the same neutral failure after the same work.
const canOpenSessionOn =
  (surface: AuthenticationSurface) =>
  (account: AccountCredentials): boolean =>
    surface !== 'admin_web' || account.staffRole === 'ADMINISTRATOR';

type LoginThrottleDigests = {
  loginLaneDigest: Uint8Array;
  clientDigest: Uint8Array | null;
  networkDigest: Uint8Array;
};

type LoginDependencies = {
  findAccountByEmail(email: string): Promise<AccountCredentials | null>;
  verifyPassword(passwordHash: string, password: string): Promise<boolean>;
  dummyPasswordHash: string;
  digestSignal(value: string): Uint8Array;
  readThrottleEvents(input: LoginThrottleDigests & { now: Date }): Promise<{
    loginLaneFailures: Date[];
    clientFailures: Date[];
    networkFailures: Date[];
  }>;
  recordFailedCredentialCheck(
    input: LoginThrottleDigests & { occurredAt: Date; expiresAt: Date },
  ): Promise<void>;
  completeLogin(input: {
    loginLaneDigest: Uint8Array;
    session: NewAuthenticationSession;
  }): Promise<void>;
  issueCredential(): { secret: string; digest: Uint8Array };
  newId(): string;
  now(): Date;
};

const createThrottleDigests = (
  command: LoginCommand,
  dependencies: Pick<LoginDependencies, 'digestSignal'>,
): LoginThrottleDigests => {
  const normalizedEmail = command.email.trim().toLowerCase();
  const clientSignal = command.clientIdentifier ?? '';

  return {
    loginLaneDigest: dependencies.digestSignal(
      `login-lane:${normalizedEmail}\0client:${clientSignal}\0network:${command.networkAddress}`,
    ),
    ...sourceDigests(command, dependencies.digestSignal),
  };
};

export const login = async (
  command: LoginCommand,
  dependencies: LoginDependencies,
): Promise<{ credential: string }> => {
  const now = dependencies.now();
  const throttleDigests = createThrottleDigests(command, dependencies);
  const throttleEvents = await dependencies.readThrottleEvents({
    ...throttleDigests,
    now,
  });
  const throttle = getLoginThrottle(now, throttleEvents);

  if (throttle !== null) {
    throw new LoginThrottledError(throttle.retryAfterSeconds);
  }

  const surface = command.surface ?? 'mobile';
  let accountId: string;

  try {
    ({ accountId } = await authenticateCredentials(
      command,
      dependencies,
      canOpenSessionOn(surface),
    ));
  } catch (error) {
    if (!(error instanceof AuthenticationFailedError)) {
      throw error;
    }

    await dependencies.recordFailedCredentialCheck({
      ...throttleDigests,
      occurredAt: now,
      expiresAt: new Date(now.getTime() + 60 * 60 * 1_000),
    });
    throw error;
  }

  return createAuthenticationSession(accountId, surface, {
    issueCredential: () => dependencies.issueCredential(),
    newId: () => dependencies.newId(),
    now: () => now,
    storeSession: (session) =>
      dependencies.completeLogin({
        loginLaneDigest: throttleDigests.loginLaneDigest,
        session,
      }),
  });
};
