export type PaymentRuleCode =
  | 'subscription_not_expired'
  | 'purchase_intent_open_exists'
  | 'purchase_intent_expired'
  | 'purchase_intent_not_open'
  | 'purchase_intent_not_found'
  | 'payment_pending_exists'
  | 'payment_not_pending'
  | 'payment_not_found'
  | 'payment_receipt_not_ready'
  | 'payment_receipt_invalid_owner'
  | 'payment_receipt_required'
  | 'credit_insufficient'
  | 'plan_not_purchasable'
  | 'branch_not_assigned'
  | 'referral_code_invalid'
  | 'referral_self_reference'
  | 'idempotency_key_reused'
  | 'payment_confirmation_conflict'
  | 'courtesy_end_date_invalid';

const statuses: Record<PaymentRuleCode, number> = {
  subscription_not_expired: 409,
  purchase_intent_open_exists: 409,
  purchase_intent_expired: 409,
  purchase_intent_not_open: 409,
  purchase_intent_not_found: 404,
  payment_pending_exists: 409,
  payment_not_pending: 409,
  payment_not_found: 404,
  payment_receipt_not_ready: 409,
  payment_receipt_invalid_owner: 403,
  payment_receipt_required: 409,
  credit_insufficient: 409,
  plan_not_purchasable: 409,
  branch_not_assigned: 403,
  referral_code_invalid: 400,
  referral_self_reference: 400,
  idempotency_key_reused: 409,
  payment_confirmation_conflict: 409,
  courtesy_end_date_invalid: 400,
};

export class PaymentRuleError extends Error {
  readonly status: number;

  constructor(
    readonly code: PaymentRuleCode,
    message: string,
  ) {
    super(message);
    this.name = 'PaymentRuleError';
    this.status = statuses[code];
  }
}
