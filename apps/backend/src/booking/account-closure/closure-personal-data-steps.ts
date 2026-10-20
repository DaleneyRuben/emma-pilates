import type { Prisma } from '../../generated/prisma/client';
import { detachImageAsset } from '../../uploads/image-asset-attachments';

export const closedClientName = 'Cliente eliminado';

// ADR-0097: the closed Client keeps its rows for the studio's history but
// loses its name, phone, and profile photo; a Client who ticked the
// promotions box is first copied into an unlinked Promotion Contact.
export const createPersonalDataSteps = (
  transaction: Prisma.TransactionClient,
) => ({
  keepPromotionContact: async (input: {
    clientId: string;
    accountId: string;
    consentedAt: Date;
  }) => {
    const client = await transaction.client.findUniqueOrThrow({
      where: { id: input.clientId },
      select: { name: true, phone: true, account: { select: { email: true } } },
    });
    // lockClient already refused a Client without a live Account.
    if (client.account === null) throw new Error('Client has no Account');
    await transaction.promotionContact.create({
      data: {
        name: client.name,
        email: client.account.email,
        phone: client.phone,
        consentedAt: input.consentedAt,
      },
    });
  },
  endPromotionsConsent: () => Promise.resolve<Date | null>(null),
  removeClient: async (input: { clientId: string; occurredAt: Date }) => {
    const { profileImageAssetId } = await transaction.client.findUniqueOrThrow({
      where: { id: input.clientId },
      select: { profileImageAssetId: true },
    });
    await transaction.client.update({
      where: { id: input.clientId },
      data: {
        deletedAt: input.occurredAt,
        name: closedClientName,
        phone: null,
        profileImageAssetId: null,
      },
    });
    if (profileImageAssetId !== null) {
      await detachImageAsset(transaction, {
        imageAssetId: profileImageAssetId,
        now: input.occurredAt,
      });
    }
  },
});
