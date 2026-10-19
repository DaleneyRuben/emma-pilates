import type { PrismaClient } from '../../generated/prisma/client';
import type { EmailSuppressionInput } from './resend-delivery-event';

// Red checkpoint stub: the adapter is implemented in the next commit.
export const createPrismaEmailSuppressions = (
  prisma: PrismaClient,
  digestEmail: (email: string) => Uint8Array,
) => ({
  record: (inputs: EmailSuppressionInput[]): Promise<void> =>
    Promise.resolve(void [prisma, digestEmail, inputs]),
  isSuppressed: (email: string): Promise<boolean> =>
    Promise.resolve(email === ''),
});
