import { boliviaDate } from '../../time/bolivia-time';

const dayMilliseconds = 24 * 60 * 60 * 1_000;

export const bookingDuringFreezeMessage = (endsOn: Date): string =>
  `Booking is during a Freeze until ${endsOn.toISOString().slice(0, 10)}`;

const daysBetween = (from: Date, until: Date): number =>
  (until.getTime() - from.getTime()) / dayMilliseconds + 1;

export type FreezeRequestFacts = {
  subscriptionId: string;
  clientId: string;
  durationDays: number;
  endsOn: Date;
  today: Date;
  startsOn: Date;
  endsOnRequest: Date;
  existingRequest: 'requested' | 'approved' | 'refused' | null;
};

const refused = { allowed: false, code: 'freeze_not_allowed' } as const;

// booking ADR-0010: once per Subscription, on a Plan of 90 days or more, for
// at most 15 days, and never starting before today.
export const decideFreezeRequest = (
  facts: FreezeRequestFacts,
):
  | { allowed: true; frozenDays: number; extendedEndsOn: Date }
  | { allowed: false; code: 'freeze_not_allowed' } => {
  const frozenDays = daysBetween(facts.startsOn, facts.endsOnRequest);
  if (
    facts.existingRequest !== null ||
    facts.durationDays < 90 ||
    frozenDays < 1 ||
    frozenDays > 15 ||
    facts.startsOn.getTime() < boliviaDate(facts.today).getTime()
  ) {
    return refused;
  }
  return {
    allowed: true,
    frozenDays,
    extendedEndsOn: new Date(
      facts.endsOn.getTime() + frozenDays * dayMilliseconds,
    ),
  };
};
