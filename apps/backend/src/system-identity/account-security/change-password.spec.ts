import { jest } from '@jest/globals';
import {
  changePassword,
  CurrentPasswordIncorrectError,
  type PasswordChangeGateway,
} from './change-password';

describe('password change', () => {
  const changedAt = new Date('2026-08-31T18:00:00.000Z');
  const gateway: jest.Mocked<PasswordChangeGateway> = {
    findPasswordHash: jest.fn(),
    completePasswordChange: jest.fn(),
  };
  const dependencies = {
    gateway,
    verifyPassword: jest.fn(() => Promise.resolve(true)),
    hashPassword: jest.fn(() => Promise.resolve('new-password-hash')),
    now: () => changedAt,
    newAuditRecordId: () => 'audit-record-id',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps the current Authentication Session and revokes every other session', async () => {
    gateway.findPasswordHash.mockResolvedValue('current-password-hash');

    await changePassword(
      {
        accountId: 'account-id',
        authenticationSessionId: 'current-session-id',
        currentPassword: 'current password',
        newPassword: 'new secure password',
      },
      dependencies,
    );

    expect(gateway.completePasswordChange.mock.calls).toEqual([
      [
        {
          accountId: 'account-id',
          authenticationSessionId: 'current-session-id',
          passwordHash: 'new-password-hash',
          changedAt,
          auditRecordId: 'audit-record-id',
        },
      ],
    ]);
  });

  it('rejects an incorrect current password without changing state', async () => {
    gateway.findPasswordHash.mockResolvedValue('current-password-hash');
    dependencies.verifyPassword.mockResolvedValue(false);

    await expect(
      changePassword(
        {
          accountId: 'account-id',
          authenticationSessionId: 'current-session-id',
          currentPassword: 'wrong password',
          newPassword: 'new secure password',
        },
        dependencies,
      ),
    ).rejects.toBeInstanceOf(CurrentPasswordIncorrectError);

    expect(gateway.completePasswordChange.mock.calls).toHaveLength(0);
  });
});
