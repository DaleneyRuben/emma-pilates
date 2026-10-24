export type EvaluationRuleCode =
  | 'evaluation_slot_not_found'
  | 'evaluation_slot_unavailable'
  | 'evaluation_booking_closed'
  | 'evaluation_month_used'
  | 'evaluation_included_used'
  | 'evaluation_payment_required'
  | 'no_eligible_subscription'
  | 'evaluation_not_found'
  | 'evaluation_not_booked'
  | 'evaluation_cancellation_window_closed'
  | 'evaluation_started'
  | 'availability_block_not_found'
  | 'availability_block_overlap'
  | 'availability_block_invalid_range'
  | 'availability_block_effective_date_past'
  | 'availability_block_ended'
  | 'branch_not_assigned'
  | 'idempotency_key_reused';

const statuses: Record<EvaluationRuleCode, number> = {
  evaluation_slot_not_found: 404,
  evaluation_slot_unavailable: 409,
  evaluation_booking_closed: 409,
  evaluation_month_used: 409,
  evaluation_included_used: 409,
  evaluation_payment_required: 409,
  no_eligible_subscription: 409,
  evaluation_not_found: 404,
  evaluation_not_booked: 409,
  evaluation_cancellation_window_closed: 409,
  evaluation_started: 409,
  availability_block_not_found: 404,
  availability_block_overlap: 409,
  availability_block_invalid_range: 400,
  availability_block_effective_date_past: 400,
  availability_block_ended: 409,
  branch_not_assigned: 403,
  idempotency_key_reused: 409,
};

export class EvaluationRuleError extends Error {
  readonly status: number;

  constructor(
    readonly code: EvaluationRuleCode,
    message: string,
  ) {
    super(message);
    this.name = 'EvaluationRuleError';
    this.status = statuses[code];
  }
}
