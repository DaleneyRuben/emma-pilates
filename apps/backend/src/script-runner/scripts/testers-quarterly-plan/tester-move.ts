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

export type TesterMove =
  | { action: 'skip'; reason: 'paid_plan' }
  | { action: 'blocked'; reason: 'booked_class'; lastBookedOn: Date }
  | {
      action: 'move';
      subscriptionId: string;
      extrasToRemove: number;
      startsOn: Date;
    };

// Owner, 2026-11-27: every tester on the courtesy Plan moves to a cash
// «Trimestral 36 clases» from today and loses the courtesy extras. A Client
// who already pays is left alone, so a rerun changes nobody twice. The sale
// refuses to start a paid Plan on or before a class the courtesy one holds
// (FIX-019), so she waits unless the run starts her after that class.
export const decideTesterMove = (input: {
  today: Date;
  courtesy: CourtesyFacts;
  hasPaidPlan: boolean;
  afterBookedClass: boolean;
}): TesterMove => {
  if (input.hasPaidPlan) return { action: 'skip', reason: 'paid_plan' };
  const { lastBookedOn } = input.courtesy;
  if (lastBookedOn !== null && !input.afterBookedClass) {
    return { action: 'blocked', reason: 'booked_class', lastBookedOn };
  }
  return {
    action: 'move',
    subscriptionId: input.courtesy.subscriptionId,
    extrasToRemove: Math.max(
      0,
      Math.min(input.courtesy.courtesyExtras, input.courtesy.netExtras),
    ),
    startsOn:
      lastBookedOn === null ? input.today : addCivilDays(lastBookedOn, 1),
  };
};
