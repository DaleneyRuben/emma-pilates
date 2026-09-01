import { jest } from '@jest/globals';
import {
  activateAccount,
  inspectAuthenticationLink,
  type AuthenticationLinkGateway,
} from './authentication-links';

describe('authentication links', () => {
  const now = new Date('2026-08-31T18:00:00.000Z');
  const digest = Buffer.from('link-digest');
  const gateway: jest.Mocked<AuthenticationLinkGateway> = {
    inspectLink: jest.fn(),
    activateAccount: jest.fn(),
  };
  const dependencies = {
    gateway,
    digestToken: jest.fn(() => digest),
    hashPassword: jest.fn(() => Promise.resolve('argon2id-password-hash')),
    now: () => now,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a generic invalid result for an unknown secret', async () => {
    gateway.inspectLink.mockResolvedValue(null);

    await expect(
      inspectAuthenticationLink('unknown-secret', dependencies),
    ).resolves.toEqual({ status: 'invalid' });
  });

  it('identifies the purpose of a current activation link', async () => {
    gateway.inspectLink.mockResolvedValue({
      purpose: 'activation',
      state: 'current',
    });

    await expect(
      inspectAuthenticationLink('activation-secret', dependencies),
    ).resolves.toEqual({ status: 'current', purpose: 'activation' });
  });

  it('reports that a recognized activation link has expired', async () => {
    gateway.inspectLink.mockResolvedValue({
      purpose: 'activation',
      state: 'expired',
    });

    await expect(
      inspectAuthenticationLink('expired-secret', dependencies),
    ).resolves.toEqual({ status: 'expired', purpose: 'activation' });
  });

  it('activates an Account without creating an Authentication Session', async () => {
    gateway.inspectLink.mockResolvedValue({
      purpose: 'activation',
      state: 'current',
    });
    gateway.activateAccount.mockResolvedValue(undefined);

    await expect(
      activateAccount(
        { token: 'activation-secret', password: 'new secure password' },
        dependencies,
      ),
    ).resolves.toEqual({ status: 'activated' });

    expect(dependencies.hashPassword).toHaveBeenCalledWith(
      'new secure password',
    );
    expect(gateway.activateAccount.mock.calls).toEqual([
      [
        {
          tokenDigest: digest,
          passwordHash: 'argon2id-password-hash',
          completedAt: now,
        },
      ],
    ]);
  });

  it('does not hash a password when the activation link cannot be used', async () => {
    gateway.inspectLink.mockResolvedValue({
      purpose: 'activation',
      state: 'expired',
    });

    await expect(
      activateAccount(
        { token: 'expired-secret', password: 'new secure password' },
        dependencies,
      ),
    ).resolves.toEqual({ status: 'expired' });

    expect(dependencies.hashPassword).not.toHaveBeenCalled();
    expect(gateway.activateAccount.mock.calls).toHaveLength(0);
  });
});
