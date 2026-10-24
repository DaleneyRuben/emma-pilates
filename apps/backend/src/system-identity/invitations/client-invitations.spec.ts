import {
  cancelClientInvitation,
  ClientInvitationNotFoundError,
  correctClientInvitationEmail,
  InvitationAccessDeniedError,
  InvitationEmailInUseError,
  InvitationEmailThrottledError,
  InvitationHasActivityError,
  inviteClient,
  readClientInvitation,
  resendClientInvitation,
} from './client-invitations';
import {
  assistant,
  client,
  createTransaction,
  day,
  dependencies,
  invitation,
  now,
  resetIds,
  staff,
} from './client-invitations-test-support';

beforeEach(resetIds);

describe('inviteClient', () => {
  const command = {
    name: '  Ana Nueva ',
    email: 'Ana@Example.com',
    phone: '+591 70000000',
  };

  it('creates the pending Client and Account, a 7-day activation link, and a 30-day pending invitation', async () => {
    const transaction = createTransaction();

    await expect(
      inviteClient(command, assistant, dependencies(transaction)),
    ).resolves.toEqual({
      status: 'invited',
      clientId: 'id-2',
      email: 'ana@example.com',
    });

    expect(transaction.createInvitation).toHaveBeenCalledWith({
      accountId: 'id-1',
      clientId: 'id-2',
      name: 'Ana Nueva',
      email: 'ana@example.com',
      phone: '+591 70000000',
      referralCode: 'REF-NEW',
      acquisitionChannel: 'unknown',
      referredByCode: null,
      pendingExpiresAt: new Date(now.getTime() + 30 * day),
      activationToken: {
        id: 'id-3',
        digest: Buffer.from('digest'),
        expiresAt: new Date(now.getTime() + 7 * day),
      },
    });
    expect(transaction.recordIssuedAuthenticationEmail).toHaveBeenCalledWith({
      email: 'ana@example.com',
      purpose: 'activation',
      occurredAt: now,
    });
    expect(transaction.scheduleAuthenticationEmail).toHaveBeenCalledWith({
      version: 1,
      accountId: 'id-1',
      authenticationTokenId: 'id-3',
      purpose: 'activation',
      encryptedLinkSecret: 'encrypted',
      encryptionKeyId: 'key-1',
    });
    expect(transaction.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actionCode: 'client_invitation.created',
        actorAccountId: 'assistant-account',
        actorRole: 'assistant',
        targetAccountId: 'id-1',
        occurredAt: now,
      }),
    );
  });

  it('audits an invitation sent while an Administrator sees the app as the Assistant to the Administrator (FUT-001)', async () => {
    const transaction = createTransaction();

    await inviteClient(
      command,
      {
        ...assistant,
        impersonation: {
          id: 'impersonation-id',
          administratorAccountId: 'administrator-account',
          staffMemberName: 'Camila Rojas',
          expiresAt: new Date('2026-10-22T15:30:00.000Z'),
        },
      },
      dependencies(transaction),
    );

    expect(transaction.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actionCode: 'client_invitation.created',
        actorAccountId: 'administrator-account',
        actorRole: 'administrator',
        impersonationId: 'impersonation-id',
      }),
    );
  });

  it('re-sends the activation link when the email belongs to a pending invitation', async () => {
    const transaction = createTransaction({
      findAccountByEmail: jest.fn().mockResolvedValue({
        id: 'account-1',
        clientId: 'client-1',
        domainIdentity: 'client',
        pendingFlow: 'staff_invitation',
      }),
    });

    await expect(
      inviteClient(command, assistant, dependencies(transaction)),
    ).resolves.toEqual({
      status: 'invitation_resent',
      clientId: 'client-1',
      email: 'ana@example.com',
    });
    expect(transaction.createInvitation).not.toHaveBeenCalled();
    expect(
      transaction.replaceStaffInvitationActivation.mock.calls[0]?.[0],
    ).toMatchObject({
      accountId: 'account-1',
      pendingExpiresAt: new Date(now.getTime() + 30 * day),
      activationToken: { expiresAt: new Date(now.getTime() + 7 * day) },
    });
    expect(transaction.scheduleAuthenticationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 'account-1',
        purpose: 'activation',
      }),
    );
    expect(transaction.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ actionCode: 'client_invitation.resent' }),
    );
  });

  it('only reports a pending self-registration, leaving the link to the Assistant', async () => {
    const transaction = createTransaction({
      findAccountByEmail: jest.fn().mockResolvedValue({
        id: 'account-2',
        clientId: 'client-2',
        domainIdentity: 'client',
        pendingFlow: 'self_registration',
      }),
    });

    await expect(
      inviteClient(command, assistant, dependencies(transaction)),
    ).resolves.toEqual({
      status: 'verification_pending',
      clientId: 'client-2',
      email: 'ana@example.com',
    });
    expect(
      transaction.replaceSelfRegistrationVerification,
    ).not.toHaveBeenCalled();
    expect(transaction.scheduleAuthenticationEmail).not.toHaveBeenCalled();
    expect(transaction.recordAudit).not.toHaveBeenCalled();
  });

  it('refuses emails of active Clients and of Staff Members', async () => {
    for (const existing of [
      { id: 'a', clientId: 'c', domainIdentity: 'client', pendingFlow: 'none' },
      { id: 'b', clientId: null, domainIdentity: 'staff', pendingFlow: 'none' },
    ]) {
      const transaction = createTransaction({
        findAccountByEmail: jest.fn().mockResolvedValue(existing),
      });
      await expect(
        inviteClient(command, assistant, dependencies(transaction)),
      ).rejects.toBeInstanceOf(InvitationEmailInUseError);
      expect(transaction.createInvitation).not.toHaveBeenCalled();
    }
  });

  it('refuses to send when the recipient throttle is exhausted', async () => {
    const transaction = createTransaction({
      authenticationEmailWaitSeconds: jest.fn().mockResolvedValue(40),
    });

    await expect(
      inviteClient(command, assistant, dependencies(transaction)),
    ).rejects.toEqual(
      expect.objectContaining({
        constructor: InvitationEmailThrottledError,
        retryAfterSeconds: 40,
      }),
    );
    expect(transaction.createInvitation).not.toHaveBeenCalled();
  });

  it('is open to Assistants and Administrators only', async () => {
    for (const principal of [client, staff('trainer')]) {
      await expect(
        inviteClient(command, principal, dependencies(createTransaction())),
      ).rejects.toBeInstanceOf(InvitationAccessDeniedError);
    }
    await expect(
      inviteClient(
        command,
        staff('administrator'),
        dependencies(createTransaction()),
      ),
    ).resolves.toMatchObject({ status: 'invited' });
  });
});

describe('pending invitation management', () => {
  it('reads the pending invitation', async () => {
    await expect(
      readClientInvitation(
        { clientId: 'client-1' },
        assistant,
        dependencies(createTransaction()),
      ),
    ).resolves.toEqual({
      clientId: 'client-1',
      name: 'Ana Nueva',
      email: 'ana@example.com',
      phone: '+591 70000000',
      pendingExpiresAt: invitation.pendingExpiresAt,
      activationExpiresAt: invitation.activationExpiresAt,
      cancellable: true,
    });
  });

  it('reports a missing or already activated invitation', async () => {
    const transaction = createTransaction({
      findInvitation: jest.fn().mockResolvedValue(null),
    });
    await expect(
      readClientInvitation(
        { clientId: 'client-1' },
        assistant,
        dependencies(transaction),
      ),
    ).rejects.toBeInstanceOf(ClientInvitationNotFoundError);
  });

  it('corrects the email, invalidates the old links, and sends a new one', async () => {
    const transaction = createTransaction();

    await expect(
      correctClientInvitationEmail(
        { clientId: 'client-1', email: 'Nueva@Example.com' },
        assistant,
        dependencies(transaction),
      ),
    ).resolves.toMatchObject({
      clientId: 'client-1',
      email: 'nueva@example.com',
    });
    expect(transaction.findAccountByEmail).toHaveBeenCalledWith(
      'nueva@example.com',
    );
    expect(transaction.changeInvitationEmail).toHaveBeenCalledWith({
      accountId: 'account-1',
      email: 'nueva@example.com',
    });
    expect(transaction.replaceStaffInvitationActivation).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 'account-1',
        pendingExpiresAt: new Date(now.getTime() + 30 * day),
      }),
    );
    expect(transaction.recordIssuedAuthenticationEmail).toHaveBeenCalledWith({
      email: 'nueva@example.com',
      purpose: 'activation',
      occurredAt: now,
    });
    expect(transaction.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actionCode: 'client_invitation.email_corrected',
        metadata: { previousEmail: 'ana@example.com' },
      }),
    );
  });

  it('refuses a corrected email that another Account already uses', async () => {
    const transaction = createTransaction({
      findAccountByEmail: jest.fn().mockResolvedValue({
        id: 'other',
        clientId: 'x',
        domainIdentity: 'client',
        pendingFlow: 'none',
      }),
    });
    await expect(
      correctClientInvitationEmail(
        { clientId: 'client-1', email: 'taken@example.com' },
        assistant,
        dependencies(transaction),
      ),
    ).rejects.toBeInstanceOf(InvitationEmailInUseError);
    expect(transaction.changeInvitationEmail).not.toHaveBeenCalled();
  });

  it('re-sends the activation link within the recipient throttle', async () => {
    const transaction = createTransaction();

    await expect(
      resendClientInvitation(
        { clientId: 'client-1' },
        assistant,
        dependencies(transaction),
      ),
    ).resolves.toMatchObject({ clientId: 'client-1' });
    expect(transaction.replaceStaffInvitationActivation).toHaveBeenCalled();
    expect(transaction.scheduleAuthenticationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 'account-1',
        purpose: 'activation',
      }),
    );
    expect(transaction.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ actionCode: 'client_invitation.resent' }),
    );

    const throttled = createTransaction({
      authenticationEmailWaitSeconds: jest.fn().mockResolvedValue(40),
    });
    await expect(
      resendClientInvitation(
        { clientId: 'client-1' },
        assistant,
        dependencies(throttled),
      ),
    ).rejects.toBeInstanceOf(InvitationEmailThrottledError);
    expect(throttled.replaceStaffInvitationActivation).not.toHaveBeenCalled();
  });

  it('cancels an invitation without activity and audits it', async () => {
    const transaction = createTransaction();

    await cancelClientInvitation(
      { clientId: 'client-1' },
      assistant,
      dependencies(transaction),
    );

    expect(transaction.removeInvitation).toHaveBeenCalledWith({
      accountId: 'account-1',
      clientId: 'client-1',
      now,
    });
    expect(transaction.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actionCode: 'client_invitation.cancelled',
        targetAccountId: 'account-1',
        metadata: { email: 'ana@example.com' },
      }),
    );
  });

  it('keeps an invitation whose Client already has Payments or Bookings', async () => {
    const transaction = createTransaction({
      findInvitation: jest
        .fn()
        .mockResolvedValue({ ...invitation, hasActivity: true }),
    });

    await expect(
      cancelClientInvitation(
        { clientId: 'client-1' },
        assistant,
        dependencies(transaction),
      ),
    ).rejects.toBeInstanceOf(InvitationHasActivityError);
    expect(transaction.removeInvitation).not.toHaveBeenCalled();
    await expect(
      readClientInvitation(
        { clientId: 'client-1' },
        assistant,
        dependencies(transaction),
      ),
    ).resolves.toMatchObject({ cancellable: false });
  });

  it('denies Clients and Trainers', async () => {
    for (const principal of [client, staff('trainer')]) {
      await expect(
        readClientInvitation(
          { clientId: 'client-1' },
          principal,
          dependencies(createTransaction()),
        ),
      ).rejects.toBeInstanceOf(InvitationAccessDeniedError);
      await expect(
        cancelClientInvitation(
          { clientId: 'client-1' },
          principal,
          dependencies(createTransaction()),
        ),
      ).rejects.toBeInstanceOf(InvitationAccessDeniedError);
    }
  });
});
