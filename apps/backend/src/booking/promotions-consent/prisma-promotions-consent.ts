import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '../../generated/prisma/client';
import type { PromotionsConsentStore } from './promotions-consent';

const open = (clientId: string) => ({
  clientId,
  withdrawnAt: null,
  deletedAt: null,
});

// BE-023 (ADR-0098): one row per consent period; the partial unique index
// keeps a single open row, so a second «give» keeps the first one's time.
export const createPrismaPromotionsConsent = (
  prisma: PrismaClient,
): PromotionsConsentStore => {
  const findOpen = async (clientId: string) => {
    const consent = await prisma.clientPromotionsConsent.findFirst({
      where: open(clientId),
      select: { consentedAt: true },
    });
    return consent?.consentedAt ?? null;
  };

  return {
    findOpen,

    give: async ({ clientId, occurredAt }) => {
      await prisma.$executeRaw`
        INSERT INTO booking.client_promotions_consents (id, client_id, consented_at)
        VALUES (${randomUUID()}::uuid, ${clientId}::uuid, ${occurredAt})
        ON CONFLICT (client_id) WHERE withdrawn_at IS NULL AND deleted_at IS NULL
        DO NOTHING`;
      const consentedAt = await findOpen(clientId);
      if (consentedAt === null) throw new Error('Promotions Consent not kept');
      return consentedAt;
    },

    withdraw: async ({ clientId, occurredAt }) => {
      await prisma.clientPromotionsConsent.updateMany({
        where: open(clientId),
        data: { withdrawnAt: occurredAt },
      });
    },
  };
};
