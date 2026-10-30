import { addCivilDays, boliviaDate } from '../../time/bolivia-time';

export const bookingDuringFreezeMessage = (endsOn: Date): string =>
  `Booking is during a Freeze until ${endsOn.toISOString().slice(0, 10)}`;

const dayMilliseconds = 24 * 60 * 60 * 1_000;

const daysBetween = (from: Date, until: Date): number =>
  (until.getTime() - from.getTime()) / dayMilliseconds + 1;

export type FreezeRefusalCode =
  'freeze_not_allowed' | 'freeze_start_in_past' | 'freeze_outside_term';

export type FreezeRequestFacts = {
  subscriptionId: string;
  clientId: string;
  durationDays: number;
  /** Current term end, before this Freeze extends it. */
  endsOn: Date;
  /** Bolivia civil date of the request, or of the approval. */
  today: Date;
  startsOn: Date;
  endsOnRequest: Date;
  existingRequest: 'requested' | 'approved' | 'refused' | null;
  /** Current term start. Absent only for a caller that has not loaded it. */
  subscriptionStartsOn?: Date;
  /**
   * Start Date of a queued renewal. The Freeze must end before that day, so
   * extending the current term cannot overlap it.
   */
  renewalStartsOn?: Date | null;
};

const refused = (code: FreezeRefusalCode) =>
  ({ allowed: false, code }) as const;

// Once counts a requested or an approved Freeze. A refusal does not.
export const countedFreezeRequest = (
  freezes: readonly { state: string }[],
): 'requested' | 'approved' | null => {
  const counted = freezes.find((freeze) => {
    const state = freeze.state.toLowerCase();
    return state === 'requested' || state === 'approved';
  });
  if (counted === undefined) {
    return null;
  }
  return counted.state.toLowerCase() === 'approved' ? 'approved' : 'requested';
};

// booking ADR-0010: once per Subscription, on a Plan of 90 days or more, for
// at most 15 days, never starting before today, and inside the current term.
// A queued renewal caps the window so the extension cannot reach its start.
// Once counts a requested or an approved Freeze. A refusal does not.
export const decideFreezeRequest = (
  facts: FreezeRequestFacts,
):
  | { allowed: true; frozenDays: number; extendedEndsOn: Date }
  | { allowed: false; code: FreezeRefusalCode } => {
  const today = boliviaDate(facts.today);
  const frozenDays = daysBetween(facts.startsOn, facts.endsOnRequest);
  if (
    !Number.isInteger(frozenDays) ||
    facts.existingRequest === 'requested' ||
    facts.existingRequest === 'approved' ||
    facts.durationDays < 90 ||
    frozenDays < 1 ||
    frozenDays > 15
  ) {
    return refused('freeze_not_allowed');
  }
  // A start of today still keeps that morning's class and still extends
  // the plan, so approval treats today the same as a start already past.
  if (boliviaDate(facts.startsOn).getTime() <= today.getTime()) {
    return refused('freeze_start_in_past');
  }
  const extensionReachesRenewal =
    facts.renewalStartsOn !== undefined &&
    facts.renewalStartsOn !== null &&
    addCivilDays(facts.endsOn, frozenDays).getTime() >=
      facts.renewalStartsOn.getTime();
  if (
    (facts.subscriptionStartsOn !== undefined &&
      facts.startsOn.getTime() < facts.subscriptionStartsOn.getTime()) ||
    facts.endsOnRequest.getTime() > facts.endsOn.getTime() ||
    extensionReachesRenewal
  ) {
    return refused('freeze_outside_term');
  }
  return {
    allowed: true,
    frozenDays,
    extendedEndsOn: addCivilDays(facts.endsOn, frozenDays),
  };
};
