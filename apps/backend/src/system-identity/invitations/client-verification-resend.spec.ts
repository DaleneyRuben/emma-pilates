import {
  ClientInvitationNotFoundError,
  InvitationAccessDeniedError,
  InvitationEmailThrottledError,
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
} from './client-invitations-test-support';
import { sendClientVerification } from './client-verification-resend';

const selfRegistered = {
  id: 'account-1',
  clientId: 'client-1',
  domainIdentity: 'client',
  pendingFlow: 'self_registration',
} as const;

beforeEach(resetIds);

describe('sendClientVerification (S05 «Enviar enlace de verificación»)', () => {
  it('sends a fresh 24-hour verification link to a self-registered Client without touching her data', async () => {
    const transaction = createTransaction({
      findAccountByEmail: jest.fn().mockResolvedValue(selfRegistered),
    });

    await expect(
      sendClientVerification(
        { clientId: 'client-1' },
        assistant,
        dependencies(transaction),
      ),
    ).resolves.toEqual({ clientId: 'client-1', email: 'ana@example.com' });

    expect(transaction.findAccountByEmail).toHaveBeenCalledWith(
      invitation.email,
    );
    expect(
      transaction.replaceSelfRegistrationVerification.mock.calls[0]?.[0],
    ).toMatchObject({
      accountId: 'account-1',
      pendingExpiresAt: new Date(now.getTime() + 7 * day),
      verificationToken: { expiresAt: new Date(now.getTime() + day) },
    });
    expect(transaction.scheduleAuthenticationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: 'account-1', purpose: 'verification' }),
    );
    expect(transaction.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actionCode: 'client_invitation.verification_sent',
        actorRole: 'assistant',
        targetAccountId: 'account-1',
      }),
    );
  });

  it('reports the recipient wait instead of sending', async () => {
    const transaction = createTransaction({
      findAccountByEmail: jest.fn().mockResolvedValue(selfRegistered),
      authenticationEmailWaitSeconds: jest.fn().mockResolvedValue(40),
    });

    await expect(
      sendClientVerification(
        { clientId: 'client-1' },
        assistant,
        dependencies(transaction),
      ),
    ).rejects.toEqual(
      expect.objectContaining({
        constructor: InvitationEmailThrottledError,
        retryAfterSeconds: 40,
      }),
    );
    expect(transaction.scheduleAuthenticationEmail).not.toHaveBeenCalled();
  });

  it('only serves a pending self-registration', async () => {
    const transaction = createTransaction({
      findAccountByEmail: jest.fn().mockResolvedValue({
        ...selfRegistered,
        pendingFlow: 'staff_invitation',
      }),
    });

    await expect(
      sendClientVerification(
        { clientId: 'client-1' },
        assistant,
        dependencies(transaction),
      ),
    ).rejects.toBeInstanceOf(ClientInvitationNotFoundError);
    expect(transaction.scheduleAuthenticationEmail).not.toHaveBeenCalled();
  });

  it('is open to Assistants and Administrators only', async () => {
    await expect(
      sendClientVerification(
        { clientId: 'client-1' },
        client,
        dependencies(createTransaction()),
      ),
    ).rejects.toBeInstanceOf(InvitationAccessDeniedError);
  });
});
