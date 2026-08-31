import {
  authenticateCredentials,
  type AccountCredentials,
  AuthenticationFailedError,
} from './authenticate-credentials';
import {
  createMobileAuthenticationSession,
  type NewMobileAuthenticationSession,
} from './create-mobile-authentication-session';
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
};

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
  readThrottleEvents(
    input: LoginThrottleDigests & { normalizedEmail: string; now: Date },
  ): Promise<{
    loginLaneFailures: Date[];
    clientFailures: Date[];
    networkFailures: Date[];
  }>;
  recordFailedCredentialCheck(
    input: LoginThrottleDigests & { occurredAt: Date; expiresAt: Date },
  ): Promise<void>;
  completeLogin(input: {
    loginLaneDigest: Uint8Array;
    session: NewMobileAuthenticationSession;
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
    clientDigest:
      command.clientIdentifier === null
        ? null
        : dependencies.digestSignal(`client:${command.clientIdentifier}`),
    networkDigest: dependencies.digestSignal(
      `network:${command.networkAddress}`,
    ),
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
    normalizedEmail: command.email.trim().toLowerCase(),
    now,
  });
  const throttle = getLoginThrottle(now, throttleEvents);

  if (throttle !== null) {
    throw new LoginThrottledError(throttle.retryAfterSeconds);
  }

  let accountId: string;

  try {
    ({ accountId } = await authenticateCredentials(command, dependencies));
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

  return createMobileAuthenticationSession(accountId, {
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
