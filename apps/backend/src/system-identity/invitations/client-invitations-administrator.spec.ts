import {
  readClientInvitation,
  resendClientInvitation,
} from './client-invitations';
import {
  createTransaction,
  dependencies,
  resetIds,
  staff,
} from './client-invitations-test-support';

beforeEach(resetIds);

// The admin web's Clientas drawer re-sends a pending Client's activation
// link with the Administrator's own session; the audit names her role.
describe('an Administrator following up a pending invitation', () => {
  const administrator = staff('administrator');

  it('reads the invitation and re-sends the activation link', async () => {
    const transaction = createTransaction();

    await expect(
      readClientInvitation(
        { clientId: 'client-1' },
        administrator,
        dependencies(transaction),
      ),
    ).resolves.toMatchObject({ clientId: 'client-1' });
    await expect(
      resendClientInvitation(
        { clientId: 'client-1' },
        administrator,
        dependencies(transaction),
      ),
    ).resolves.toMatchObject({ clientId: 'client-1' });
    expect(transaction.scheduleAuthenticationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 'account-1',
        purpose: 'activation',
      }),
    );
    expect(transaction.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actionCode: 'client_invitation.resent',
        actorRole: 'administrator',
      }),
    );
  });
});
