import {
  cancelClientInvitation,
  correctClientInvitationEmail,
  readClientInvitation,
  resendClientInvitation,
} from './client-invitations';
import {
  assistant,
  createTransaction,
  dependencies,
  invitation,
  resetIds,
} from './client-invitations-test-support';
import { sendClientVerification } from './client-verification-resend';

// MOB-027: a Client who registered herself is pending too, but she already
// has a password, so the staff invitation commands must not serve her.
const selfRegistration = { ...invitation, pendingFlow: 'self_registration' };

beforeEach(resetIds);

describe('Client invitation commands for a pending self-registration', () => {
  const transaction = () =>
    createTransaction({
      findInvitation: jest.fn().mockResolvedValue(selfRegistration),
    });

  it('does not read a self-registration as an invitation', async () => {
    await expect(
      readClientInvitation(
        { clientId: 'client-1' },
        assistant,
        dependencies(transaction()),
      ),
    ).rejects.toThrow('Client verification pending');
  });

  it.each([
    ['resend', resendClientInvitation],
    ['cancel', cancelClientInvitation],
  ] as const)('refuses to %s it and sends nothing', async (_name, command) => {
    const pending = transaction();

    await expect(
      command({ clientId: 'client-1' }, assistant, dependencies(pending)),
    ).rejects.toThrow('Client verification pending');
    expect(pending.replaceStaffInvitationActivation).not.toHaveBeenCalled();
    expect(pending.removeInvitation).not.toHaveBeenCalled();
    expect(pending.scheduleAuthenticationEmail).not.toHaveBeenCalled();
  });

  it('refuses to correct its email', async () => {
    const pending = transaction();

    await expect(
      correctClientInvitationEmail(
        { clientId: 'client-1', email: 'otra@example.com' },
        assistant,
        dependencies(pending),
      ),
    ).rejects.toThrow('Client verification pending');
    expect(pending.changeInvitationEmail).not.toHaveBeenCalled();
  });

  it('still sends her a verification link from the pending record alone', async () => {
    const pending = transaction();

    await expect(
      sendClientVerification(
        { clientId: 'client-1' },
        assistant,
        dependencies(pending),
      ),
    ).resolves.toEqual({ clientId: 'client-1', email: 'ana@example.com' });
    expect(pending.scheduleAuthenticationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ purpose: 'verification' }),
    );
  });
});
