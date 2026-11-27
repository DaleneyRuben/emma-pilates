import { addCivilDays } from '../../../time/bolivia-time';

export type MoveParams = {
  /** The Branch the cash is recorded at; the studio's only one when null. */
  branch: string | null;
  /** Start after her last booked class instead of holding her. */
  afterBookedClass: boolean;
};

const knownParams = new Set(['branch', 'afterBookedClass']);

export const parseMoveParams = (
  params: Record<string, unknown>,
): MoveParams => {
  if (Object.keys(params).some((name) => !knownParams.has(name))) {
    throw new Error('params_unknown');
  }
  const { branch, afterBookedClass } = params;
  if (
    branch !== undefined &&
    (typeof branch !== 'string' || branch.trim() === '')
  ) {
    throw new Error('branch_invalid');
  }
  if (afterBookedClass !== undefined && typeof afterBookedClass !== 'boolean') {
    throw new Error('after_booked_class_invalid');
  }
  return {
    branch: branch === undefined ? null : branch.trim(),
    afterBookedClass: afterBookedClass ?? false,
  };
};

export type CourtesyFacts = {
  subscriptionId: string;
  planName: string;
  /** The live courtesy extra classes an Administrator granted on it. */
  courtesyExtras: number;
  /** The net of every live adjustment on it: what she can still spend. */
  netExtras: number;
  /** The civil date of her last class booked ahead on it, if any. */
  lastBookedOn: Date | null;
};

export type SaleBlock =
  | 'purchase_intent_open_exists'
  | 'payment_pending_exists'
  | 'future_subscription_exists';

export type TesterMove =
  | { action: 'ignore' }
  | { action: 'skip'; reason: 'paid_plan' }
  | { action: 'remove_extras'; subscriptionId: string; extrasToRemove: number }
  | { action: 'blocked'; reason: SaleBlock }
  | { action: 'blocked'; reason: 'booked_class'; lastBookedOn: Date }
  | { action: 'blocked'; reason: 'start_date_out_of_window'; startsOn: Date }
  | {
      action: 'move';
      subscriptionId: string;
      extrasToRemove: number;
      startsOn: Date;
      afterBookedClassOn: Date | null;
    };

// Owner, 2026-11-27: every tester on the courtesy Plan moves to a cash
// «Trimestral 36 clases» from today and loses the courtesy extras. The sale
// goes first, so one it refuses leaves her as she was; the extras of a run
// stopped after it are still removed on the next one, and nobody pays twice.
// The sale refuses what the decision holds up front, so a dry run reads
// like the real one: an open purchase, a pending Payment, a queued Plan, a
// start on or before a class the courtesy Plan holds (FIX-019), and a start
// past the Start Date limit.
export const decideTesterMove = (input: {
  today: Date;
  courtesy: CourtesyFacts;
  /** Whether the courtesy Plan is the one in force today. */
  inForce: boolean;
  hasPaidPlan: boolean;
  saleBlock: SaleBlock | null;
  afterBookedClass: boolean;
  startDateLimitDays: number;
}): TesterMove => {
  const extrasToRemove = Math.max(
    0,
    Math.min(input.courtesy.courtesyExtras, input.courtesy.netExtras),
  );
  if (input.hasPaidPlan && extrasToRemove > 0) {
    return {
      action: 'remove_extras',
      subscriptionId: input.courtesy.subscriptionId,
      extrasToRemove,
    };
  }
  if (!input.inForce) return { action: 'ignore' };
  if (input.hasPaidPlan) return { action: 'skip', reason: 'paid_plan' };
  if (input.saleBlock !== null) {
    return { action: 'blocked', reason: input.saleBlock };
  }
  const { lastBookedOn } = input.courtesy;
  if (lastBookedOn !== null && !input.afterBookedClass) {
    return { action: 'blocked', reason: 'booked_class', lastBookedOn };
  }
  const startsOn =
    lastBookedOn === null ? input.today : addCivilDays(lastBookedOn, 1);
  if (
    startsOn.getTime() >
    addCivilDays(input.today, input.startDateLimitDays).getTime()
  ) {
    return { action: 'blocked', reason: 'start_date_out_of_window', startsOn };
  }
  return {
    action: 'move',
    subscriptionId: input.courtesy.subscriptionId,
    extrasToRemove,
    startsOn,
    afterBookedClassOn: lastBookedOn,
  };
};
