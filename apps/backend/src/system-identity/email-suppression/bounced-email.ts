import type { PrismaClient } from '../../generated/prisma/client';
import { EmailSuppressionReason } from '../../generated/prisma/enums';
import { toPrismaBytes } from '../../database/prisma-bytes';

/**
 * Walkthrough n.º 2: Resend reported a hard bounce for this address (the
 * webhook keeps it as a suppression, ADR-0094) and nobody has resolved it,
 * so a link sent there never arrives. A complaint is not a bounce.
 */
export const isEmailBounced = async (
  prisma: Pick<PrismaClient, 'emailSuppression'>,
  digestEmail: (email: string) => Uint8Array,
  email: string,
): Promise<boolean> =>
  (await prisma.emailSuppression.count({
    where: {
      emailDigest: toPrismaBytes(digestEmail(email.trim().toLowerCase())),
      reason: EmailSuppressionReason.HARD_BOUNCE,
      resolvedAt: null,
    },
  })) > 0;
