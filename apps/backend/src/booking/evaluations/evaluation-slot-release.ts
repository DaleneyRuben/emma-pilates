import type { Prisma } from '../../generated/prisma/client';
import { EvaluationSlotState } from '../../generated/prisma/client';
import { boliviaDate } from '../../time/bolivia-time';

// A cancelled Evaluation frees its slot; a slot whose Availability Block has
// already ended is withdrawn instead of published again.
export const releaseSlot = async (
  transaction: Prisma.TransactionClient,
  slotId: string,
  now: Date,
): Promise<void> => {
  const slot = await transaction.evaluationSlot.findUniqueOrThrow({
    where: { id: slotId },
    select: {
      startsAt: true,
      state: true,
      block: { select: { effectiveUntil: true } },
    },
  });
  if (
    slot.state === EvaluationSlotState.PUBLISHED &&
    slot.block.effectiveUntil !== null &&
    boliviaDate(slot.startsAt) >= slot.block.effectiveUntil
  ) {
    await transaction.evaluationSlot.update({
      where: { id: slotId },
      data: { state: EvaluationSlotState.WITHDRAWN, withdrawnAt: now },
    });
  }
};
