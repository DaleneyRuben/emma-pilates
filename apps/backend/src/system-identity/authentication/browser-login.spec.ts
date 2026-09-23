import { AuthenticationFailedError } from './authenticate-credentials';
import { login } from './login';

describe('admin-web Login', () => {
  const now = new Date('2026-08-31T12:00:00.000Z');
  const administrator = {
    id: 'account-id',
    passwordHash: 'stored-password-hash',
    emailVerifiedAt: new Date('2026-08-30T12:00:00.000Z'),
    activatedAt: new Date('2026-08-30T12:00:00.000Z'),
    disabledAt: null,
    staffRole: 'ADMINISTRATOR' as const,
  };
  const createDependencies = (account: unknown = administrator) => ({
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
    email: 'paola@example.com',
    password: 'submitted password',
    clientIdentifier: 'browser-client-identifier',
    networkAddress: '127.0.0.1',
    surface: 'admin_web' as const,
  };

  it('opens a browser session with the Administrator lifetimes', async () => {
    const dependencies = createDependencies();

    await expect(login(command, dependencies)).resolves.toEqual({
      credential: 'opaque-session-credential',
    });
    expect(dependencies.completeLogin).toHaveBeenCalledWith(
      expect.objectContaining({
        session: expect.objectContaining({
          surface: 'admin_web',
          idleExpiresAt: new Date('2026-08-31T12:30:00.000Z'),
          absoluteExpiresAt: new Date('2026-09-01T00:00:00.000Z'),
        }),
      }),
    );
  });

  it.each([
    ['a Client', null],
    ['an Assistant', 'ASSISTANT'],
    ['a Trainer', 'TRAINER'],
    ['a Nutritionist', 'NUTRITIONIST'],
  ])(
    'rejects %s with the neutral failure and counts it as a failed attempt even with the right password',
    async (_label, staffRole) => {
      const dependencies = createDependencies({ ...administrator, staffRole });

      await expect(login(command, dependencies)).rejects.toBeInstanceOf(
        AuthenticationFailedError,
      );
      expect(dependencies.verifyPassword).toHaveBeenCalledWith(
        'stored-password-hash',
        'submitted password',
      );
      expect(dependencies.recordFailedCredentialCheck).toHaveBeenCalledTimes(1);
      expect(dependencies.completeLogin).not.toHaveBeenCalled();
    },
  );

  it('still lets an Administrator open a mobile session', async () => {
    const dependencies = createDependencies();

    await login({ ...command, surface: 'mobile' }, dependencies);

    expect(dependencies.completeLogin).toHaveBeenCalledWith(
      expect.objectContaining({
        session: expect.objectContaining({ surface: 'mobile' }),
      }),
    );
  });
});
