import type { Prisma } from '../../generated/prisma/client';
import {
  AuditActorKind,
  AuditOutcome,
  EvaluationSlotState,
  EvaluationState,
  PaymentState,
} from '../../generated/prisma/client';
import type { NotificationRecorder } from '../../notifications/prisma-notification-store';
import { auditActorOf } from '../../system-identity/authentication/audit-actor';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { BookingAccessDeniedError } from '../commands/create-booking';
import { EvaluationRuleError } from './evaluation-errors';
import {
  evaluationRescheduledNotice,
  evaluationRescheduleRequiredNotice,
} from './evaluation-notifications';
import { isEvaluationBookable } from './evaluation-rules';
import { releaseSlot } from './evaluation-slot-release';

type Transaction = Prisma.TransactionClient;

const paidDetail = 'Esta evaluación ya está pagada. Puedes reprogramarla.';

// A booked Evaluation occupies its slot unless the studio released that
// slot and left the sale to be rescheduled.
export const occupyingEvaluation = {
  state: EvaluationState.BOOKED,
  slotReleasedAt: null,
} as const;

export const paidNotCancellable = () =>
  new EvaluationRuleError('evaluation_paid_not_cancellable', paidDetail);

// A confirmed Paid Evaluation keeps its Payment. Cancelling it would drop a
// sale that the owner said is only moved (decision 2026-10-29).
export const isConfirmedPaidEvaluation = (evaluation: {
  payment: { state: PaymentState } | null;
}): boolean => evaluation.payment?.state === PaymentState.CONFIRMED;

export const movePaidEvaluation = async (
  transaction: Transaction,
  recordNotification: NotificationRecorder,
  input: {
    evaluationId: string;
    slotId: string;
    principal: AuthenticatedPrincipal;
    now: Date;
    lockSlot: (transaction: Transaction, slotId: string) => Promise<boolean>;
  },
): Promise<void> => {
  if (input.principal.identity.kind !== 'client') {
    throw new BookingAccessDeniedError();
  }
  const clientId = input.principal.identity.clientId;
  const found = await transaction.evaluation.findUnique({
    where: { id: input.evaluationId },
    select: {
      id: true,
      clientId: true,
      state: true,
      evaluationSlotId: true,
      payment: { select: { id: true, state: true } },
      slotReleasedAt: true,
      slot: {
        select: {
          startsAt: true,
          nutritionist: { select: { account: { select: { id: true } } } },
        },
      },
      client: { select: { name: true } },
    },
  });
  if (found === null) {
    throw new EvaluationRuleError(
      'evaluation_not_found',
      'Evaluation not found',
    );
  }
  if (found.clientId !== clientId) throw new BookingAccessDeniedError();
  if (found.state !== EvaluationState.BOOKED) {
    throw new EvaluationRuleError(
      'evaluation_not_booked',
      'The Evaluation is not booked',
    );
  }
  if (!isConfirmedPaidEvaluation(found)) {
    throw new EvaluationRuleError(
      'evaluation_payment_required',
      'Only a confirmed Paid Evaluation can be rescheduled',
    );
  }
  if (
    found.slotReleasedAt === null &&
    !isEvaluationBookable(found.slot.startsAt, input.now)
  ) {
    throw new EvaluationRuleError(
      'evaluation_reschedule_closed',
      'La evaluación ya no se puede reprogramar.',
    );
  }
  if (!(await input.lockSlot(transaction, input.slotId))) {
    throw new EvaluationRuleError(
      'evaluation_slot_not_found',
      'Evaluation slot not found',
    );
  }
  const next = await transaction.evaluationSlot.findUniqueOrThrow({
    where: { id: input.slotId },
    select: {
      id: true,
      startsAt: true,
      localMonth: true,
      state: true,
      branchId: true,
      _count: {
        select: { evaluations: { where: occupyingEvaluation } },
      },
    },
  });
  if (
    next.id === found.evaluationSlotId ||
    next.state !== EvaluationSlotState.PUBLISHED ||
    next._count.evaluations > 0 ||
    !isEvaluationBookable(next.startsAt, input.now)
  ) {
    throw new EvaluationRuleError(
      'evaluation_slot_unavailable',
      'The Evaluation slot is no longer available',
    );
  }

  // The booked Evaluation is what occupies a slot. Pointing it at the new
  // slot frees the old one in the same write.
  await transaction.evaluation.update({
    where: { id: found.id },
    data: {
      evaluationSlotId: next.id,
      eligibilityMonth: next.localMonth,
      slotReleasedAt: null,
    },
  });
  const actor = auditActorOf(input.principal);
  await transaction.auditRecord.create({
    data: {
      actionCode: 'evaluation.rescheduled',
      outcome: AuditOutcome.SUCCEEDED,
      actorKind: AuditActorKind.ACCOUNT,
      actorAccountId: actor.accountId,
      actorRole: actor.role,
      impersonationId: actor.impersonationId,
      targetType: 'evaluation',
      targetId: found.id,
      branchId: next.branchId,
      correlationId: found.id,
      occurredAt: input.now,
      metadata: {
        previousSlotId: found.evaluationSlotId,
        slotId: next.id,
        previousStartsAt: found.slot.startsAt.toISOString(),
        startsAt: next.startsAt.toISOString(),
      },
    },
  });
  if (found.slot.nutritionist.account !== null) {
    await recordNotification(
      transaction,
      evaluationRescheduledNotice({
        accountId: found.slot.nutritionist.account.id,
        evaluationId: found.id,
        clientName: found.client.name,
        previousStartsAt: found.slot.startsAt,
        startsAt: next.startsAt,
        occurredAt: input.now,
      }),
    );
  }
};

// The studio frees the slot. The confirmed Payment stays, and the client
// picks another slot. An included Evaluation still cancels as before.
export const releaseConfirmedPaidEvaluation = async (
  transaction: Transaction,
  recordNotification: NotificationRecorder,
  input: {
    evaluationId: string;
    now: Date;
    principal: AuthenticatedPrincipal;
  },
): Promise<boolean> => {
  const evaluation = await transaction.evaluation.findUnique({
    where: { id: input.evaluationId },
    select: {
      id: true,
      evaluationSlotId: true,
      payment: { select: { state: true } },
      slot: { select: { startsAt: true } },
      client: { select: { account: { select: { id: true } } } },
    },
  });
  if (evaluation === null || !isConfirmedPaidEvaluation(evaluation)) {
    return false;
  }
  await transaction.evaluation.update({
    where: { id: evaluation.id },
    data: { slotReleasedAt: input.now },
  });
  await releaseSlot(transaction, evaluation.evaluationSlotId, input.now);
  const actor = auditActorOf(input.principal);
  await transaction.auditRecord.create({
    data: {
      actionCode: 'evaluation.slot_released',
      outcome: AuditOutcome.SUCCEEDED,
      actorKind: AuditActorKind.ACCOUNT,
      actorAccountId: actor.accountId,
      actorRole: actor.role,
      impersonationId: actor.impersonationId,
      targetType: 'evaluation',
      targetId: evaluation.id,
      correlationId: evaluation.id,
      occurredAt: input.now,
      metadata: {
        slotId: evaluation.evaluationSlotId,
        startsAt: evaluation.slot.startsAt.toISOString(),
      },
    },
  });
  if (evaluation.client.account !== null) {
    await recordNotification(
      transaction,
      evaluationRescheduleRequiredNotice({
        accountId: evaluation.client.account.id,
        evaluationId: evaluation.id,
        startsAt: evaluation.slot.startsAt,
        occurredAt: input.now,
      }),
    );
  }
  return true;
};
