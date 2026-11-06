import {
  cancelClientInvitation,
  correctClientInvitationEmail,
  InvitationAccessDeniedError,
  inviteClient,
  readClientInvitation,
  resendClientInvitation,
} from './client-invitations';
import { sendClientVerification } from './client-verification-resend';
import {
  createTransaction,
  dependencies,
  invitation,
  now,
  resetIds,
  staff,
} from './client-invitations-test-support';

beforeEach(resetIds);

// FIX-040 (2026-11-05): the owner lets the Coordinator register new Clients
// like the Assistant, invitation and all; selling stays with the front desk.
const coordinator = staff('coordinator');
const clientId = { clientId: 'client-1' };

describe('the Coordinator and Client invitations', () => {
  it('invites a new Client and the audit names her Role', async () => {
    const transaction = createTransaction();

    await expect(
      inviteClient(
        { name: 'Ana Nueva', email: 'ana@example.com', phone: '70000000' },
        coordinator,
        dependencies(transaction),
      ),
    ).resolves.toEqual({
      status: 'invited',
      clientId: 'id-2',
      email: 'ana@example.com',
    });
    expect(transaction.scheduleAuthenticationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: 'id-1', purpose: 'activation' }),
    );
    expect(transaction.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actionCode: 'client_invitation.created',
        actorAccountId: 'assistant-account',
        actorRole: 'coordinator',
        targetAccountId: 'id-1',
        occurredAt: now,
      }),
    );
  });

  it('reads, corrects, resends, and cancels the invitation she sent', async () => {
    const transaction = createTransaction();
    const deps = dependencies(transaction);

    await expect(
      readClientInvitation(clientId, coordinator, deps),
    ).resolves.toMatchObject({ clientId: 'client-1' });
    await correctClientInvitationEmail(
      { ...clientId, email: 'ana.nueva@example.com' },
      coordinator,
      deps,
    );
    await resendClientInvitation(clientId, coordinator, deps);
    await cancelClientInvitation(clientId, coordinator, deps);

    expect(transaction.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actionCode: 'client_invitation.cancelled',
        actorRole: 'coordinator',
      }),
    );
  });

  it('sends a self-registered Client her verification link', async () => {
    const transaction = createTransaction({
      findInvitation: jest
        .fn()
        .mockResolvedValue({ ...invitation, pendingFlow: 'self_registration' }),
    });

    await expect(
      sendClientVerification(clientId, coordinator, dependencies(transaction)),
    ).resolves.toEqual({ clientId: 'client-1', email: 'ana@example.com' });
  });

  it('audits an invitation sent while an Administrator sees the app as the Coordinator to the Administrator', async () => {
    const transaction = createTransaction();

    await inviteClient(
      { name: 'Ana Nueva', email: 'ana@example.com', phone: null },
      {
        ...coordinator,
        impersonation: {
          id: 'impersonation-id',
          administratorAccountId: 'administrator-account',
          staffMemberName: 'Carolina Rivas',
          expiresAt: new Date('2026-10-22T15:30:00.000Z'),
        },
      },
      dependencies(transaction),
    );

    expect(transaction.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actorAccountId: 'administrator-account',
        actorRole: 'administrator',
        impersonationId: 'impersonation-id',
      }),
    );
  });

  it('denies an Administrator seeing the app as a Trainer', async () => {
    await expect(
      inviteClient(
        { name: 'Ana Nueva', email: 'ana@example.com', phone: null },
        {
          ...staff('trainer'),
          impersonation: {
            id: 'impersonation-id',
            administratorAccountId: 'administrator-account',
            staffMemberName: 'Emma Vargas',
            expiresAt: new Date('2026-10-22T15:30:00.000Z'),
          },
        },
        dependencies(createTransaction()),
      ),
    ).rejects.toBeInstanceOf(InvitationAccessDeniedError);
  });

  it('still denies the Nutritionist and the Trainer', async () => {
    for (const principal of [staff('nutritionist'), staff('trainer')]) {
      await expect(
        inviteClient(
          { name: 'Ana Nueva', email: 'ana@example.com', phone: null },
          principal,
          dependencies(createTransaction()),
        ),
      ).rejects.toBeInstanceOf(InvitationAccessDeniedError);
    }
  });
});
