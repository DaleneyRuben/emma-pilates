import type { PrismaClient } from '../../generated/prisma/client';
import { toPrismaBytes } from '../../database/prisma-bytes';
import type { EmailSuppressionInput } from './resend-delivery-event';

const provider = 'resend';

// ADR-0031 and ADR-0094: a suppression is keyed by the address digest, never
// the address, and the (provider, event id) pair makes a redelivery a no-op.
export const createPrismaEmailSuppressions = (
  prisma: PrismaClient,
  digestEmail: (email: string) => Uint8Array,
) => ({
  record: async (inputs: EmailSuppressionInput[]): Promise<void> => {
    await prisma.emailSuppression.createMany({
      data: inputs.map((input) => ({
        emailDigest: toPrismaBytes(digestEmail(input.email)),
        reason: input.reason,
        provider,
        providerEventId: input.providerEventId,
        providerOccurredAt: input.providerOccurredAt,
      })),
      skipDuplicates: true,
    });
  },
  isSuppressed: async (email: string): Promise<boolean> =>
    (await prisma.emailSuppression.count({
      where: {
        emailDigest: toPrismaBytes(digestEmail(email.trim().toLowerCase())),
        resolvedAt: null,
      },
    })) > 0,
});
