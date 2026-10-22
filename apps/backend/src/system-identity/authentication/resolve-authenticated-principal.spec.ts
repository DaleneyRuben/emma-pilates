import {
  AuthenticationRequiredError,
  resolveAuthenticatedPrincipal,
} from './resolve-authenticated-principal';

describe('resolveAuthenticatedPrincipal', () => {
  const now = new Date('2026-08-31T12:00:00.000Z');
  const activeSession = {
    id: 'authentication-session-id',
    accountId: 'account-id',
    surface: 'mobile' as const,
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

  describe('admin-web Authentication Sessions', () => {
    const adminWebSession = {
      ...activeSession,
      surface: 'admin_web' as const,
      clientId: null,
      staffMember: {
        id: 'staff-member-id',
        role: 'ADMINISTRATOR',
        branchIds: [],
      },
      idleExpiresAt: new Date('2026-08-31T12:20:00.000Z'),
      absoluteExpiresAt: new Date('2026-08-31T20:00:00.000Z'),
    };

    it('extends meaningful browser activity by 30 minutes', async () => {
      const recordMeaningfulActivity = jest.fn().mockResolvedValue(undefined);

      await expect(
        resolveAuthenticatedPrincipal(
          'opaque-credential',
          true,
          {
            digestCredential: () => Buffer.from('credential-digest'),
            findSessionByCredentialDigest: jest
              .fn()
              .mockResolvedValue(adminWebSession),
            recordMeaningfulActivity,
            now: () => now,
          },
          'admin_web',
        ),
      ).resolves.toEqual({
        accountId: 'account-id',
        authenticationSessionId: 'authentication-session-id',
        identity: {
          kind: 'staff',
          staffMemberId: 'staff-member-id',
          role: 'administrator',
          branchIds: [],
        },
      });
      expect(recordMeaningfulActivity).toHaveBeenCalledWith({
        authenticationSessionId: 'authentication-session-id',
        activityAt: now,
        idleExpiresAt: new Date('2026-08-31T12:30:00.000Z'),
      });
    });

    it('never extends browser activity past the 12-hour absolute expiry', async () => {
      const recordMeaningfulActivity = jest.fn().mockResolvedValue(undefined);
      const absoluteExpiresAt = new Date('2026-08-31T12:10:00.000Z');

      await resolveAuthenticatedPrincipal(
        'opaque-credential',
        true,
        {
          digestCredential: () => Buffer.from('credential-digest'),
          findSessionByCredentialDigest: jest
            .fn()
            .mockResolvedValue({ ...adminWebSession, absoluteExpiresAt }),
          recordMeaningfulActivity,
          now: () => now,
        },
        'admin_web',
      );

      expect(recordMeaningfulActivity).toHaveBeenCalledWith(
        expect.objectContaining({ idleExpiresAt: absoluteExpiresAt }),
      );
    });

    it.each([
      ['a mobile session presented by the browser', activeSession, 'admin_web'],
      [
        'a browser session presented as a bearer credential',
        adminWebSession,
        'mobile',
      ],
    ] as const)('rejects %s', async (_label, session, surface) => {
      const recordMeaningfulActivity = jest.fn();

      await expect(
        resolveAuthenticatedPrincipal(
          'opaque-credential',
          true,
          {
            digestCredential: () => Buffer.from('credential-digest'),
            findSessionByCredentialDigest: jest.fn().mockResolvedValue(session),
            recordMeaningfulActivity,
            now: () => now,
          },
          surface,
        ),
      ).rejects.toBeInstanceOf(AuthenticationRequiredError);
      expect(recordMeaningfulActivity).not.toHaveBeenCalled();
    });
  });
});

describe('resolveAuthenticatedPrincipal while impersonating (FUT-001)', () => {
  const now = new Date('2026-10-22T15:00:00.000Z');
  const administratorSession = {
    id: 'authentication-session-id',
    accountId: 'administrator-account-id',
    surface: 'mobile' as const,
    createdAt: new Date('2026-10-22T14:00:00.000Z'),
    idleExpiresAt: new Date('2026-11-21T14:00:00.000Z'),
    absoluteExpiresAt: new Date('2027-01-20T14:00:00.000Z'),
    revokedAt: null,
    accountDisabledAt: null,
    clientId: null,
    staffMember: {
      id: 'administrator-staff-member-id',
      role: 'ADMINISTRATOR' as const,
      branchIds: [],
    },
  };
  const trainer = {
    id: 'trainer-staff-member-id',
    accountId: 'trainer-account-id',
    role: 'TRAINER' as const,
    branchIds: ['branch-one'],
    accountDisabledAt: null,
    deletedAt: null,
  };
  const activeImpersonation = {
    id: 'impersonation-id',
    expiresAt: new Date('2026-10-22T15:20:00.000Z'),
    staffMember: { ...trainer, name: 'Camila Rojas' },
  };
  const dependencies = (
    session: Record<string, unknown>,
    endImpersonation = jest.fn().mockResolvedValue(undefined),
  ) => ({
    digestCredential: () => Buffer.from('credential-digest'),
    findSessionByCredentialDigest: jest.fn().mockResolvedValue(session),
    recordMeaningfulActivity: jest.fn().mockResolvedValue(undefined),
    endImpersonation,
    now: () => now,
  });

  it('resolves the acting Staff Member with the Administrator beside it', async () => {
    const deps = dependencies({
      ...administratorSession,
      impersonation: activeImpersonation,
    });

    await expect(
      resolveAuthenticatedPrincipal('opaque-credential', true, deps),
    ).resolves.toEqual({
      accountId: 'trainer-account-id',
      authenticationSessionId: 'authentication-session-id',
      identity: {
        kind: 'staff',
        staffMemberId: 'trainer-staff-member-id',
        role: 'trainer',
        branchIds: ['branch-one'],
      },
      impersonation: {
        id: 'impersonation-id',
        administratorAccountId: 'administrator-account-id',
        staffMemberName: 'Camila Rojas',
        expiresAt: new Date('2026-10-22T15:20:00.000Z'),
      },
    });
    expect(deps.endImpersonation).not.toHaveBeenCalled();
    expect(deps.recordMeaningfulActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        authenticationSessionId: 'authentication-session-id',
      }),
    );
  });

  it('ends an expired Impersonation and resolves the Administrator again', async () => {
    const expiresAt = new Date('2026-10-22T15:00:00.000Z');
    const deps = dependencies({
      ...administratorSession,
      impersonation: { ...activeImpersonation, expiresAt },
    });

    await expect(
      resolveAuthenticatedPrincipal('opaque-credential', false, deps),
    ).resolves.toEqual({
      accountId: 'administrator-account-id',
      authenticationSessionId: 'authentication-session-id',
      identity: {
        kind: 'staff',
        staffMemberId: 'administrator-staff-member-id',
        role: 'administrator',
        branchIds: [],
      },
    });
    expect(deps.endImpersonation).toHaveBeenCalledWith({
      impersonationId: 'impersonation-id',
      endedAt: expiresAt,
      reason: 'expired',
    });
  });

  it.each([
    [
      'deactivated',
      { ...trainer, accountDisabledAt: new Date('2026-10-22T14:30:00.000Z') },
    ],
    [
      'removed',
      { ...trainer, deletedAt: new Date('2026-10-22T14:30:00.000Z') },
    ],
    [
      'promoted to Administrator',
      { ...trainer, role: 'ADMINISTRATOR' as const },
    ],
  ])(
    'revokes the Impersonation when the Staff Member was %s',
    async (_label, staffMember) => {
      const deps = dependencies({
        ...administratorSession,
        impersonation: { ...activeImpersonation, staffMember },
      });

      await expect(
        resolveAuthenticatedPrincipal('opaque-credential', false, deps),
      ).resolves.toMatchObject({
        accountId: 'administrator-account-id',
        identity: { role: 'administrator' },
      });
      expect(deps.endImpersonation).toHaveBeenCalledWith({
        impersonationId: 'impersonation-id',
        endedAt: now,
        reason: 'revoked',
      });
    },
  );
});
