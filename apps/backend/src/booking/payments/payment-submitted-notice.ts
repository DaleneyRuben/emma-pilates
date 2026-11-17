import type { Prisma } from '../../generated/prisma/client';
import { StaffRole } from '../../generated/prisma/client';
import type { NotificationRecorder } from '../../notifications/prisma-notification-store';

export const paymentSubmittedKey = (paymentId: string): string =>
  `payment-submitted:${paymentId}`;

// «Comprobante por revisar» on every active Administrator's bell. The key
// dedupes a repeated receipt; the decision settles it (walkthrough n.º 13).
export const notifyPaymentSubmitted = async (
  transaction: Prisma.TransactionClient,
  recordNotification: NotificationRecorder,
  input: { paymentId: string; now: Date },
): Promise<void> => {
  const administrators = await transaction.account.findMany({
    where: {
      activatedAt: { not: null },
      disabledAt: null,
      staffMember: { role: StaffRole.ADMINISTRATOR },
    },
    select: { id: true },
  });
  for (const administrator of administrators) {
    await recordNotification(transaction, {
      accountId: administrator.id,
      category: 'subscription_payment',
      type: 'payment_submitted',
      businessEventKey: paymentSubmittedKey(input.paymentId),
      title: 'Comprobante por revisar',
      message: 'Tienes un comprobante de pago pendiente de revisión.',
      destination: { type: 'payment', id: input.paymentId },
      occurredAt: input.now,
    });
  }
};
