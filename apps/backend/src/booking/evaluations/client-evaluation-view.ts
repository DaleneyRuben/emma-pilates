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
    isEvaluationBookable(row.slot.startsAt, now),
});
