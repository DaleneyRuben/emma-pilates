import {
  AuthenticationRequiredError,
  resolveAuthenticatedPrincipal,
} from './resolve-authenticated-principal';

describe('resolveAuthenticatedPrincipal', () => {
  const now = new Date('2026-08-31T12:00:00.000Z');
  const activeSession = {
    id: 'authentication-session-id',
    accountId: 'account-id',
    createdAt: new Date('2026-08-30T12:00:00.000Z'),
    idleExpiresAt: new Date('2026-09-30T12:00:00.000Z'),
    absoluteExpiresAt: new Date('2026-11-28T12:00:00.000Z'),
    revokedAt: null,
    accountDisabledAt: null,
    clientId: 'client-id',
    staffMember: null,
  };

  it('resolves the current Client identity from an opaque credential', async () => {
    const findSessionByCredentialDigest = jest
      .fn()
      .mockResolvedValue(activeSession);

    await expect(
      resolveAuthenticatedPrincipal('opaque-credential', false, {
        digestCredential: () => Buffer.from('credential-digest'),
        findSessionByCredentialDigest,
        recordMeaningfulActivity: jest.fn(),
        now: () => now,
      }),
    ).resolves.toEqual({
      accountId: 'account-id',
      authenticationSessionId: 'authentication-session-id',
      identity: { kind: 'client', clientId: 'client-id' },
    });
    expect(findSessionByCredentialDigest).toHaveBeenCalledWith(
      Buffer.from('credential-digest'),
    );
  });

  it('resolves current Staff Role and Branch assignments instead of session claims', async () => {
    await expect(
      resolveAuthenticatedPrincipal('opaque-credential', false, {
        digestCredential: () => Buffer.from('credential-digest'),
        findSessionByCredentialDigest: jest.fn().mockResolvedValue({
          ...activeSession,
          clientId: null,
          staffMember: {
            id: 'staff-member-id',
            role: 'ASSISTANT',
            branchIds: ['branch-one', 'branch-two'],
          },
        }),
        recordMeaningfulActivity: jest.fn(),
        now: () => now,
      }),
    ).resolves.toEqual({
      accountId: 'account-id',
      authenticationSessionId: 'authentication-session-id',
      identity: {
        kind: 'staff',
        staffMemberId: 'staff-member-id',
        role: 'assistant',
        branchIds: ['branch-one', 'branch-two'],
      },
    });
  });

  it.each([
    ['unknown', null],
    [
      'revoked',
      { ...activeSession, revokedAt: new Date('2026-08-31T11:00:00.000Z') },
    ],
    [
      'idle-expired',
      { ...activeSession, idleExpiresAt: new Date('2026-08-31T12:00:00.000Z') },
    ],
    [
      'absolute-expired',
      {
        ...activeSession,
        absoluteExpiresAt: new Date('2026-08-31T11:59:59.000Z'),
      },
    ],
    [
      'disabled Account',
      {
        ...activeSession,
        accountDisabledAt: new Date('2026-08-31T11:00:00.000Z'),
      },
    ],
  ])('rejects an %s Authentication Session', async (_label, session) => {
    await expect(
      resolveAuthenticatedPrincipal('opaque-credential', false, {
        digestCredential: () => Buffer.from('credential-digest'),
        findSessionByCredentialDigest: jest.fn().mockResolvedValue(session),
        recordMeaningfulActivity: jest.fn(),
        now: () => now,
      }),
    ).rejects.toBeInstanceOf(AuthenticationRequiredError);
  });

  it('extends meaningful mobile activity without exceeding absolute expiry', async () => {
    const recordMeaningfulActivity = jest.fn().mockResolvedValue(undefined);
    const absoluteExpiresAt = new Date('2026-09-10T12:00:00.000Z');

    await resolveAuthenticatedPrincipal('opaque-credential', true, {
      digestCredential: () => Buffer.from('credential-digest'),
      findSessionByCredentialDigest: jest.fn().mockResolvedValue({
        ...activeSession,
        absoluteExpiresAt,
      }),
      recordMeaningfulActivity,
      now: () => now,
    });

    expect(recordMeaningfulActivity).toHaveBeenCalledWith({
      authenticationSessionId: 'authentication-session-id',
      activityAt: now,
      idleExpiresAt: absoluteExpiresAt,
    });
  });
});
