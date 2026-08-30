import { AuthenticationTokenPurpose } from '../../generated/prisma/enums';
import { PrismaAuthenticationEmailStateReader } from './prisma-authentication-email-state-reader';

describe('PrismaAuthenticationEmailStateReader', () => {
  it('loads the authentication token and current Account email', async () => {
    const findUnique = jest.fn().mockResolvedValue({
      accountId: '0ae2701e-f8ac-4c8a-8cf0-65182ee0fc1d',
      purpose: AuthenticationTokenPurpose.PASSWORD_RECOVERY,
      expiresAt: new Date('2026-08-30T16:00:00.000Z'),
      usedAt: null,
      invalidatedAt: null,
      account: { email: 'client@example.com' },
    });
    const reader = new PrismaAuthenticationEmailStateReader({
      authenticationToken: { findUnique },
    });

    await expect(
      reader.find('b6421a64-1429-4864-830f-e49a67438488'),
    ).resolves.toEqual({
      accountId: '0ae2701e-f8ac-4c8a-8cf0-65182ee0fc1d',
      purpose: 'password_recovery',
      expiresAt: new Date('2026-08-30T16:00:00.000Z'),
      usedAt: null,
      invalidatedAt: null,
      email: 'client@example.com',
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'b6421a64-1429-4864-830f-e49a67438488' },
      select: {
        accountId: true,
        purpose: true,
        expiresAt: true,
        usedAt: true,
        invalidatedAt: true,
        account: { select: { email: true } },
      },
    });
  });

  it('returns null when the authentication token no longer exists', async () => {
    const reader = new PrismaAuthenticationEmailStateReader({
      authenticationToken: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(reader.find('missing-token-id')).resolves.toBeNull();
  });

  it('does not expose a registration continuation to the email worker', async () => {
    const reader = new PrismaAuthenticationEmailStateReader({
      authenticationToken: {
        findUnique: jest.fn().mockResolvedValue({
          accountId: '0ae2701e-f8ac-4c8a-8cf0-65182ee0fc1d',
          purpose: AuthenticationTokenPurpose.REGISTRATION_CONTINUATION,
          expiresAt: new Date('2026-09-06T16:00:00.000Z'),
          usedAt: null,
          invalidatedAt: null,
          account: { email: 'client@example.com' },
        }),
      },
    });

    await expect(reader.find('continuation-token-id')).resolves.toBeNull();
  });
});
