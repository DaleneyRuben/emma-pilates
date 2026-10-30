import type { Prisma } from '../../generated/prisma/client';
import { decideGuestPassBooking } from '../payments/guest-pass';

type Transaction = Prisma.TransactionClient;

// A Guest Pass cannot move into the last open place. The paying Client
// keeps it. The check sits beside the capacity check, not inside the write.
export const refuseGuestPassLastPlace = async (
  transaction: Transaction,
  input: { bookingId: string; clientId: string; targetSessionId: string },
): Promise<void> => {
  const pass = await transaction.guestPass.findFirst({
    where: {
      bookingId: input.bookingId,
      friendClientId: input.clientId,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (pass === null) return;
  const target = await transaction.session.findUniqueOrThrow({
    where: { id: input.targetSessionId },
    select: { capacity: true },
  });
  const taken = await transaction.booking.count({
    where: { sessionId: input.targetSessionId, state: 'BOOKED' },
  });
  const decision = decideGuestPassBooking({
    placesLeft: target.capacity - taken,
    guestPassesAlreadyUsed: 0,
  });
  if (decision !== null) throw new Error(decision.code);
};
