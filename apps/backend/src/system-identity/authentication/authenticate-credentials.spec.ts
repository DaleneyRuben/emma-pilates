import {
  authenticateCredentials,
  AuthenticationFailedError,
} from './authenticate-credentials';

describe('authenticateCredentials', () => {
  const activeAccount = {
    id: 'account-id',
    passwordHash: 'stored-password-hash',
    emailVerifiedAt: new Date('2026-08-30T10:00:00.000Z'),
    activatedAt: new Date('2026-08-30T10:00:00.000Z'),
    disabledAt: null,
  };

  it('accepts the normalized email and password of an active Account', async () => {
    const findAccountByEmail = jest.fn().mockResolvedValue(activeAccount);
    const verifyPassword = jest.fn().mockResolvedValue(true);

    await expect(
      authenticateCredentials(
        { email: '  ANA@Example.COM ', password: 'correct password' },
        {
          findAccountByEmail,
          verifyPassword,
          dummyPasswordHash: 'dummy-password-hash',
        },
      ),
    ).resolves.toEqual({ accountId: 'account-id' });
    expect(findAccountByEmail).toHaveBeenCalledWith('ana@example.com');
    expect(verifyPassword).toHaveBeenCalledWith(
      'stored-password-hash',
      'correct password',
    );
  });

  it.each([
    ['unknown email', null, 'dummy-password-hash'],
    [
      'Account without a password',
      { ...activeAccount, passwordHash: null },
      'dummy-password-hash',
    ],
    [
      'unverified Account',
      { ...activeAccount, emailVerifiedAt: null },
      'stored-password-hash',
    ],
    [
      'inactive Account',
      { ...activeAccount, activatedAt: null },
      'stored-password-hash',
    ],
    [
      'disabled Account',
      {
        ...activeAccount,
        disabledAt: new Date('2026-08-31T10:00:00.000Z'),
      },
      'stored-password-hash',
    ],
  ])(
    'uses equivalent password work and a neutral error for an %s',
    async (_label, account, expectedHash) => {
      const verifyPassword = jest.fn().mockResolvedValue(true);

      await expect(
        authenticateCredentials(
          { email: 'ana@example.com', password: 'submitted password' },
          {
            findAccountByEmail: jest.fn().mockResolvedValue(account),
            verifyPassword,
            dummyPasswordHash: 'dummy-password-hash',
          },
        ),
      ).rejects.toBeInstanceOf(AuthenticationFailedError);
      expect(verifyPassword).toHaveBeenCalledTimes(1);
      expect(verifyPassword).toHaveBeenCalledWith(
        expectedHash,
        'submitted password',
      );
    },
  );

  it('returns the same neutral error for an incorrect password', async () => {
    await expect(
      authenticateCredentials(
        { email: 'ana@example.com', password: 'incorrect password' },
        {
          findAccountByEmail: jest.fn().mockResolvedValue(activeAccount),
          verifyPassword: jest.fn().mockResolvedValue(false),
          dummyPasswordHash: 'dummy-password-hash',
        },
      ),
    ).rejects.toBeInstanceOf(AuthenticationFailedError);
  });
});
