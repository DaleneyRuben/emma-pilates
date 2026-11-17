import type { Prisma } from '../../generated/prisma/client';
import { EvaluationState } from '../../generated/prisma/client';
import type {
  ClientEvaluationRow,
  ClientEvaluationView,
} from './prisma-evaluation-commands';
import {
  cancellableUntil,
  evaluationSlotMinutes,
  isEvaluationBookable,
} from './evaluation-rules';
import { isReschedulablePaidEvaluation } from './paid-evaluation-reschedule';
import { receiptUploadable } from './receipt-uploadable';

export const toClientEvaluationView = (
  row: ClientEvaluationRow,
  now: Date,
): ClientEvaluationView => ({
  id: row.id,
  slotId: row.evaluationSlotId,
  included: row.paymentId === null,
  priceCentavos:
    row.payment?.state === 'CONFIRMED' || row.payment?.state === 'PENDING'
      ? row.payment.amountDueCentavos
      : 0,
  paymentId: row.paymentId,
  paymentState:
    row.payment === null
      ? null
      : (row.payment.state.toLowerCase() as ClientEvaluationView['paymentState']),
  receiptAttached: row.payment?.receiptImageAssetId != null,
  receiptUploadable: receiptUploadable(row.payment),
  state:
    row.state === EvaluationState.BOOKED
      ? 'booked'
      : row.state === EvaluationState.NO_SHOW
        ? 'no_show'
        : 'cancelled',
  startsAt: row.slot.startsAt,
  endsAt: row.slot.endsAt,
  durationMinutes: evaluationSlotMinutes,
  branchId: row.slot.branchId,
  branchName: row.slot.branch.name,
  nutritionistName: row.slot.nutritionist.name,
  cancellableUntil: cancellableUntil(row.slot.startsAt),
  cancellable:
    row.state === EvaluationState.BOOKED &&
    row.payment?.state !== 'CONFIRMED' &&
    isEvaluationBookable(row.slot.startsAt, now),
  reschedulable:
    row.state === EvaluationState.BOOKED &&
    isReschedulablePaidEvaluation(row) &&
    row.slotReleasedAt === null &&
    isEvaluationBookable(row.slot.startsAt, now),
  slotReleased: row.slotReleasedAt !== null,
});

// A released paid Evaluation waits among the upcoming ones until the Client
// picks another slot, whatever its old time (walkthrough finding 68).
export const clientEvaluationScope = (
  scope: 'upcoming' | 'past',
  now: Date,
): Prisma.EvaluationWhereInput =>
  scope === 'upcoming'
    ? {
        OR: [
          { slot: { endsAt: { gt: now } } },
          { slotReleasedAt: { not: null } },
        ],
      }
    : { slot: { endsAt: { lte: now } }, slotReleasedAt: null };
