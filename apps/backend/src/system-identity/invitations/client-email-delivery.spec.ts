import { readClientEmailDelivery } from './client-email-delivery';
import {
  InvitationAccessDeniedError,
  ClientInvitationNotFoundError,
} from './client-invitations';
import {
  client,
  createTransaction,
  dependencies,
  invitation,
  staff,
} from './client-invitations-test-support';

// Walkthrough n.º 2 (RW-clientas-ficha-correo-rebotado): the Clientas file
// says the pending Client's email bounced instead of «Pendiente de activación».
describe('reading whether a pending Client email bounced', () => {
  it.each([
    ['staff_invitation', true],
    ['self_registration', false],
  ] as const)(
    'answers for a %s Account (bounced %s)',
    async (pendingFlow, bounced) => {
      const transaction = createTransaction({
        findInvitation: jest
          .fn()
          .mockResolvedValue({ ...invitation, pendingFlow }),
        isEmailBounced: jest.fn().mockResolvedValue(bounced),
      });

      await expect(
        readClientEmailDelivery(
          { clientId: 'client-1' },
          staff('administrator'),
          dependencies(transaction),
        ),
      ).resolves.toEqual({
        clientId: 'client-1',
        email: 'ana@example.com',
        bounced,
      });
      expect(transaction.isEmailBounced).toHaveBeenCalledWith(
        'ana@example.com',
      );
    },
  );

  it('has nothing to say once the Account is active', async () => {
    const transaction = createTransaction({
      findInvitation: jest.fn().mockResolvedValue(null),
    });

    await expect(
      readClientEmailDelivery(
        { clientId: 'client-1' },
        staff('coordinator'),
        dependencies(transaction),
      ),
    ).rejects.toBeInstanceOf(ClientInvitationNotFoundError);
  });

  it.each([staff('trainer'), client])(
    'is only for the staff who follow up invitations',
    async (principal) => {
      const transaction = createTransaction();

      await expect(
        readClientEmailDelivery(
          { clientId: 'client-1' },
          principal,
          dependencies(transaction),
        ),
      ).rejects.toBeInstanceOf(InvitationAccessDeniedError);
      expect(transaction.isEmailBounced).not.toHaveBeenCalled();
    },
  );
});
