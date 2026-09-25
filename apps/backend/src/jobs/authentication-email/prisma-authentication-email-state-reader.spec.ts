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
      pendingEmail: null,
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
        emailChange: { select: { newEmail: true } },
      },
    });
  });

  it('loads the pending new address of an email change token (IDN-008)', async () => {
    const reader = new PrismaAuthenticationEmailStateReader({
      authenticationToken: {
        findUnique: jest.fn().mockResolvedValue({
          accountId: '0ae2701e-f8ac-4c8a-8cf0-65182ee0fc1d',
          purpose: AuthenticationTokenPurpose.EMAIL_CHANGE,
          expiresAt: new Date('2026-09-25T15:00:00.000Z'),
          usedAt: null,
          invalidatedAt: null,
          account: { email: 'client@example.com' },
          emailChange: { newEmail: 'client.nueva@example.com' },
        }),
      },
    });

    await expect(reader.find('email-change-token-id')).resolves.toEqual({
      accountId: '0ae2701e-f8ac-4c8a-8cf0-65182ee0fc1d',
      purpose: 'email_change',
      expiresAt: new Date('2026-09-25T15:00:00.000Z'),
      usedAt: null,
      invalidatedAt: null,
      email: 'client@example.com',
      pendingEmail: 'client.nueva@example.com',
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
