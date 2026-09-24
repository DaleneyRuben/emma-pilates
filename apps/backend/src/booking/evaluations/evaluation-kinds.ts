import {
  EvaluationState,
  type PrismaClient,
} from '../../generated/prisma/client';

export type EvaluationKind = 'first' | 'follow_up';

/**
 * NUT-001 D12: an Evaluation is the Client's "first" unless she has an
 * earlier booked one; "follow-up" is derived, never stored. One read covers
 * every Client on a page.
 */
export async function readEvaluationKinds(
  prisma: PrismaClient,
  clientIds: readonly string[],
): Promise<(clientId: string, startsAt: Date) => EvaluationKind> {
  const history = await prisma.evaluation.findMany({
    where: {
      state: EvaluationState.BOOKED,
      clientId: { in: [...new Set(clientIds)] },
    },
    select: { clientId: true, slot: { select: { startsAt: true } } },
  });
  return (clientId, startsAt) =>
    history.some(
      (earlier) =>
        earlier.clientId === clientId && earlier.slot.startsAt < startsAt,
    )
      ? 'follow_up'
      : 'first';
}
