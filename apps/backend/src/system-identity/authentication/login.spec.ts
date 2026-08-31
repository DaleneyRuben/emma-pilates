import { AuthenticationFailedError } from './authenticate-credentials';
import { login, LoginThrottledError } from './login';

describe('login', () => {
  const now = new Date('2026-08-31T12:00:00.000Z');
  const account = {
    id: 'account-id',
    passwordHash: 'stored-password-hash',
    emailVerifiedAt: new Date('2026-08-30T12:00:00.000Z'),
    activatedAt: new Date('2026-08-30T12:00:00.000Z'),
    disabledAt: null,
  };
  const createDependencies = () => ({
    findAccountByEmail: jest.fn().mockResolvedValue(account),
    verifyPassword: jest.fn().mockResolvedValue(true),
    dummyPasswordHash: 'dummy-password-hash',
    digestSignal: (value: string) => Buffer.from(`digest:${value}`),
    readThrottleEvents: jest.fn().mockResolvedValue({
      loginLaneFailures: [],
      clientFailures: [],
      networkFailures: [],
    }),
    recordFailedCredentialCheck: jest.fn().mockResolvedValue(undefined),
    completeLogin: jest.fn().mockResolvedValue(undefined),
    issueCredential: () => ({
      secret: 'opaque-session-credential',
      digest: Buffer.from('credential-digest'),
    }),
    newId: () => 'authentication-session-id',
    now: () => now,
  });
  const command = {
    email: '  ANA@Example.COM ',
    password: 'submitted password',
    clientIdentifier: 'mobile-installation-id',
    networkAddress: '127.0.0.1',
  };

  it('rejects an active throttle without checking a password or extending it', async () => {
    const dependencies = createDependencies();
    dependencies.readThrottleEvents.mockResolvedValue({
      loginLaneFailures: Array.from(
        { length: 6 },
        () => new Date('2026-08-31T11:59:50.000Z'),
      ),
      clientFailures: [],
      networkFailures: [],
    });

    await expect(login(command, dependencies)).rejects.toEqual(
      new LoginThrottledError(20),
    );
    expect(dependencies.verifyPassword).not.toHaveBeenCalled();
    expect(dependencies.recordFailedCredentialCheck).not.toHaveBeenCalled();
    expect(dependencies.completeLogin).not.toHaveBeenCalled();
  });

  it('records a failed credential check in every applicable throttle lane', async () => {
    const dependencies = createDependencies();
    dependencies.verifyPassword.mockResolvedValue(false);

    await expect(login(command, dependencies)).rejects.toBeInstanceOf(
      AuthenticationFailedError,
    );
    expect(dependencies.recordFailedCredentialCheck).toHaveBeenCalledWith({
      loginLaneDigest: Buffer.from(
        'digest:login-lane:ana@example.com\u0000client:mobile-installation-id\u0000network:127.0.0.1',
      ),
      clientDigest: Buffer.from('digest:client:mobile-installation-id'),
      networkDigest: Buffer.from('digest:network:127.0.0.1'),
      occurredAt: now,
      expiresAt: new Date('2026-08-31T13:00:00.000Z'),
    });
    expect(dependencies.completeLogin).not.toHaveBeenCalled();
  });

  it('creates an opaque mobile session and clears only the matching Login lane', async () => {
    const dependencies = createDependencies();

    await expect(login(command, dependencies)).resolves.toEqual({
      credential: 'opaque-session-credential',
    });
    expect(dependencies.completeLogin).toHaveBeenCalledWith({
      loginLaneDigest: Buffer.from(
        'digest:login-lane:ana@example.com\u0000client:mobile-installation-id\u0000network:127.0.0.1',
      ),
      session: {
        id: 'authentication-session-id',
        accountId: 'account-id',
        surface: 'mobile',
        credentialDigest: Buffer.from('credential-digest'),
        createdAt: now,
        lastMeaningfulActivityAt: now,
        idleExpiresAt: new Date('2026-09-30T12:00:00.000Z'),
        absoluteExpiresAt: new Date('2026-11-29T12:00:00.000Z'),
      },
    });
  });
});
